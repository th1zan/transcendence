from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView #, CustomTokenObtainPairView
from .views import (
    
    DeleteAccountView,
    PongMatchDetail,
    PongMatchList,
    PongScoreView,
    UserRegisterView,
	LoginView,
	UserView,
	LogoutView,
)

urlpatterns = [
    path("results/", PongMatchList.as_view(), name="pongmatch-list"),
    path("results/<int:pk>/", PongMatchDetail.as_view(), name="pongmatch-detail"),
    path("scores/", PongScoreView.as_view(), name="pong-score"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("auth/register/", UserRegisterView.as_view(), name="user_register"),
    path("auth/delete-account/", DeleteAccountView.as_view(), name="delete_account"),
    #path("auth/login/", CustomTokenObtainPairView.as_view(),name="token_obtain_pair"),
    path("auth/login/", LoginView.as_view(), name="login"),
    path("auth/user/", UserView.as_view(), name="user"),
    path("auth/logout/", LogoutView.as_view(), name="logout"),
	
]
