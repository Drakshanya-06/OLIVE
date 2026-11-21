from django.urls import path

from . import views as v

urlpatterns = [
    path("", v.ReferenceListView.as_view()),
    path("categories/", v.CategoriesView.as_view()),
    path("brands/", v.BrandsView.as_view()),
    path("estimate/", v.EstimateView.as_view()),
    path("analyze/", v.AnalyzeView.as_view()),
    path("my/", v.MyDevicesView.as_view()),
    path("my/<str:pk>/", v.MyDeviceDetailView.as_view()),
    path("recognize-image/", v.RecognizeImageView.as_view()),
    path("recommend/", v.RecommendView.as_view()),
]
