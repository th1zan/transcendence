# from django.contrib.auth.models import User
from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.timezone import now


class CustomUser(AbstractUser):
    email = models.EmailField(max_length=255, blank=True, null=True)
    username = models.CharField(max_length=255, unique=True)
    password = models.CharField(max_length=255)
    phone_number = models.CharField(
        max_length=15, blank=True, null=True
    )  # We might use phone number for 2FA
    profile_picture = models.ImageField(
        upload_to="profile_pics/", blank=True, null=True
    )  # Profile image
    friends = models.ManyToManyField("self", blank=True)  # Friend list (Many-to-Many)
    is_online = models.BooleanField(default=False)  # Track online status
    last_seen = models.DateTimeField(blank=True, null=True)  # Track last active time

    def update_last_seen(self):
        """Update last_seen timestamp when the user is active"""
        self.last_seen = now()
        self.save()

    USERNAME_FIELD = "username"  # or later put email for authentication
    REQUIRED_FIELDS = []  # or "email" to Require email during registration

    def __str__(self):
        return self.username  # Display username as user identifier


class Player(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True
    )
    player = models.CharField(max_length=20, unique=True)

    def __str__(self):
        return self.user.username if self.user else self.player

    @property
    def is_guest(self):
        return self.user is None


class Tournament(models.Model):
    tournament_name = models.CharField(max_length=100)
    date = models.DateField()
    number_of_games = models.IntegerField(default=1)
    points_to_win = models.IntegerField(default=3)

    def __str__(self):
        return self.tournament_name


class TournamentPlayer(models.Model):
    player = models.ForeignKey(Player, on_delete=models.CASCADE)
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE)

    def __str__(self):
        return f"{self.player} in {self.tournament}"


class PongMatch(models.Model):
    user1 = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="initiated_matches",
        null=True,
        blank=True,
    )
    player1 = models.ForeignKey(
        Player, on_delete=models.CASCADE, related_name="matches_as_player1"
    )
    user2 = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="opponent_matches",
        null=True,
        blank=True,
    )
    player2 = models.ForeignKey(
        Player, on_delete=models.CASCADE, related_name="matches_as_player2"
    )
    sets_to_win = models.IntegerField(default=1)
    points_per_set = models.IntegerField(default=3)
    player1_sets_won = models.IntegerField(default=0)
    player2_sets_won = models.IntegerField(default=0)
    winner = models.ForeignKey(
        Player,
        on_delete=models.CASCADE,
        null=True,  # Permet de ne pas avoir de gagnant pour les matchs en cours ou non terminés
        blank=True,  # Idem pour les formulaires et l'admin
    )
    date_played = models.DateTimeField(auto_now_add=True)
    is_tournament_match = models.BooleanField(default=False)
    tournament = models.ForeignKey(
        Tournament,
        on_delete=models.CASCADE,
        related_name="matches",
        null=True,
        blank=True,
    )

    def __str__(self):
        return f"{self.player1} vs {self.player2} - Winner: {self.winner or 'Not decided yet'}"


class PongSet(models.Model):
    match = models.ForeignKey(PongMatch, on_delete=models.CASCADE, related_name="sets")
    set_number = models.IntegerField()
    player1_score = models.IntegerField(default=0)
    player2_score = models.IntegerField(default=0)

    def __str__(self):
        return f"Set {self.set_number} - {self.match.player1}: {self.player1_score}, {self.match.player2}: {self.player2_score}"
