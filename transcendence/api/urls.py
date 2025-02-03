from django.urls import path
from django.conf import settings
from django.conf.urls.static import static

from . import views
from .views import (
	AddFriendView,
    AnonymizeAccountView,
    CustomTokenObtainPairView,
    CustomTokenRefreshView,
    CustomUser,
    DeleteAccountView,
    ListFriendsView,
    LogoutView,
    PongMatchDetail,
    PongMatchList,
    PongScoreView,
    RankingView,
	RemoveFriendView,
    TournamentCreationView,
    TournamentMatchesView,
    TournamentSearchView,
    UploadAvatarView,
    UserDetailView,
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
    path("auth/anonymize-account/",AnonymizeAccountView.as_view(),name="anonymize-account"),
    path("auth/delete-account/", DeleteAccountView.as_view(), name="delete_account"),
	path("auth/user/", UserDetailView.as_view(), name="user-detail"),
	path("auth/upload-avatar/", UploadAvatarView.as_view(), name="upload_avatar"),
	path('friends/add/', AddFriendView.as_view(), name='add_friend'),
    path("friends/list/", ListFriendsView.as_view(), name="list_friends"),
	path("friends/remove/", RemoveFriendView.as_view(), name="remove_friend"),
    path("tournament/new/", TournamentCreationView.as_view(), name="new_tournament"),
    path(
        "tournament/matches/",
        TournamentMatchesView.as_view(),
        name="tournament_matches",
    ),
    path("user/exists/", views.check_user_exists, name="check_user_exists"),
    path("ranking/", RankingView.as_view(), name="ranking"),
    path("tournaments/", TournamentSearchView.as_view(), name="search_tournaments"),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# This ensures that media folder (which can also be mounted as a volume in production setups) is properly linked to Django project.