import re

from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from pymongo.errors import DuplicateKeyError

from database.repositories import (article_reads, challenge_participants, challenges, educational_articles, quiz_attempts, quizzes)
from database.repository import serialize, to_oid, utcnow
from utils.errors import ApiError
from utils.platform import notify
from .services import bump_challenges, evaluate_achievements


class Public(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]


def public_article(d, full=False):
    o = serialize(d)
    if not full:
        o.pop("content", None)
    return o


class ArticleListView(Public):
    def get(self, request):
        p = request.query_params
        flt = {"published": {"$ne": False}}
        if p.get("category"):
            flt["category"] = p["category"]
        if p.get("q"):
            rx = {"$regex": re.escape(p["q"]), "$options": "i"}
            flt["$or"] = [{"title": rx}, {"summary": rx}]
        return Response(educational_articles.paginate(request, flt, sort=[("created_at", -1)], default_size=9,
                                                      transform=public_article))


class ArticleDetailView(Public):
    def get(self, request, slug):
        doc = educational_articles.find_one({"slug": slug, "published": {"$ne": False}})
        if not doc:
            raise ApiError("Article not found.", 404, "not_found")
        return Response(public_article(doc, full=True))


class ArticleReadView(APIView):
    """POST /api/learning/articles/{slug}/read/ - marks progress (once per article)."""

    def post(self, request, slug):
        doc = educational_articles.find_one({"slug": slug})
        if not doc:
            raise ApiError("Article not found.", 404, "not_found")
        try:
            article_reads.create({"user_id": request.user.oid, "article_id": doc["_id"]})
            bump_challenges(request.user.oid, "read_articles", 1)
        except DuplicateKeyError:
            pass
        return Response({"message": "Marked as read."})


def quiz_public(q, with_answers=False):
    o = serialize(q)
    qs = []
    for i, item in enumerate(q.get("questions", [])):
        entry = {"index": i, "question": item["question"], "options": item["options"]}
        if with_answers:
            entry["correct_index"] = item["correct_index"]
            entry["explanation"] = item.get("explanation", "")
        qs.append(entry)
    o["questions"] = qs
    o["question_count"] = len(qs)
    return o


class QuizListView(Public):
    def get(self, request):
        docs = quizzes.find({"published": {"$ne": False}}, sort=[("created_at", -1)])
        out = []
        for q in docs:
            o = quiz_public(q)
            o.pop("questions")
            out.append(o)
        return Response({"results": out})


class QuizDetailView(Public):
    def get(self, request, pk):
        q = quizzes.get(pk, "Quiz")
        return Response(quiz_public(q))


class QuizSubmitView(APIView):
    """POST /api/learning/quizzes/{id}/submit/ {answers:[index,...]} - scored on the server only."""

    def post(self, request, pk):
        q = quizzes.get(pk, "Quiz")
        answers = request.data.get("answers")
        if not isinstance(answers, list) or len(answers) != len(q["questions"]):
            raise ApiError("Answer every question before submitting.", 400, "validation_error")
        correct, review = 0, []
        for item, a in zip(q["questions"], answers):
            ok = isinstance(a, int) and not isinstance(a, bool) and a == item["correct_index"]
            correct += ok
            review.append({"correct": ok, "correct_index": item["correct_index"], "explanation": item.get("explanation", "")})
        total = len(q["questions"])
        pct = round(100 * correct / total)
        passed = pct >= q.get("pass_mark", 70)
        quiz_attempts.create({"user_id": request.user.oid, "quiz_id": q["_id"], "score": correct, "total": total, "percent": pct,
                              "passed": passed, "answers": answers})
        if passed:
            notify(request.user.oid, "quiz", "Quiz passed", f"You scored {pct}% on “{q['title']}”.", "/learning")
            bump_challenges(request.user.oid, "quiz_passed", 1)
        else:
            evaluate_achievements(request.user.oid)
        return Response({"score": correct, "total": total, "percent": pct, "passed": passed, "review": review})


class MyAttemptsView(APIView):
    def get(self, request):
        docs = quiz_attempts.find({"user_id": request.user.oid}, sort=[("created_at", -1)], limit=50)
        titles = {q["_id"]: q["title"] for q in quizzes.find({"_id": {"$in": [d["quiz_id"] for d in docs]}})}
        out = []
        for d in docs:
            o = serialize(d)
            o.pop("answers", None)
            o["quiz_title"] = titles.get(d["quiz_id"], "Quiz")
            out.append(o)
        return Response({"results": out})


class ProgressView(APIView):
    def get(self, request):
        uid = request.user.oid
        total_articles = educational_articles.count({"published": {"$ne": False}})
        total_quizzes = quizzes.count({"published": {"$ne": False}})
        passed = len({a["quiz_id"] for a in quiz_attempts.find({"user_id": uid, "passed": True})})
        return Response({"articles_read": article_reads.count({"user_id": uid}), "articles_total": total_articles,
                         "quizzes_passed": passed, "quizzes_total": total_quizzes})


class ChallengeListView(APIView):
    def get(self, request):
        now = utcnow()
        docs = challenges.find({"active": {"$ne": False}, "end_date": {"$gte": now}}, sort=[("end_date", 1)])
        mine = {p["challenge_id"]: p for p in challenge_participants.find({"user_id": request.user.oid})}
        out = []
        for c in docs:
            o = serialize(c)
            p = mine.get(c["_id"])
            o["joined"] = bool(p)
            o["progress"] = p["progress"] if p else 0
            o["completed"] = bool(p and p.get("completed"))
            o["participants"] = challenge_participants.count({"challenge_id": c["_id"]})
            out.append(o)
        return Response({"results": out})


class ChallengeJoinView(APIView):
    def post(self, request, pk):
        c = challenges.get(pk, "Challenge")
        now = utcnow()
        if c.get("active") is False or c["end_date"] < now or c["start_date"] > now:
            raise ApiError("This challenge is not open.", 400, "challenge_closed")
        try:
            challenge_participants.create({"challenge_id": c["_id"], "user_id": request.user.oid, "progress": 0, "completed": False,
                                           "joined_at": now})
        except DuplicateKeyError:
            raise ApiError("You already joined this challenge.", 409, "already_joined")
        return Response({"message": "You joined the challenge."}, status=201)
