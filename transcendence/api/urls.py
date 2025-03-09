from django.conf import settings
from django.conf.urls.static import static
from django.urls import path

from .views.auth_views import (AuthenticateMatchPlayerView,
                               AuthenticateTournamentPlayerView,
                               CustomTokenObtainPairView,
                               CustomTokenRefreshView, CustomTokenValidateView,
                               LogoutView, Session2FAView, Toggle2FAView,
                               Verify2FALoginView)
from .views.friend_views import (FriendsOnlineStatusView, ListFriendsView,
                                 RemoveFriendView, RespondToFriendRequestView,
                                 SendFriendRequestView, ViewFriendRequestsView)
from .views.match_views import (PongMatchDetail, PongMatchList, PongScoreView,
                                RankingView, check_player_exists,
                                check_user_exists)
from .views.tournament_views import (ConfirmTournamentParticipationView,
                                     PendingTournamentAuthenticationsView,
                                     RemovePlayerMatchesView, StartMatchView,
                                     TournamentCreationView,
                                     TournamentDetailView,
                                     TournamentFinalizationView,
                                     TournamentMatchesView,
                                     TournamentPlayersView,
                                     TournamentSearchView, UserTournamentsView)
from .views.user_views import (AnonymizeAccountView, ChangePasswordView,
                               DeleteAccountView, DeleteAvatarView,
                               UploadAvatarView, UserDetailView,
                               UserRegisterView)

urlpatterns = [
    # Authentification API
    path("auth/login/", CustomTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("auth/validate/", CustomTokenValidateView.as_view(), name="token_validate"),
    path("auth/refresh/", CustomTokenRefreshView.as_view(), name="token_refresh"),
    path("auth/toggle-2fa/", Toggle2FAView.as_view(), name="toggle-2fa"),
    path(
        "auth/verify-2fa-login/", Verify2FALoginView.as_view(), name="verify-2fa-login"
    ),
    path("auth/session-2fa/", Session2FAView.as_view(), name="session-2fa"),
    path("auth/register/", UserRegisterView.as_view(), name="user_register"),
    path("auth/logout/", LogoutView.as_view(), name="logout"),
    path(
        "auth/anonymize-account/",
        AnonymizeAccountView.as_view(),
        name="anonymize-account",
    ),
    path("auth/delete-account/", DeleteAccountView.as_view(), name="delete_account"),
    path(
        "auth/match-player/",
        AuthenticateMatchPlayerView.as_view(),
        name="authenticate_match_player",
    ),
    path(
        "auth/tournament-player/<int:tournament_id>/",
        AuthenticateTournamentPlayerView.as_view(),
        name="authenticate_tournament_player",
    ),
    path(
        "auth/confirm-participation/<int:tournament_id>/",
        ConfirmTournamentParticipationView.as_view(),
        name="confirm-tournament-participation",
    ),
    # Utilisateur API
    path("auth/user/", UserDetailView.as_view(), name="user-detail"),
    path("auth/upload-avatar/", UploadAvatarView.as_view(), name="upload_avatar"),
    path("auth/delete-avatar/", DeleteAvatarView.as_view(), name="delete-avatar"),
    path("auth/change-password/", ChangePasswordView.as_view(), name="change-password"),
    path("user/exists/", check_user_exists, name="check_user_exists"),
    # Amis API
    path("friends/list/", ListFriendsView.as_view(), name="list_friends"),
    path("friends/remove/", RemoveFriendView.as_view(), name="remove_friend"),
    path("friends/status/", FriendsOnlineStatusView.as_view(), name="friends_status"),
    path(
        "friends/send-request/",
        SendFriendRequestView.as_view(),
        name="send_friend_request",
    ),
    path(
        "friends/requests/",
        ViewFriendRequestsView.as_view(),
        name="view_friend_requests",
    ),
    path(
        "friends/respond/",
        RespondToFriendRequestView.as_view(),
        name="respond_friend_request",
    ),
    # Match API
    path("results/", PongMatchList.as_view(), name="pongmatch-list"),
    path("results/<int:pk>/", PongMatchDetail.as_view(), name="pongmatch-detail"),
    path("scores/", PongScoreView.as_view(), name="pong-score"),
    path("scores/<int:pk>/", PongScoreView.as_view(), name="pong-score-detail"),
    path("ranking/", RankingView.as_view(), name="ranking"),
    path("player/exists/", check_player_exists, name="check_player_exists"),
    # Tournoi API
    path("tournament/new/", TournamentCreationView.as_view(), name="new_tournament"),
    path(
        "tournament/finalize/<int:tournament_id>/",
        TournamentFinalizationView.as_view(),
        name="finalize_tournament",
    ),
    path(
        "tournament/players/<int:tournament_id>/",
        TournamentPlayersView.as_view(),
        name="tournament_players",
    ),
    path(
        "tournament/matches/",
        TournamentMatchesView.as_view(),
        name="tournament_matches",
    ),
    path("tournaments/", TournamentSearchView.as_view(), name="search_tournaments"),
    path(
        "user/pending-tournament-authentications/",
        PendingTournamentAuthenticationsView.as_view(),
        name="pending-tournament-authentications",
    ),
    path(
        "user/tournaments/",
        UserTournamentsView.as_view(),
        name="user-tournaments",
    ),
    path(
        "tournament/<int:tournament_id>/remove-player-matches/<str:player_name>/",
        RemovePlayerMatchesView.as_view(),
        name="remove_player_matches",
    ),
    path(
        "tournament/start-match/<int:match_id>/",
        StartMatchView.as_view(),
        name="start-match",
    ),
    path(
        "tournament/<int:tournament_id>/",
        TournamentDetailView.as_view(),
        name="tournament_detail",
    ),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# This ensures that media folder (which can also be mounted as a volume in production setups) is properly linked to Django project.
