from django.urls import path

from . import views as v

urlpatterns = [
    path("requests/", v.RequestListCreateView.as_view()),
    path("requests/<str:pk>/", v.RequestDetailView.as_view()),
    path("requests/<str:pk>/qr/", v.RequestQrView.as_view()),
    path("requests/<str:pk>/cancel/", v.RequestCancelView.as_view()),
]
