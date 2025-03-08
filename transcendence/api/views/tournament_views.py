import logging
from itertools import combinations

from django.core.management import call_command
from django.db.models import Q
from django.http import JsonResponse
from django.utils import timezone
from rest_framework import status
from rest_framework.parsers import JSONParser  # Ajout de l'import manquant
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

# Import ajusté selon l'arborescence
from ..authentication import CookieJWTAuthentication
from ..models import CustomUser, Player, PongMatch, Tournament, TournamentPlayer
from ..serializers import (
    PongMatchSerializer,
    TournamentPlayerSerializer,
    TournamentSerializer,
)

logger = logging.getLogger(__name__)


class TournamentCreationView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]

    def post(self, request):
        tournament_data = request.data.get("tournament_name")

        if not tournament_data:
            return Response(
                {"error": "Tournament name is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        logger.info(
            f"Creating tournament with organizer: {request.user.username} (ID: {request.user.id})"
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
            # Création du tournoi avec l'organisateur
            tournament = tournament_serializer.save(organizer=request.user)
            logger.info(
                f"Tournament created with organizer: {tournament.organizer.username}"
            )

            # Ajout de l'organisateur comme joueur authentifié
            player, created = Player.objects.get_or_create(
                player=request.user.username, defaults={"user": request.user}
            )
            if not created and not player.user:
                player.user = request.user
                player.save()

            TournamentPlayer.objects.create(
                player=player,
                tournament=tournament,
                authenticated=True,  # L'organisateur est authentifié par défaut
                guest=False,  # Pas un invité
            )
            logger.info(
                f"Organizer {request.user.username} added as authenticated player in tournament {tournament.id}"
            )

            return Response(
                {
                    "message": "Tournament created successfully and organizer added as authenticated player",
                    "tournament_id": tournament.id,
                    "tournament_name": tournament.tournament_name,
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


class TournamentFinalizationView(APIView):
    permission_classes = [AllowAny]
    parser_classes = [JSONParser]

    def post(self, request, tournament_id):
        players_data = request.data.get("players", [])
        number_of_games = request.data.get("number_of_games", 1)
        points_to_win = request.data.get("points_to_win", 3)

        try:
            tournament = Tournament.objects.get(id=tournament_id)
        except Tournament.DoesNotExist:
            return Response(
                {"error": "Tournament not found"}, status=status.HTTP_404_NOT_FOUND
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

            # Vérifier si le joueur existe déjà dans ce tournoi
            tournament_player, tp_created = TournamentPlayer.objects.get_or_create(
                player=player,
                tournament=tournament,
                defaults={"authenticated": authenticated, "guest": guest},
            )
            if not tp_created:
                # Si le joueur existe déjà, mettre à jour ses attributs
                tournament_player.authenticated = authenticated
                tournament_player.guest = guest
                tournament_player.save()
                logger.info(
                    f"Updated existing player {player_name} in tournament {tournament_id}"
                )
            else:
                logger.info(
                    f"Added new player {player_name} to tournament {tournament_id}"
                )

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

    logger.debug(f"Matches generated for tournament {tournament_id}")


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
                    "is_finished": tournament.is_tournament_finished(),  # Calculé à la volée
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
            user_tournaments = Tournament.objects.filter(
                tournamentplayer__player__user__username=username
            ).distinct()

            serializer = TournamentSerializer(user_tournaments, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class TournamentPlayersView(APIView):
    def get(self, request, tournament_id):
        try:
            tournament_players = TournamentPlayer.objects.filter(
                tournament_id=tournament_id
            )

            serializer = TournamentPlayerSerializer(tournament_players, many=True)

            response_data = []
            for player_data in serializer.data:
                player = Player.objects.get(id=player_data["player"]["id"])
                player_info = {
                    "name": player_data["player"]["player"],
                    "authenticated": player_data["authenticated"],
                    "guest": player.user is None,
                }
                response_data.append(player_info)

            return Response(response_data, status=status.HTTP_200_OK)
        except TournamentPlayer.DoesNotExist:
            return Response(
                {"error": "Tournament or players not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
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
        except Exception as e:
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class RemovePlayerMatchesView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, tournament_id, player_name):
        try:
            tournament = Tournament.objects.get(id=tournament_id)
            if not tournament.is_finalized:
                return Response(
                    {"error": "Tournament must be finalized to remove player matches"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            user = request.user
            logger.info(f"User requesting deletion: {user.username} (ID: {user.id})")
            is_organizer = (
                tournament.organizer == user if tournament.organizer else False
            )
            logger.info(
                f"Is organizer: {is_organizer}, Tournament organizer: {tournament.organizer.username if tournament.organizer else 'None'}"
            )

            tournament_player = TournamentPlayer.objects.get(
                tournament=tournament, player__player=player_name
            )
            player_to_remove = tournament_player.player
            logger.info(
                f"Player to remove: {player_to_remove.player}, User linked: {player_to_remove.user.username if player_to_remove.user else 'None'}"
            )

            if tournament.organizer and player_to_remove.user == tournament.organizer:
                logger.warning(
                    f"Attempt to remove organizer {tournament.organizer.username} blocked"
                )
                return Response(
                    {"error": "The organizer cannot be removed from the tournament"},
                    status=status.HTTP_403_FORBIDDEN,
                )

            is_self = (
                player_to_remove.user == user and player_to_remove.user is not None
            )
            if not (is_self or is_organizer):
                logger.warning(
                    f"Unauthorized attempt by {user.username} to remove {player_name}"
                )
                return Response(
                    {"error": "Unauthorized to remove this player"},
                    status=status.HTTP_403_FORBIDDEN,
                )

            # Supprimer les matchs
            matches_to_delete = PongMatch.objects.filter(
                tournament=tournament, player1=player_to_remove
            ) | PongMatch.objects.filter(
                tournament=tournament, player2=player_to_remove
            )
            matches_deleted_count = matches_to_delete.delete()[0]
            logger.info(f"Deleted {matches_deleted_count} matches for {player_name}")

            # Supprimer le joueur
            tournament_player.delete()

            # Réévaluer l’état du tournoi
            remaining_matches = tournament.matches.all()
            if remaining_matches.exists():
                tournament.is_finished = all(
                    match.is_match_played() for match in remaining_matches
                )
            else:
                tournament.is_finished = False  # Aucun match restant, tournoi pas fini
            tournament.save()
            logger.info(
                f"Tournament {tournament_id} status updated: is_finished={tournament.is_finished}"
            )

            # Vérifier que l'organisateur est toujours présent
            organizer_present = TournamentPlayer.objects.filter(
                tournament=tournament, player__user=tournament.organizer
            ).exists()
            if not organizer_present and tournament.organizer:
                logger.error(
                    f"Organizer {tournament.organizer.username} would be removed, which is not allowed"
                )
                return Response(
                    {"error": "The organizer must remain in the tournament"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if (
                not remaining_matches.exists()
                and TournamentPlayer.objects.filter(tournament=tournament).count() == 1
            ):
                last_player = TournamentPlayer.objects.get(tournament=tournament)
                if last_player.player.user == tournament.organizer:
                    tournament.delete()
                    logger.info(
                        f"Tournament {tournament_id} deleted as it has no matches and only the organizer remains"
                    )
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

            logger.info(
                f"User {request.user.username} removed {matches_deleted_count} matches and deleted player {player_name} from tournament {tournament_id}"
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
        except TournamentPlayer.DoesNotExist:
            return Response(
                {"error": "Player not found in this tournament"},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
            logger.error(f"Error removing player matches: {str(e)}")
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class StartMatchView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, match_id):
        try:
            match = PongMatch.objects.get(id=match_id)
            tournament = match.tournament

            # Vérifier si l'utilisateur connecté (via le token JWT) est l'organisateur
            if tournament.organizer != request.user:
                return Response(
                    {"error": "Only the tournament organizer can start a match"},
                    status=status.HTTP_403_FORBIDDEN,
                )

            # Récupérer les entrées TournamentPlayer pour ce tournoi
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

            # Vérifier si les joueurs sont authentifiés ou invités
            player1_authenticated = (
                player1_tournament.authenticated or player1_tournament.guest
            )
            player2_authenticated = (
                player2_tournament.authenticated or player2_tournament.guest
            )

            if not player1_authenticated:
                return Response(
                    {"error": f"Player {match.player1.player} is not authenticated"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if not player2_authenticated:
                return Response(
                    {"error": f"Player {match.player2.player} is not authenticated"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Si tout est valide, retourner une confirmation
            return Response(
                {"message": "Match can be started", "match_id": match_id},
                status=status.HTTP_200_OK,
            )

        except PongMatch.DoesNotExist:
            return Response(
                {"error": "Match not found"}, status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
