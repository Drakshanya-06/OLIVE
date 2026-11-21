from django.urls import path

from . import views as v

urlpatterns = [
    path("dashboard/summary/", v.SummaryView.as_view()),
    path("dashboard/activity/", v.ActivityView.as_view()),
    path("notifications/", v.NotificationsView.as_view()),
    path("public/stats/", v.PublicStatsView.as_view()),
]
