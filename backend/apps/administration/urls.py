from django.urls import path

from apps.recycling import views as rv
from . import views as v

urlpatterns = [
    path("dashboard/", v.DashboardView.as_view()),
    path("reports/", v.ReportsView.as_view()),
    path("analytics/", v.AnalyticsView.as_view()),
    path("users/", v.UserListView.as_view()),
    path("users/<str:pk>/", v.UserDetailView.as_view()),
    path("facilities/", v.FacilityList.as_view()),
    path("facilities/<str:pk>/", v.FacilityDetail.as_view()),
    path("device-reference/", v.MaterialList.as_view()),
    path("device-reference/<str:pk>/", v.MaterialDetail.as_view()),
    path("recycling/", rv.AdminRequestListView.as_view()),
    path("recycling/scan/", rv.AdminScanView.as_view()),
    path("recycling/<str:pk>/", rv.AdminRequestDetailView.as_view()),
    path("recycling/<str:pk>/status/", rv.AdminStatusView.as_view()),
    path("recycling/<str:pk>/verify/", rv.AdminVerifyView.as_view()),
    path("coupons/", v.CouponList.as_view()),
    path("coupons/<str:pk>/", v.CouponDetail.as_view()),
    path("ledger/", v.LedgerView.as_view()),
    path("points/adjust/", v.AdjustPointsView.as_view()),
    path("articles/", v.ArticleList.as_view()),
    path("articles/<str:pk>/", v.ArticleDetail.as_view()),
    path("quizzes/", v.QuizList.as_view()),
    path("quizzes/<str:pk>/", v.QuizDetail.as_view()),
    path("challenges/", v.ChallengeList.as_view()),
    path("challenges/<str:pk>/", v.ChallengeDetail.as_view()),
    path("settings/", v.SettingsView.as_view()),
    path("notifications/broadcast/", v.BroadcastView.as_view()),
    path("logs/", v.LogsView.as_view()),
]
