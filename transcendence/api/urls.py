from django.urls import path

from .views import (
	CustomTokenObtainPairView,
	CustomTokenRefreshView,
	DeleteAccountView,
	LogoutView,
    PongMatchDetail,
    PongMatchList,
    PongScoreView,
    UserRegisterView,)

urlpatterns = [
    path("results/", PongMatchList.as_view(), name="pongmatch-list"),
    path("results/<int:pk>/", PongMatchDetail.as_view(), name="pongmatch-detail"),
    path("scores/", PongScoreView.as_view(), name="pong-score"),
    path("auth/login/", CustomTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("auth/refresh/", CustomTokenRefreshView.as_view(), name="token_refresh"),
    path("auth/register/", UserRegisterView.as_view(), name="user_register"),
	path('auth/logout/', LogoutView.as_view(), name='logout'),
	path("auth/delete-account/", DeleteAccountView.as_view(), name="delete_account"),
]
