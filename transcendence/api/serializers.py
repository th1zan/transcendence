import re

from django.conf import settings
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed

from .models import CustomUser, Player, PongMatch, PongSet, Tournament, TournamentPlayer


# class TournamentSerializer(serializers.ModelSerializer):
#     class Meta:
#         model = Tournament
#         fields = [
#             "id",
#             "tournament_name",
#             "date",
#             "number_of_games",
#             "points_to_win",
#             "is_finished",
#         ]
#
class TournamentSerializer(serializers.ModelSerializer):
    players = serializers.SerializerMethodField()

    class Meta:
        model = Tournament
        fields = [
            "id",
            "tournament_name",
            "date",
            "number_of_games",
            "points_to_win",
            "is_finished",
            "players",
        ]

    def get_players(self, obj):
        # Fetch all TournamentPlayer instances for this tournament and serialize them
        tournament_players = TournamentPlayer.objects.filter(tournament=obj)
        return TournamentPlayerSerializer(tournament_players, many=True).data


class PlayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Player
        fields = ["id", "player", "authenticated"]


class TournamentPlayerSerializer(serializers.ModelSerializer):
    player = PlayerSerializer()  # Nested serialization for player details

    class Meta:
        model = TournamentPlayer
        fields = ["player", "authenticated"]


class PongSetSerializer(serializers.ModelSerializer):
    class Meta:
        model = PongSet
        fields = "__all__"


class PongMatchSerializer(serializers.ModelSerializer):
    player1_name = serializers.SerializerMethodField()
    player2_name = serializers.SerializerMethodField()
    winner_name = serializers.SerializerMethodField()
    sets = PongSetSerializer(many=True, read_only=True)

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
            "sets",
            "is_played",
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


class UserRegisterSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ["username", "password", "privacy_policy_accepted"]

    def validate_username(self, value):
        if CustomUser.objects.filter(username=value).exists():
            raise serializers.ValidationError("This username is already taken.")
        return value

    def validate_password(self, value):
        if len(value) < 3:
            raise serializers.ValidationError(
                "The password must contain at least 3 characters."
            )
        # Check for minimum length
        # if len(value) < 8:
        #     raise serializers.ValidationError("The password must contain at least 8 characters.")
        # # Check for at least one digit
        # if not re.search(r"\d", value):
        #     raise serializers.ValidationError("The password must contain at least one digit.")
        # # Check for at least one uppercase letter
        # if not re.search(r"[A-Z]", value):
        #     raise serializers.ValidationError("The password must contain at least one uppercase letter.")
        # # Check for at least one lowercase letter
        # if not re.search(r"[a-z]", value):
        #     raise serializers.ValidationError("The password must contain at least one lowercase letter.")
        # # Check for at least one special character
        # if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", value):
        #     raise serializers.ValidationError("The password must contain at least one special character.")
        return value

    def validate_privacy_policy_accepted(self, value):
        if not value:
            raise serializers.ValidationError(
                "You must accept the privacy policy to register."
            )
        return value

    # def validate_email(self, value):
    #     if CustomUser.objects.filter(email=value).exists():
    #         raise serializers.ValidationError("A user with that email already exists.")
    #     return value

    def create(self, validated_data):
        user = CustomUser.objects.create_user(
            username=validated_data["username"],
            password=validated_data["password"],
            privacy_policy_accepted=validated_data["privacy_policy_accepted"],
            # email=validated_data["email"],
        )
        return user
