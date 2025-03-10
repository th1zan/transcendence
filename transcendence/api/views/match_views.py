import logging

from django.db.models import Q
from django.http import JsonResponse
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ..authentication import CookieJWTAuthentication
from ..models import CustomUser, Player, PongMatch, PongSet
from ..serializers import PongMatchSerializer, PongSetSerializer

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
            player_id = (
                Player.objects.filter(player=user_param)
                .values_list("id", flat=True)
                .first()
            )
            if not player_id:
                return PongMatch.objects.none()
            queryset = queryset.filter(Q(player1=player_id) | Q(player2=player_id))
        return queryset


class PongMatchDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = PongMatch.objects.all()
    serializer_class = PongMatchSerializer
    permission_classes = [IsAuthenticated]


class PongScoreView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            match = PongMatch.objects.get(pk=pk)
            match_serializer = PongMatchSerializer(match)
            sets_serializer = PongSetSerializer(match.sets.all(), many=True)
            response_data = match_serializer.data
            response_data["sets"] = [set_data for set_data in sets_serializer.data]
            return Response(response_data)
        except PongMatch.DoesNotExist:
            return Response(
                {"error": "Match not found."}, status=status.HTTP_404_NOT_FOUND
            )

    # NOTE: Ensures match status is accurately determined to prevent manipulation.
    def _is_match_finished(self, match_data, sets_data):
        if sets_data:
            for set_data in sets_data:
                if (
                    set_data.get("player1_score", 0) > 0
                    or set_data.get("player2_score", 0) > 0
                ):
                    return True
        if match_data.get("winner") or (
            match_data.get("player1_sets_won", 0)
            == match_data.get("player2_sets_won", 0)
            and match_data.get("player1_sets_won", 0) > 0
        ):
            return True
        return False

    # NOTE: Validates input and ensures authenticated players for multiplayer matches.
    def post(self, request):
        match_data = request.data
        if not all(key in match_data for key in ["player1", "player2"]):
            return Response(
                {"error": "Player1 and Player2 are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        sets_data = match_data.pop("sets", [])
        mode = match_data.get("mode", "solo")
        user1 = request.user
        player1_name = match_data["player1"]
        player1, created = Player.objects.get_or_create(
            player=player1_name,
            defaults={"user": user1 if user1.username == player1_name else None},
        )
        player2_name = match_data["player2"]
        player2, created = Player.objects.get_or_create(player=player2_name)

        if mode != "solo" and player2.user and not player2.authenticated:
            return Response(
                {"error": "Player2 must be authenticated for multiplayer matches."},
                status=status.HTTP_403_FORBIDDEN,
            )

        match_data["player1"] = player1.id
        match_data["player2"] = player2.id
        match_data["user2"] = (
            player2.user.id if player2.user and mode != "solo" else None
        )

        match_serializer = PongMatchSerializer(data=match_data)
        if match_serializer.is_valid():
            match = match_serializer.save()
            for set_data in sets_data:
                set_data["match"] = match.id
                set_serializer = PongSetSerializer(data=set_data)
                if set_serializer.is_valid():
                    set_serializer.save()
                else:
                    return Response(
                        set_serializer.errors, status=status.HTTP_400_BAD_REQUEST
                    )

            if self._is_match_finished(match_data, sets_data):
                winner_name = match_data.get("winner")
                if winner_name:
                    try:
                        match.winner = Player.objects.get(player=winner_name)
                    except Player.DoesNotExist:
                        match.winner = None
                match.save()
            if mode != "solo" and player2.user:
                player2.authenticated = False
                player2.save()
            return Response(match_serializer.data, status=status.HTTP_201_CREATED)
        return Response(match_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # NOTE: Validates match existence and updates securely.
    def put(self, request, pk):
        try:
            match = PongMatch.objects.get(pk=pk)
        except PongMatch.DoesNotExist:
            return Response(
                {"error": "Match not found."}, status=status.HTTP_404_NOT_FOUND
            )

        match_data = request.data
        if not all(key in match_data for key in ["player1", "player2"]):
            return Response(
                {"error": "Player1 and Player2 are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        sets_data = match_data.pop("sets", [])
        player1_name = match_data.get("player1", match.player1.player)
        player2_name = match_data.get("player2", match.player2.player)
        player1, _ = Player.objects.get_or_create(player=player1_name)
        player2, _ = Player.objects.get_or_create(player=player2_name)

        match_data["player1"] = player1.id
        match_data["player2"] = player2.id
        match_data["user2"] = (
            player2.user.id if player2.user and player2.authenticated else None
        )

        match_serializer = PongMatchSerializer(match, data=match_data, partial=True)
        if match_serializer.is_valid():
            match = match_serializer.save()
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
                    set_data["match"] = match.id
                    set_serializer = PongSetSerializer(data=set_data)
                if set_serializer.is_valid():
                    set_serializer.save()
                else:
                    return Response(
                        set_serializer.errors, status=status.HTTP_400_BAD_REQUEST
                    )

            if self._is_match_finished(match_data, sets_data):
                winner_name = match_data.get("winner")
                if winner_name:
                    try:
                        match.winner = Player.objects.get(player=winner_name)
                    except Player.DoesNotExist:
                        match.winner = None
                match.save()
            return Response(match_serializer.data, status=status.HTTP_200_OK)
        return Response(match_serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RankingView(APIView):
    def get(self, request):
        players = Player.objects.all()
        ranking_data = []
        for player in players:
            total_wins = PongMatch.objects.filter(winner=player).count()
            matches_played = PongMatch.objects.filter(
                Q(player1=player) | Q(player2=player)
            )
            total_losses = (
                matches_played.exclude(winner=player)
                .filter(winner__isnull=False)
                .count()
            )
            total_draws = matches_played.filter(winner__isnull=True).count()
            sets_won = sets_lost = points_scored = points_conceded = 0
            for match in matches_played:
                if match.player1 == player:
                    sets_won += match.player1_sets_won or 0
                    sets_lost += match.player2_sets_won or 0
                elif match.player2 == player:
                    sets_won += match.player2_sets_won or 0
                    sets_lost += match.player1_sets_won or 0
                for pong_set in match.sets.all():
                    if match.player1 == player:
                        points_scored += pong_set.player1_score or 0
                        points_conceded += pong_set.player2_score or 0
                    elif match.player2 == player:
                        points_scored += pong_set.player2_score or 0
                        points_conceded += pong_set.player1_score or 0
            ranking_data.append(
                {
                    "name": player.player,
                    "total_wins": total_wins,
                    "total_losses": total_losses,
                    "total_draws": total_draws,
                    "sets_won": sets_won,
                    "sets_lost": sets_lost,
                    "points_scored": points_scored,
                    "points_conceded": points_conceded,
                }
            )
        ranking_data.sort(key=lambda x: x["total_wins"], reverse=True)
        return Response(ranking_data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def check_user_exists(request):
    username = request.GET.get("username", "")
    if not username:
        return JsonResponse({"error": "Username is required."}, status=400)
    try:
        user = CustomUser.objects.get(username=username)
        player = Player.objects.get(user=user)
        return JsonResponse(
            {
                "exists": True,
                "user_id": user.id,
                "username": user.username,
                "is_guest": player.is_guest,
            }
        )
    except CustomUser.DoesNotExist:
        return JsonResponse({"exists": False})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def check_player_exists(request):
    player_name = request.GET.get("player_name", "")
    if not player_name:
        return Response(
            {"error": "Player name is required."}, status=status.HTTP_400_BAD_REQUEST
        )
    try:
        player = Player.objects.get(player=player_name)
        return Response(
            {
                "exists": True,
                "player_id": player.id,
                "player_name": player.player,
                "is_guest": player.is_guest,
            }
        )
    except Player.DoesNotExist:
        return Response({"exists": False}, status=status.HTTP_200_OK)
