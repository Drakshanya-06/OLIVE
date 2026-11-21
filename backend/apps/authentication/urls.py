from django.urls import path

from . import views as v

urlpatterns = [
    path("register/", v.RegisterView.as_view()),
    path("verify-otp/", v.VerifyOtpView.as_view()),
    path("resend-otp/", v.ResendOtpView.as_view()),
    path("login/", v.LoginView.as_view()),
    path("admin/login/", v.AdminLoginView.as_view()),
    path("refresh/", v.RefreshView.as_view()),
    path("logout/", v.LogoutView.as_view()),
    path("me/", v.MeView.as_view()),
    path("forgot-password/", v.ForgotPasswordView.as_view()),
    path("reset-password/", v.ResetPasswordView.as_view()),
]
