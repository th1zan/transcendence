import logging
import uuid  # Pour générer un pseudonyme aléatoire
from itertools import combinations

from django.contrib.auth import authenticate
from django.contrib.auth.hashers import make_password
from django.contrib.auth.models import User
from django.db.models import Q
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

from .models import Player, PongMatch, Tournament, TournamentPlayer
from .serializers import (
    PongMatchSerializer,
    PongSetSerializer,
    TournamentPlayerSerializer,
    TournamentSerializer,
    UserRegisterSerializer,
)

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

            return Response(match_serializer.data, status=status.HTTP_201_CREATED)
        else:
            return Response(match_serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CustomTokenObtainPairView(TokenObtainPairView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            tokens = response.data
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


class UserRegisterView(APIView):
    permission_classes = [AllowAny]
    serializer_class = UserRegisterSerializer

    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")

        if not username or not password:
            return Response(
                {"error": "Username and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if User.objects.filter(username=username).exists():
            return Response(
                {"error": "Username already exists."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(password) < 3:  # Exemple de vérification pour un mot de passe trop court
            return Response(
                {"error": "Password must be at least 3 characters long."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.create(username=username, password=make_password(password))

        return Response(
            {"success": "User created successfully."}, status=status.HTTP_201_CREATED
        )


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
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


class DeleteAccountView(APIView):
    permission_classes = [IsAuthenticated]  # Ensure the user is logged in

    def delete(self, request):
        user = request.user
        if user.is_authenticated:
            # Delete related game history or other data before deleting the user
            # Generate a random pseudonym for the deleted user
            random_username = f"deleteduser_{uuid.uuid4().hex[:12]}"

            # Update matches where the user is user1 only
            PongMatch.objects.filter(user1=user.username).update(user1=random_username)

            user.delete()  # Deletes the user from the database
            return Response(
                {"success": "Compte supprimé avec succès."}, status=status.HTTP_200_OK
            )
        return Response(
            {"error": "Utilisateur non authentifié."},
            status=status.HTTP_401_UNAUTHORIZED,
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
                    user = User.objects.get(username=player_player)
                    player, created = Player.objects.get_or_create(
                        player=player_player, defaults={"user": user}
                    )
                    if (
                        not created
                    ):  # Si le joueur existait déjà, mettre à jour le champ user si nécessaire
                        if player.user is None:
                            player.user = user
                            player.save()
                except User.DoesNotExist:
                    # Si l'utilisateur n'existe pas, le joueur est un "guest"
                    player, created = Player.objects.get_or_create(player=player_player)

                logger.debug(
                    f"Player {player_player} created: {created}, player: {player}"
                )
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
