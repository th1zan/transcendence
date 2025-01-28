from django.urls import path

from .views import (
    CustomTokenObtainPairView,
    CustomTokenRefreshView,
    DeleteAccountView,
    LogoutView,
    PongMatchDetail,
    PongMatchList,
    PongScoreView,
    RankingView,
    TournamentCreationView,
    TournamentMatchesView,
    TournamentSearchView,
    UserRegisterView,
)

urlpatterns = [
    path("results/", PongMatchList.as_view(), name="pongmatch-list"),
    path("results/<int:pk>/", PongMatchDetail.as_view(), name="pongmatch-detail"),
    path("scores/", PongScoreView.as_view(), name="pong-score"),
    path("scores/<int:pk>/", PongScoreView.as_view(), name="pong-score-detail"),
    path("auth/login/", CustomTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("auth/refresh/", CustomTokenRefreshView.as_view(), name="token_refresh"),
    path("auth/register/", UserRegisterView.as_view(), name="user_register"),
    path("auth/logout/", LogoutView.as_view(), name="logout"),
    path("auth/delete-account/", DeleteAccountView.as_view(), name="delete_account"),
    path("tournament/new/", TournamentCreationView.as_view(), name="new_tournament"),
    path(
        "tournament/matches/",
        TournamentMatchesView.as_view(),
        name="tournament_matches",
    ),
    path("ranking/", RankingView.as_view(), name="ranking"),
    path("tournaments/", TournamentSearchView.as_view(), name="search_tournaments"),
]
