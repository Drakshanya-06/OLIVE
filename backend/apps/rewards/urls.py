from django.urls import path

from . import views as v

urlpatterns = [
    path("balance/", v.BalanceView.as_view()),
    path("history/", v.HistoryView.as_view()),
    path("coupons/", v.CouponCatalogView.as_view()),
    path("redeem/", v.RedeemView.as_view()),
    path("my-coupons/", v.MyCouponsView.as_view()),
    path("achievements/", v.AchievementsView.as_view()),
    path("leaderboard/", v.LeaderboardView.as_view()),
]
