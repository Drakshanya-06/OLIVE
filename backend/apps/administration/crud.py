"""Reusable admin CRUD factory so every managed collection behaves the same and is audited."""
import re

from pymongo.errors import DuplicateKeyError
from rest_framework.response import Response
from rest_framework.views import APIView

from database.repository import serialize, to_oid
from utils.errors import ApiError
from utils.permissions import IsAdmin
from utils.platform import audit
from utils.validators import validate


def make_crud(repo, schema, label, search=("name",), filters=(), sort=None, pre=None, post_delete=None):
    class ListCreate(APIView):
        permission_classes = [IsAdmin]

        def get(self, request):
            flt = {}
            for f in filters:
                v = request.query_params.get(f)
                if v not in (None, ""):
                    flt[f] = {"true": True, "false": False}.get(v, v)
            q = request.query_params.get("q")
            if q:
                rx = {"$regex": re.escape(q.strip()), "$options": "i"}
                flt["$or"] = [{f: rx} for f in search]
            return Response(repo.paginate(request, flt, sort=sort or [("created_at", -1)], default_size=20))

        def post(self, request):
            d = validate(request.data, schema)
            if pre:
                d = pre(d, None, request)
            try:
                doc = repo.create(d)
            except DuplicateKeyError:
                raise ApiError(f"This {label} already exists.", 409, "duplicate")
            audit(request, f"{label}.create", label, doc["_id"])
            return Response(serialize(doc), status=201)

    class Detail(APIView):
        permission_classes = [IsAdmin]

        def get(self, request, pk):
            return Response(serialize(repo.get(pk, label.capitalize())))

        def put(self, request, pk):
            current = repo.get(pk, label.capitalize())
            d = validate(request.data, schema, partial=True)
            if pre:
                d = pre(d, current, request)
            try:
                doc = repo.update(pk, d)
            except DuplicateKeyError:
                raise ApiError(f"Another {label} already uses these details.", 409, "duplicate")
            audit(request, f"{label}.update", label, pk, {"fields": list(d.keys())})
            return Response(serialize(doc))

        patch = put

        def delete(self, request, pk):
            repo.get(pk, label.capitalize())
            if post_delete:
                post_delete(pk)
            repo.delete(pk)
            audit(request, f"{label}.delete", label, pk)
            return Response(status=204)

    return ListCreate, Detail
