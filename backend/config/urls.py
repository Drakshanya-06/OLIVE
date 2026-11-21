from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView


def health(request):
    return JsonResponse({"status": "ok", "service": "olive-api"})


urlpatterns = [
    path("api/health/", health),
    path("api/auth/", include("apps.authentication.urls")),
    path("api/users/", include("apps.users.urls")),
    path("api/facilities/", include("apps.facilities.urls")),
    path("api/devices/", include("apps.devices.urls")),
    path("api/recycling/", include("apps.recycling.urls")),
    path("api/rewards/", include("apps.rewards.urls")),
    path("api/learning/", include("apps.learning.urls")),
    path("api/", include("apps.dashboard.urls")),
    path("api/admin/", include("apps.administration.urls")),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="docs"),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
