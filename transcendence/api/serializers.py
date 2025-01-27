from django.contrib.auth.models import User
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed

from .models import PongMatch, PongSet, Tournament, TournamentPlayer


class TournamentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tournament
        fields = ["tournament_name", "date", "number_of_games", "points_to_win"]


class TournamentPlayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = TournamentPlayer
        fields = ["pseudo"]


class PongMatchSerializer(serializers.ModelSerializer):
    player1_name = serializers.SerializerMethodField()
    player2_name = serializers.SerializerMethodField()

    class Meta:
        model = PongMatch
        fields = [
            "id",
            "player1",
            "player2",
            "sets_to_win",
            "points_per_set",
            "player1_sets_won",
            "player2_sets_won",
            "winner",
            "date_played",
            "is_tournament_match",
            "tournament",
            "player1_name",
            "player2_name",
        ]

    def get_player1_name(self, obj):
        return obj.player1.user.username if obj.player1.user else obj.player1.player

    def get_player2_name(self, obj):
        return obj.player2.user.username if obj.player2.user else obj.player2.player


class PongSetSerializer(serializers.ModelSerializer):
    class Meta:
        model = PongSet
        fields = "__all__"


class UserRegisterSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("username", "password")

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Ce nom d'utilisateur est déjà pris.")
        if not User.objects.filter(username=value).exists():
            raise AuthenticationFailed("User does not exist.", code="user_not_found")
        return value

    def validate_password(self, value):
        if len(value) < 3:  # minimum 3 caractères pour dev
            raise serializers.ValidationError(
                "Le mot de passe doit contenir au moins 3 caractères."
            )
        return value
