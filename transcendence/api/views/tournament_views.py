import logging
from itertools import combinations

from django.core.management import call_command
from django.db.models import Q
from django.http import JsonResponse
from django.utils import timezone
from rest_framework import status
from rest_framework.parsers import JSONParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ..authentication import CookieJWTAuthentication
from ..models import (CustomUser, Player, PongMatch, Tournament,
                      TournamentPlayer)
from ..serializers import (PongMatchSerializer, TournamentPlayerSerializer,
                           TournamentSerializer)

logger = logging.getLogger(__name__)


class TournamentCreationView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]

    # NOTE: Validates tournament name and restricts creation to authenticated users.
    def post(self, request):
        tournament_data = request.data.get("tournament_name")
        if not tournament_data:
            return Response(
                {"error": "Tournament name is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        tournament_serializer = TournamentSerializer(
            data={
                "tournament_name": tournament_data,
                "date": timezone.now().date(),
                "is_finalized": False,
                "organizer": request.user.id,
            }
        )
        if tournament_serializer.is_valid():
            tournament = tournament_serializer.save(organizer=request.user)
            player, created = Player.objects.get_or_create(
                player=request.user.username, defaults={"user": request.user}
            )
            if not created and not player.user:
                player.user = request.user
                player.save()
            TournamentPlayer.objects.create(
                player=player, tournament=tournament, authenticated=True, guest=False
            )
            return Response(
                {
                    "message": "Tournament created successfully and organizer added as authenticated player",
                    "tournament_id": tournament.id,
                    "tournament_name": tournament.tournament_name,
                },
                status=status.HTTP_201_CREATED,
            )
        return Response(
            tournament_serializer.errors, status=status.HTTP_400_BAD_REQUEST
        )


class TournamentFinalizationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, tournament_id):
        if not request.user.is_authenticated:
            return Response(
                {"error": "Authentication required"},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        players_data = request.data.get("players", [])
        number_of_games = request.data.get("number_of_games", 1)
        points_to_win = request.data.get("points_to_win", 3)

        try:
            tournament = Tournament.objects.get(id=tournament_id)
            if tournament.organizer != request.user:
                return Response(
                    {"error": "Only the organizer can finalize the tournament"},
                    status=status.HTTP_403_FORBIDDEN,
                )
            if tournament.is_finalized:
                return Response(
                    {"error": "This tournament has already been finalized"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            tournament.number_of_games = number_of_games
            tournament.points_to_win = points_to_win
            tournament.is_finalized = True
            tournament.save()

            for player_data in players_data:
                player_name = player_data.get("name")
                if not player_name:
                    continue
                authenticated = player_data.get("authenticated", False)
                guest = player_data.get("guest", False)

                try:
                    user = CustomUser.objects.get(username=player_name)
                    player, created = Player.objects.get_or_create(
                        player=player_name, defaults={"user": user}
                    )
                    if not created and not player.user:
                        player.user = user
                        player.save()
                except CustomUser.DoesNotExist:
                    player, created = Player.objects.get_or_create(player=player_name)
                    guest = True  # Forcer guest = True si pas de CustomUser

                tournament_player, tp_created = TournamentPlayer.objects.get_or_create(
                    player=player,
                    tournament=tournament,
                    defaults={"authenticated": authenticated, "guest": guest},
                )
                if not tp_created:
                    tournament_player.authenticated = authenticated if player.user else False
                    tournament_player.guest = guest or player.is_guest  # Utiliser is_guest pour détecter les guests
                    tournament_player.save()

            generate_matches(tournament_id, number_of_games, points_to_win)
            call_command("cleanup_tournaments")
            return Response(
                {
                    "message": "Tournament finalized, players added, and matches generated successfully",
                    "tournament_id": tournament_id,
                    "tournament_name": tournament.tournament_name,
                },
                status=status.HTTP_200_OK,
            )
        except Tournament.DoesNotExist:
            return Response(
                {"error": "Tournament not found"}, status=status.HTTP_404_NOT_FOUND
            )
            


def generate_matches(tournament_id, number_of_games, points_to_win):
    tournament_players = TournamentPlayer.objects.filter(tournament_id=tournament_id)
    players = [tp.player for tp in tournament_players]
    matches = combinations(players, 2)
    for player1, player2 in matches:
        PongMatch.objects.create(
            tournament_id=tournament_id,
            player1=player1,
            player2=player2,
            user1=player1.user,
            user2=player2.user,
            sets_to_win=number_of_games,
            points_per_set=points_to_win,
            is_tournament_match=True,
        )


class TournamentMatchesView(APIView):
    def get(self, request):
        tournament_id = request.GET.get("tournament_id")
        if not tournament_id:
            return Response(
                {"error": "Tournament ID is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            tournament = Tournament.objects.get(id=tournament_id)
            matches = PongMatch.objects.filter(tournament=tournament)
            serializer = PongMatchSerializer(matches, many=True)
            return Response(
                {
                    "matches": serializer.data,
                    "is_finished": tournament.is_tournament_finished(),
                }
            )
        except Tournament.DoesNotExist:
            return Response(
                {"error": "Tournament not found"}, status=status.HTTP_404_NOT_FOUND
            )


class TournamentSearchView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        name = request.GET.get("name", "")
        tournaments = Tournament.objects.filter(tournament_name__icontains=name)
        data = [
            {
                "id": t.id,
                "tournament_name": t.tournament_name,
                "date": t.date,
                "is_finished": t.is_finished,
            }
            for t in tournaments
        ]
        return JsonResponse(data, safe=False)


class UserTournamentsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        username = request.user.username
        try:
            # Filtrer pour inclure uniquement les tournois finalisés
            user_tournaments = Tournament.objects.filter(
                tournamentplayer__player__user__username=username,
                is_finalized=True,  # Ajoutez ce filtre
            ).distinct()
            serializer = TournamentSerializer(user_tournaments, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {"error": "An error occurred"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class TournamentPlayersView(APIView):
    def get(self, request, tournament_id):
        try:
            tournament_players = TournamentPlayer.objects.filter(
                tournament_id=tournament_id
            )
            serializer = TournamentPlayerSerializer(tournament_players, many=True)
            response_data = [
                {
                    "name": player_data["player"]["player"],
                    "authenticated": player_data["authenticated"],
                    "guest": Player.objects.get(id=player_data["player"]["id"]).user
                    is None,
                }
                for player_data in serializer.data
            ]
            return Response(response_data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {"error": "An error occurred"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class PendingTournamentAuthenticationsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        username = request.user.username
        pending_auths = TournamentPlayer.objects.filter(
            player__user__username=username,
            authenticated=False,
            tournament__is_finished=False,
        ).select_related("tournament")
        data = [
            {
                "tournament_id": tp.tournament.id,
                "tournament_name": tp.tournament.tournament_name,
                "player_name": tp.player.player,
            }
            for tp in pending_auths
        ]
        return Response({"pending_authentications": data})


class ConfirmTournamentParticipationView(APIView):
    permission_classes = [IsAuthenticated]

    # NOTE: Ensures only the correct user can confirm participation.
    def post(self, request, tournament_id):
        player_name = request.data.get("player_name")
        if not player_name:
            return Response(
                {"error": "Player name is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            tournament_player = TournamentPlayer.objects.get(
                tournament_id=tournament_id,
                player__user__username=request.user.username,
                player__player=player_name,
                authenticated=False,
            )
            tournament_player.authenticated = True
            tournament_player.save()
            return Response(
                {"message": "Player authenticated successfully", "success": True},
                status=status.HTTP_200_OK,
            )
        except TournamentPlayer.DoesNotExist:
            return Response(
                {"error": "Player not found or already authenticated"},
                status=status.HTTP_404_NOT_FOUND,
            )


class RemovePlayerMatchesView(APIView):
    permission_classes = [IsAuthenticated]

    # NOTE: Permet à l'organisateur ou au joueur lui-même de se supprimer (sauf l'organisateur lui-même).
    def delete(self, request, tournament_id, player_name):
        try:
            tournament = Tournament.objects.get(id=tournament_id)
            if not tournament.is_finalized:
                return Response(
                    {"error": "Tournament must be finalized to remove player matches"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            user = request.user  # Utilisateur authentifié via le token

            # Récupérer le joueur à supprimer
            try:
                tournament_player = TournamentPlayer.objects.get(
                    tournament=tournament, player__player=player_name
                )
                player_to_remove = tournament_player.player
            except TournamentPlayer.DoesNotExist:
                return Response(
                    {"error": "Player not found in this tournament"},
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Vérifier les autorisations
            is_organizer = tournament.organizer == user
            is_player_themselves = player_to_remove.user == user

            if not (is_organizer or is_player_themselves):
                return Response(
                    {
                        "error": "Only the organizer or the player themselves can remove this player"
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

            # Empêcher l'organisateur de se supprimer lui-même
            if is_organizer and is_player_themselves:
                return Response(
                    {
                        "error": "The organizer cannot remove themselves from the tournament"
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

            # Supprimer les matchs du joueur
            matches_to_delete = PongMatch.objects.filter(
                tournament=tournament, player1=player_to_remove
            ) | PongMatch.objects.filter(
                tournament=tournament, player2=player_to_remove
            )
            matches_deleted_count = matches_to_delete.delete()[0]
            tournament_player.delete()

            # Mettre à jour l'état du tournoi
            remaining_matches = tournament.matches.all()
            tournament.is_finished = (
                all(match.is_match_played() for match in remaining_matches)
                if remaining_matches.exists()
                else False
            )
            tournament.save()

            # Supprimer le tournoi si vide et seul l'organisateur reste
            if (
                not remaining_matches.exists()
                and TournamentPlayer.objects.filter(tournament=tournament).count() == 1
            ):
                last_player = TournamentPlayer.objects.get(tournament=tournament)
                if last_player.player.user == tournament.organizer:
                    tournament.delete()
                    return Response(
                        {
                            "message": f"Removed {matches_deleted_count} matches, deleted player {player_name}, and deleted empty tournament {tournament_id}",
                            "tournament_id": tournament_id,
                            "player_name": player_name,
                            "matches_deleted": matches_deleted_count,
                            "tournament_deleted": True,
                        },
                        status=status.HTTP_200_OK,
                    )

            return Response(
                {
                    "message": f"Removed {matches_deleted_count} matches and deleted player {player_name} from tournament {tournament_id}",
                    "tournament_id": tournament_id,
                    "player_name": player_name,
                    "matches_deleted": matches_deleted_count,
                    "tournament_deleted": False,
                },
                status=status.HTTP_200_OK,
            )

        except Tournament.DoesNotExist:
            return Response(
                {"error": "Tournament not found"}, status=status.HTTP_404_NOT_FOUND
            )


class StartMatchView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, match_id):
        try:
            match = PongMatch.objects.get(id=match_id)
            tournament = match.tournament
            if tournament.organizer != request.user:
                return Response(
                    {"error": "Only the tournament organizer can start a match"},
                    status=status.HTTP_403_FORBIDDEN,
                )

            try:
                player1_tournament = TournamentPlayer.objects.get(
                    tournament=tournament, player=match.player1
                )
                player2_tournament = TournamentPlayer.objects.get(
                    tournament=tournament, player=match.player2
                )
            except TournamentPlayer.DoesNotExist:
                return Response(
                    {
                        "error": "One or both players are not registered in this tournament"
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Vérifier si les joueurs peuvent jouer
            player1_can_play = player1_tournament.guest or player1_tournament.authenticated
            player2_can_play = player2_tournament.guest or player2_tournament.authenticated

            if not player1_can_play:
                return Response(
                    {"error": f"Player {match.player1.player} is neither a guest nor authenticated"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if not player2_can_play:
                return Response(
                    {"error": f"Player {match.player2.player} is neither a guest nor authenticated"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            return Response(
                {"message": "Match can be started", "match_id": match_id},
                status=status.HTTP_200_OK,
            )
        except PongMatch.DoesNotExist:
            return Response(
                {"error": "Match not found"}, status=status.HTTP_404_NOT_FOUND
            )


class TournamentDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, tournament_id):
        try:
            tournament = Tournament.objects.get(id=tournament_id)
            serializer = TournamentSerializer(tournament)
            return Response(serializer.data)
        except Tournament.DoesNotExist:
            return Response({"error": "Tournament not found"}, status=404)
