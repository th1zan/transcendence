# from django.contrib.auth.models import User
from django.conf import settings
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed

from .models import CustomUser, Player, PongMatch, PongSet, Tournament, TournamentPlayer


class TournamentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tournament
        fields = ["tournament_name", "date", "number_of_games", "points_to_win"]


class TournamentPlayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = TournamentPlayer
        fields = ["player"]


class PongMatchSerializer(serializers.ModelSerializer):
    player1_name = serializers.SerializerMethodField()
    player2_name = serializers.SerializerMethodField()
    winner_name = (
        serializers.SerializerMethodField()
    )  # Ajout pour afficher le nom du gagnant

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
            "winner_name",
        ]
        extra_kwargs = {
            "user1": {"allow_null": True},
            "user2": {"allow_null": True},
        }

    winner = serializers.SlugRelatedField(
        read_only=False, slug_field="player", queryset=Player.objects.all()
    )

    def get_player1_name(self, obj):
        return obj.player1.user.username if obj.player1.user else obj.player1.player

    def get_player2_name(self, obj):
        return obj.player2.user.username if obj.player2.user else obj.player2.player

    def get_winner_name(self, obj):
        return obj.winner.player if obj.winner else "No winner"


class PongSetSerializer(serializers.ModelSerializer):
    class Meta:
        model = PongSet
        fields = "__all__"


class UserRegisterSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ["username", "password"]  # ("username", "password")

    def validate_username(self, value):
        if CustomUser.objects.filter(username=value).exists():
            raise serializers.ValidationError("Ce nom d'utilisateur est déjà pris.")
        return value

    # def validate_email(self, value):
    #     if CustomUser.objects.filter(email=value).exists():
    #         raise serializers.ValidationError("A user with that email already exists.")
    #     return value

    def validate_password(self, value):
        if len(value) < 3:
            raise serializers.ValidationError(
                "Le mot de passe doit contenir au moins 3 caractères."
            )
        return value

    def create(self, validated_data):
        user = CustomUser.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
        )
        return user
