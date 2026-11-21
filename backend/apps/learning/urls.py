from django.urls import path

from . import views as v

urlpatterns = [
    path("articles/", v.ArticleListView.as_view()),
    path("articles/<slug:slug>/", v.ArticleDetailView.as_view()),
    path("articles/<slug:slug>/read/", v.ArticleReadView.as_view()),
    path("quizzes/", v.QuizListView.as_view()),
    path("quizzes/<str:pk>/", v.QuizDetailView.as_view()),
    path("quizzes/<str:pk>/submit/", v.QuizSubmitView.as_view()),
    path("attempts/", v.MyAttemptsView.as_view()),
    path("progress/", v.ProgressView.as_view()),
    path("challenges/", v.ChallengeListView.as_view()),
    path("challenges/<str:pk>/join/", v.ChallengeJoinView.as_view()),
]
