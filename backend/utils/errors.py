import logging

from rest_framework.exceptions import APIException

logger = logging.getLogger(__name__)


class ApiError(APIException):
    """Raise anywhere to return a clean JSON error: {"error": {code, message, details}}."""

    def __init__(self, message, status=400, code="error", details=None):
        super().__init__(message)
        self.status_code = status
        self.message = message
        self.code = code
        self.details = details


def api_exception_handler(exc, context):
    # imported lazily: DRF imports this module while its own views module is still loading
    from rest_framework.response import Response
    from rest_framework.views import exception_handler as drf_exception_handler

    response = drf_exception_handler(exc, context)
    if response is None:
        logger.exception("Unhandled error", exc_info=exc)
        return Response(
            {"error": {"code": "server_error", "message": "Something went wrong on our side. Please try again."}},
            status=500,
        )
    if isinstance(exc, ApiError):
        body = {"code": exc.code, "message": exc.message, "details": exc.details}
    else:
        data = response.data
        message = data.get("detail") if isinstance(data, dict) else None
        message = str(message) if message else "Invalid request."
        if response.status_code == 429:
            message = "Too many attempts. Please wait a moment and try again."
        body = {"code": getattr(exc, "default_code", "error"), "message": message, "details": None}
    response.data = {"error": body}
    return response
