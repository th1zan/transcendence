import logging

from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

# Import ajusté selon l'arborescence
from ..authentication import CookieJWTAuthentication
from ..models import Player, PongMatch, PongSet
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
                return PongMatch.objects.none()  # Retourne un queryset vide
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
            winner = match.winner
            player1 = match.player1
            player2 = match.player2
            sets = match.sets.all()

            match_serializer = PongMatchSerializer(match)
            sets_serializer = PongSetSerializer(sets, many=True)

            response_data = match_serializer.data
            response_data["sets"] = [set_data for set_data in sets_serializer.data]

            return Response(response_data)
        except PongMatch.DoesNotExist:
            return Response(
                {"error": "Match not found."}, status=status.HTTP_404_NOT_FOUND
            )

    def _is_match_finished(self, match_data, sets_data):
        """
        Détermine si un match est terminé en vérifiant les sets et le gagnant.
        Retourne True si le match est terminé, False sinon.
        """
        # Vérifie si des sets ont été joués (au moins un score non nul)
        if sets_data:
            for set_data in sets_data:
                if (
                    set_data.get("player1_score", 0) > 0
                    or set_data.get("player2_score", 0) > 0
                ):
                    return True
        # Vérifie si un gagnant est spécifié ou si c'est un match nul
        if match_data.get("winner") or (
            match_data.get("player1_sets_won", 0)
            == match_data.get("player2_sets_won", 0)
            and match_data.get("player1_sets_won", 0) > 0
        ):
            return True
        return False

    def post(self, request):
        match_data = request.data
        logger.debug("Received match data: %s", match_data)
        sets_data = match_data.pop("sets", [])
        logger.debug("Extracted sets data: %s", sets_data)
        mode = match_data.get("mode", "solo")

        user1 = request.user
        player1_name = match_data["player1"]
        player1, created = Player.objects.get_or_create(
            player=player1_name,
            defaults={"user": user1 if user1.username == player1_name else None},
        )

        player2_name = match_data["player2"]
        player2, created = Player.objects.get_or_create(player=player2_name)

        if mode != "solo" and player2.user:
            if not player2.authenticated:
                return Response(
                    {
                        "error": "Player2 must be authenticated or guest for multiplayer matches."
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )
            match_data["user2"] = player2.user.id
        else:
            match_data["user2"] = None
            if mode != "solo":
                match_data["player2_sets_won"] = 0
                match_data["player1_sets_won"] = 0

        match_data["player1"] = player1.id
        match_data["player2"] = player2.id

        # Créer et sauvegarder le match
        match_serializer = PongMatchSerializer(data=match_data)
        if match_serializer.is_valid():
            match = match_serializer.save()

            # Sauvegarder les sets après le match
            for set_data in sets_data:
                set_data["match"] = match.id
                set_serializer = PongSetSerializer(data=set_data)
                if set_serializer.is_valid():
                    set_serializer.save()
                else:
                    return Response(
                        set_serializer.errors, status=status.HTTP_400_BAD_REQUEST
                    )

            # Vérifier si le match est terminé et mettre à jour le gagnant
            if self._is_match_finished(match_data, sets_data):
                if match_data.get("winner"):
                    try:
                        winner_player = Player.objects.get(player=match_data["winner"])
                        match.winner = winner_player
                    except Player.DoesNotExist:
                        match.winner = None
                else:
                    # Si pas de gagnant explicite mais match terminé, vérifier s'il y a match nul
                    if (
                        match.player1_sets_won == match.player2_sets_won
                        and match.player1_sets_won > 0
                    ):
                        match.winner = None  # Match nul
                    else:
                        match.winner = None  # Match non décidé ou en cours
                match.save()

            # Réinitialiser l'état d'authentification de player2 si nécessaire
            if mode != "solo" and player2.user:
                player2.authenticated = False
                player2.save()

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

        user1 = request.user
        player1_name = match_data.get("player1", match.player1.player)
        player2_name = match_data.get("player2", match.player2.player)

        player1, created = Player.objects.get_or_create(player=player1_name)
        player2, created = Player.objects.get_or_create(player=player2_name)

        if player2.user and player2.authenticated:
            match_data["user2"] = player2.user.id
        else:
            match_data["user2"] = None

        match_data["player1"] = player1.id
        match_data["player2"] = player2.id

        match_serializer = PongMatchSerializer(match, data=match_data, partial=True)
        if match_serializer.is_valid():
            match = match_serializer.save()

            # Gérer les sets (mise à jour ou création)
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

            # Vérifier si le match est terminé et mettre à jour le gagnant
            if self._is_match_finished(match_data, sets_data):
                if match_data.get("winner"):
                    try:
                        winner_player = Player.objects.get(player=match_data["winner"])
                        match.winner = winner_player
                    except Player.DoesNotExist:
                        match.winner = None
                else:
                    # Vérifier s'il y a match nul
                    if (
                        match.player1_sets_won == match.player2_sets_won
                        and match.player1_sets_won > 0
                    ):
                        match.winner = None  # Match nul
                    else:
                        match.winner = None  # Match non décidé ou en cours
                match.save()

            return Response(match_serializer.data, status=status.HTTP_200_OK)
        else:
            return Response(match_serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RankingView(APIView):
    def get(self, request):
        players = Player.objects.all()
        ranking_data = []

        for player in players:
            # Matchs gagnés
            total_wins = PongMatch.objects.filter(winner=player).count()

            # Matchs joués où le joueur est player1 ou player2
            matches_played = PongMatch.objects.filter(
                Q(player1=player) | Q(player2=player)
            )

            # Matchs perdus : joués mais pas gagnés (winner != player et winner non null)
            total_losses = (
                matches_played.exclude(winner=player)
                .filter(winner__isnull=False)
                .count()
            )

            # Matchs nuls : joués mais sans vainqueur (winner est null)
            total_draws = matches_played.filter(winner__isnull=True).count()

            # Sets gagnés et perdus
            sets_won = 0
            sets_lost = 0
            points_scored = 0
            points_conceded = 0

            # Parcourir les matchs joués pour calculer sets et points
            for match in matches_played:
                if match.player1 == player:
                    sets_won += match.player1_sets_won or 0
                    sets_lost += match.player2_sets_won or 0
                elif match.player2 == player:
                    sets_won += match.player2_sets_won or 0
                    sets_lost += match.player1_sets_won or 0

                # Points à partir des sets
                sets = match.sets.all()
                for pong_set in sets:
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

        # Trier par nombre de victoires décroissant
        ranking_data.sort(key=lambda x: x["total_wins"], reverse=True)

        return Response(ranking_data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def check_user_exists(request):
    username = request.GET.get("username", "")
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
    try:
        player = Player.objects.get(player=player_name)
        return Response(
            {
                "exists": True,
                "player_id": player.id,
                "player_name": player.player,
                "is_guest": player.is_guest,  # Assuming Player has this property or method
            }
        )
    except Player.DoesNotExist:
        return Response({"exists": False}, status=status.HTTP_200_OK)
