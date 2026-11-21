from django.urls import path

from . import views as v

urlpatterns = [
    path("", v.FacilityListView.as_view()),
    path("nearby/", v.NearbyView.as_view()),
    path("geocode/", v.GeocodeView.as_view()),
    path("<str:pk>/", v.FacilityDetailView.as_view()),
    path("<str:pk>/reviews/", v.FacilityReviewsView.as_view()),
]
