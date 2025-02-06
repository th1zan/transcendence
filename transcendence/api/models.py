# from django.contrib.auth.models import User
from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from django.utils.timezone import now


class CustomUser(AbstractUser):
    email = models.EmailField(max_length=255, blank=True, null=True)
    username = models.CharField(max_length=255, unique=True)
    password = models.CharField(max_length=255)
    phone_number = models.CharField(max_length=15, unique=True, blank=True, null=True)  # We might use phone number for 2FA
    avatar = models.ImageField(upload_to="avatars/", default='avatars/default.png', blank=True, null=True) # The avatar will be saved under media/avatars/ with a default image if none is uploaded.
    friends = models.ManyToManyField("self", symmetrical=True, blank=True)  # Friend list (Many-to-Many)
    privacy_policy_accepted = models.BooleanField(default=False)
    is_online = models.BooleanField(default=False)  # Track online status
    last_seen = models.DateTimeField(blank=True, null=True)  # Track last active time
    date_joined = models.DateTimeField(default=timezone.now, null=True, blank=True)

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


class FriendRequest(models.Model):
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='sent_friend_requests',
        on_delete=models.CASCADE
    )
    receiver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='received_friend_requests',
        on_delete=models.CASCADE
    )
    created_at = models.DateTimeField(auto_now_add=True)
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('declined', 'Declined'),
    )
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')

    class Meta:
        unique_together = ('sender', 'receiver')

    def __str__(self):
        return f"{self.sender.username} -> {self.receiver.username} ({self.status})"


class Notification(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='notifications',
        on_delete=models.CASCADE
    )
    message = models.TextField()
    notification_type = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    def __str__(self):
        return f"Notification for {self.user.username}: {self.message[:20]}..."