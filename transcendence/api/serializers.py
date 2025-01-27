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
    class Meta:
        model = PongMatch
        fields = [
            "player1",
            "player2",
            "player1_sets_won",
            "player2_sets_won",
            "winner",
            "date_played",
            "sets_to_win",
            "points_per_set",
        ]


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
