from itertools import combinations
import logging

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
from ..serializers import TournamentPlayerSerializer, TournamentSerializer, PongMatchSerializer

logger = logging.getLogger(__name__)


class TournamentCreationView(APIView):
    permission_classes = [AllowAny]
    parser_classes = [JSONParser]  # Maintenant défini grâce à l'import

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
                "is_finalized": False,  # Set this to False by default
            }
        )

        if tournament_serializer.is_valid():
            tournament = tournament_serializer.save()
            return Response(
                {
                    "message": "Tournament created successfully",
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
    parser_classes = [JSONParser]  # Maintenant défini grâce à l'import

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

        # Update tournament with match rules
        tournament.number_of_games = number_of_games
        tournament.points_to_win = points_to_win
        tournament.is_finalized = True  # Mark as finalized
        tournament.save()

        # Player management
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

            TournamentPlayer.objects.create(
                player=player,
                tournament=tournament,
                authenticated=authenticated,
                guest=guest,
            )

        # Generate matches after all players are added and tournament details are set
        generate_matches(tournament_id, number_of_games, points_to_win)

        # Clean up unfinalized tournaments when a new tournament is finalized
        call_command("cleanup_tournaments")

        return Response(
            {
                "message": "Tournament finalized, players added, and matches generated successfully",
                "tournament_id": tournament_id,
                "tournament_name": tournament.tournament_name,
            },
            status=status.HTTP_200_OK,
        )

    @staticmethod
    def cleanup_unfinalized_tournaments():
        # Define how old an unfinalized tournament should be to be considered for deletion
        # max_age = timezone.now() - timezone.timedelta(
        #     days=7
        # )  # Example: delete tournaments older than 7 days if not finalized
        unfinalized_tournaments = Tournament.objects.filter(
            is_finalized=False
            # is_finalized=False, date__lt=max_age
        )

        for tournament in unfinalized_tournaments:
            # Delete associated TournamentPlayer entries
            TournamentPlayer.objects.filter(tournament=tournament).delete()
            # Then delete the tournament
            tournament.delete()

        return {
            "message": f"Cleaned up {unfinalized_tournaments.count()} unfinalized tournaments"
        }


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
            return Response(serializer.data)
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
