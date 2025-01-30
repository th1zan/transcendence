import logging
import uuid  # Pour générer un pseudonyme aléatoire
from itertools import combinations

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.hashers import make_password

# from django.contrib.auth.models import User
from django.db.models import Count, Q
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.parsers import JSONParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.token_blacklist.models import (
    BlacklistedToken,
    OutstandingToken,
)
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .models import CustomUser, Player, PongMatch, PongSet, Tournament, TournamentPlayer
from .serializers import (
    PongMatchSerializer,
    PongSetSerializer,
    TournamentPlayerSerializer,
    TournamentSerializer,
    UserRegisterSerializer,
)

CustomUser = get_user_model()  # Get the correct User model dynamically


logger = logging.getLogger(__name__)


class PongMatchList(generics.ListCreateAPIView):
    queryset = PongMatch.objects.all()
    serializer_class = PongMatchSerializer
    filter_backends = [DjangoFilterBackend]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        user_param = self.request.query_params.get("user1")

        if user_param:
            # Récupérer l'ID du joueur à partir du nom d'utilisateur
            player_id = (
                Player.objects.filter(player=user_param)
                .values_list("id", flat=True)
                .first()
            )

            if player_id:
                # Filtrer les matchs où le joueur est soit player1 soit player2
                queryset = queryset.filter(Q(player1=player_id) | Q(player2=player_id))

        return queryset


class PongMatchDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = PongMatch.objects.all()
    serializer_class = PongMatchSerializer
    permission_classes = [IsAuthenticated]


class PongScoreView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        match_data = request.data
        sets_data = match_data.pop("sets", [])

        # Récupérer l'utilisateur connecté pour user1
        user1 = request.user
        # Vérifier si player1 existe, sinon le créer
        player1_name = match_data["player1"]
        player1, created = Player.objects.get_or_create(
            player=player1_name, defaults={"user": user1}
        )

        # Gérer player2 comme un joueur invité
        player2_name = match_data["player2"]
        player2, created = Player.objects.get_or_create(player=player2_name)

        # Remplacer les noms par des identifiants dans match_data
        match_data["user1"] = user1.id
        match_data["user2"] = None  # Pas de user2 pour le moment
        match_data["player1"] = player1.id
        match_data["player2"] = player2.id

        match_serializer = PongMatchSerializer(data=match_data)
        if match_serializer.is_valid():
            match = match_serializer.save()

            for set_data in sets_data:
                # Associe le match ID à chaque set
                set_data["match"] = match.id
                set_serializer = PongSetSerializer(data=set_data)
                if set_serializer.is_valid():
                    set_serializer.save()
                else:
                    return Response(
                        set_serializer.errors, status=status.HTTP_400_BAD_REQUEST
                    )

            # Retourner une réponse réussie avec les données du match
            return Response(match_serializer.data, status=status.HTTP_201_CREATED)
        else:
            return Response(match_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request, pk):
        try:
            match = PongMatch.objects.get(pk=pk)
        except PongMatch.DoesNotExist:
            return Response(
                {"error": "Match not found."}, status=status.HTTP_404_NOT_FOUND
            )

        match_data = request.data
        sets_data = match_data.pop("sets", [])

        # Récupérer l'utilisateur connecté pour user1
        user1 = request.user

        # Vérifier si player1 existe, sinon le créer
        player1_name = match_data["player1"]
        player1, created = Player.objects.get_or_create(
            player=player1_name, defaults={"user": user1}
        )

        # Gérer player2 comme un joueur invité
        player2_name = match_data["player2"]
        player2, created = Player.objects.get_or_create(player=player2_name)

        # Remplacer les noms par des identifiants dans match_data
        match_data["user1"] = user1.id
        match_data["user2"] = None  # Pas de user2 pour le moment
        match_data["player1"] = player1.id
        match_data["player2"] = player2.id

        # Mettre à jour les champs du match
        match_serializer = PongMatchSerializer(match, data=match_data, partial=True)
        if match_serializer.is_valid():
            match = match_serializer.save()

            # Mettre à jour les sets associés
            for set_data in sets_data:
                set_id = set_data.get("id")
                if set_id:
                    try:
                        pong_set = PongSet.objects.get(pk=set_id, match=match)
                        set_serializer = PongSetSerializer(
                            pong_set, data=set_data, partial=True
                        )
                    except PongSet.DoesNotExist:
                        return Response(
                            {"error": "Set not found."},
                            status=status.HTTP_404_NOT_FOUND,
                        )
                else:
                    # Créer un nouveau set si l'ID n'est pas fourni
                    set_data["match"] = match.id
                    set_serializer = PongSetSerializer(data=set_data)

                if set_serializer.is_valid():
                    set_serializer.save()
                else:
                    return Response(
                        set_serializer.errors, status=status.HTTP_400_BAD_REQUEST
                    )

            return Response(match_serializer.data, status=status.HTTP_200_OK)
        else:
            return Response(match_serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CustomTokenObtainPairView(TokenObtainPairView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            tokens = response.data
            user = CustomUser.objects.get(username=request.data.get("username"))
            user.is_online = True  # Set user as online
            user.update_last_seen()
            user.save()
            response = JsonResponse({"message": "Login successful"})
            response.set_cookie(
                key="access_token",
                value=tokens["access"],
                httponly=True,
                secure=False,  # Set to True in production
                samesite="Lax",
            )
            response.set_cookie(
                key="refresh_token",
                value=tokens["refresh"],
                httponly=True,
                secure=False,  # Set to True in production
                samesite="Lax",
            )
        return response


class CustomTokenRefreshView(TokenRefreshView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        refresh_token = request.COOKIES.get("refresh_token")
        if not refresh_token:
            return Response(
                {"detail": "Refresh token not provided."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        request.data["refresh"] = refresh_token

        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            tokens = response.data
            response = JsonResponse({"message": "Token refreshed successfully"})
            response.set_cookie(
                key="access_token",
                value=tokens["access"],
                httponly=True,
                secure=False,  # Set to True in production
                samesite="Lax",
            )
        return response


logger = logging.getLogger(__name__)


class UserRegisterView(APIView):
    permission_classes = [AllowAny]
    serializer_class = UserRegisterSerializer

    def post(self, request):
        logger.info("Received data: %s", request.data)
        serializer = self.serializer_class(data=request.data)
        logger.info("Serializer validation result: %s", serializer.is_valid())

        if serializer.is_valid():
            username = serializer.validated_data.get("username")

            # Vérifier si le username existe déjà
            if CustomUser.objects.filter(username=username).exists():
                logger.error("Username already exists: %s", username)
                return Response(
                    {"error": "Username already exists."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            logger.info("Creating user with data: %s", serializer.validated_data)
            try:
                user = CustomUser.objects.create_user(
                    username=serializer.validated_data.get("username"),
                    password=serializer.validated_data.get("password"),
                )
                logger.info("User created: %s", user.username)

                # Vérifier si le player existe déjà avant de créer

                #     Player.objects.create(
                #         user=user,
                #         player=username,  # Set player name as username
                #     )
                #     logger.info("Player created for user: %s", user.username)
                # else:
                #     logger.error("Player name already exists: %s", username)
                #     return Response(
                #         {"error": "Player name already exists."},
                #         status=status.HTTP_400_BAD_REQUEST,
                #     )

                return Response(
                    {"success": "User and player created successfully."},
                    status=status.HTTP_201_CREATED,
                )
            except Exception as e:
                logger.error("Error creating user or player: %s", str(e))
                return Response(
                    {"error": "Could not create user or player."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )
        else:
            logger.error("Validation errors: %s", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            # Update user's online status and last seen timestamp
            user = request.user
            user.is_online = False  # Set user as offline
            user.update_last_seen()
            user.save()

            refresh_token = request.COOKIES.get("refresh_token")
            if refresh_token:
                token = RefreshToken(refresh_token)
                # Ensure the token is saved as an OutstandingToken
                outstanding_token = OutstandingToken.objects.get(token=token)
                if not BlacklistedToken.objects.filter(
                    token=outstanding_token
                ).exists():
                    BlacklistedToken.objects.create(token=outstanding_token)
            response = JsonResponse({"detail": "Logout successful."})
            response.delete_cookie("access_token")
            response.delete_cookie("refresh_token")
            return response
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class AnonymizeAccountView(APIView):
    permission_classes = [IsAuthenticated]  # Ensure the user is logged in

    def post(self, request):
        user = request.user
        if user.is_authenticated:
            # Generate a random pseudonym for the deleted user
            anonymous_name = f"Anonymized_User_{uuid.uuid4().hex[:12]}"

            # Update matches where the user is user1 only
            PongMatch.objects.filter(user1=user.username).update(user1=random_username)
            # Keep user1 but anonymize player1 (for match history)
            PongMatch.objects.filter(player1__user=user).update(
                player1_name=anonymous_name
            )
            PongMatch.objects.filter(player2__user=user).update(
                player2_name=anonymous_name
            )

            # Update winner field if this user was a winner
            PongMatch.objects.filter(winner=user.username).update(winner=anonymous_name)

            # Anonymize the player's profile
            Player.objects.filter(user=user).update(player=anonymous_name, user=None)

            # Remove all personal data from User, but keep the account ID (FK in PongMatch)
            user.username = anonymous_name
            user.email = ""
            user.phone_number = ""
            user.profile_picture = None  # Remove profile picture
            user.set_unusable_password()
            user.save()
            # user.delete()  # Deletes the user from the database
            return Response(
                {"message": f"Your account has been anonymized as {anonymous_name}."},
                status=status.HTTP_200_OK,
            )
        return Response(
            {"error": "Utilisateur non authentifié."},
            status=status.HTTP_401_UNAUTHORIZED,
        )


class DeleteAccountView(APIView):
    permission_classes = [IsAuthenticated]  # Ensure the user is logged in

    def delete(self, request):
        user = request.user
        deleted_name = f"Deleted_User"

        # Update matches where the user is user1 or user2, but do not remove the opponent
        PongMatch.objects.filter(user1=user).update(
            user1=None, player1_name=deleted_name
        )
        PongMatch.objects.filter(user2=user).update(
            user2=None, player2_name=deleted_name
        )

        # Update match winner if deleted user won
        PongMatch.objects.filter(winner=user.username).update(winner=deleted_name)

        # Delete player profile
        Player.objects.filter(user=user).delete()

        # Delete the user completely
        user.delete()

        return Response(
            {"message": "Your account has been permanently deleted."},
            status=status.HTTP_200_OK,
        )


import logging

logger = logging.getLogger(__name__)


class TournamentCreationView(APIView):
    permission_classes = [AllowAny]
    parser_classes = [JSONParser]

    def post(self, request):
        tournament_data = request.data.get("tournament_name")
        players_data = request.data.get("players", [])
        number_of_games = request.data.get(
            "number_of_games", 1
        )  # Valeur par défaut à 1
        points_to_win = request.data.get("points_to_win", 3)  # Valeur par défaut à 3

        logger.debug(f"Tournament data: {tournament_data}")
        logger.debug(f"Players data: {players_data}")
        logger.debug(f"Number of games: {number_of_games}")
        logger.debug(f"Points to win: {points_to_win}")

        if not tournament_data:
            return Response(
                {"error": "Tournament name is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 1. Création du tournoi
        tournament_serializer = TournamentSerializer(
            data={
                "tournament_name": tournament_data,
                "date": timezone.now().date(),
                "number_of_games": number_of_games,
                "points_to_win": points_to_win,
            }
        )
        if tournament_serializer.is_valid():
            tournament = tournament_serializer.save()
            tournament_id = tournament.id

            # 2. Gestion des joueurs
            players = []
            for player_player in players_data:
                logger.debug(f"Processing player: {player_player}")

                # Vérifier si un utilisateur avec ce pseudo existe
                try:
                    user = CustomUser.objects.get(username=player_player)
                    player, created = Player.objects.get_or_create(
                        player=player_player, defaults={"user": user}
                    )
                    if (
                        not created
                    ):  # Si le joueur existait déjà, mettre à jour le champ user si nécessaire
                        if player.user is None:
                            player.user = user
                            player.save()
                except CustomUser.DoesNotExist:
                    # Si l'utilisateur n'existe pas, le joueur est un "guest"
                    player, created = Player.objects.get_or_create(player=player_player)

                players.append(player)

            # 3. Association des joueurs au tournoi
            for player in players:
                TournamentPlayer.objects.create(player=player, tournament=tournament)

            # 4. Génération des matchs
            generate_matches(tournament_id, number_of_games, points_to_win)

            return Response(
                {
                    "message": "Tournament, players, and matches added successfully",
                    "tournament_id": tournament_id,
                },
                status=status.HTTP_201_CREATED,
            )
        else:
            logger.error(
                f"Tournament serializer errors: {tournament_serializer.errors}"
            )
            return Response(
                tournament_serializer.errors, status=status.HTTP_400_BAD_REQUEST
            )


def generate_matches(tournament_id, number_of_games, points_to_win):
    # Récupérer tous les joueurs associés au tournoi
    tournament_players = TournamentPlayer.objects.filter(tournament_id=tournament_id)
    players = [tp.player for tp in tournament_players]

    # Générer tous les matchs possibles
    matches = combinations(players, 2)

    # Enregistrer les matchs dans le modèle PongMatch
    for player1, player2 in matches:
        PongMatch.objects.create(
            tournament_id=tournament_id,
            player1=player1,
            player2=player2,
            user1=player1.user,  # Peut être None
            user2=player2.user,  # Peut être None
            sets_to_win=number_of_games,
            points_per_set=points_to_win,
            is_tournament_match=True,  # Indiquer que c'est un match de tournoi
        )

    logger.debug(f"Matches generated for tournament {tournament_id}")


class TournamentMatchesView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        tournament_id = request.GET.get("tournament_id")
        if not tournament_id:
            return Response(
                {"error": "Tournament ID is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            # Utilisez 'id' pour accéder à l'identifiant du tournoi
            tournament = Tournament.objects.get(id=tournament_id)
            matches = PongMatch.objects.filter(tournament=tournament)
            serializer = PongMatchSerializer(matches, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Tournament.DoesNotExist:
            return Response(
                {"error": "Tournament not found"},
                status=status.HTTP_404_NOT_FOUND,
            )


class TournamentSearchView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        name = request.GET.get("name", "")
        tournaments = Tournament.objects.filter(tournament_name__icontains=name)
        data = [
            {"id": t.id, "tournament_name": t.tournament_name, "date": t.date}
            for t in tournaments
        ]
        return JsonResponse(data, safe=False)


class RankingView(APIView):
    def get(self, request):
        # Calculer le nombre de victoires pour chaque joueur
        players = Player.objects.all()
        ranking_data = []

        for player in players:
            total_wins = PongMatch.objects.filter(Q(winner=player.player)).count()

            ranking_data.append({"name": player.player, "total_wins": total_wins})

        # Trier le classement par nombre de victoires décroissant
        ranking_data.sort(key=lambda x: x["total_wins"], reverse=True)

        return Response(ranking_data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def check_user_exists(request):
    username = request.GET.get("username", "")
    try:
        user = User.objects.get(username=username)
        player = Player.objects.get(user=user)
        return JsonResponse(
            {
                "exists": True,
                "user_id": user.id,
                "username": user.username,
                "is_guest": player.is_guest,
            }
        )
    except User.DoesNotExist:
        return JsonResponse({"exists": False})
