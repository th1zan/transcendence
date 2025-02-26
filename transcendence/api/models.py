# from django.contrib.auth.models import User
import os
import random

from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.core.files import File
from django.core.management import call_command
from django.db import models
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone
from django.utils.timezone import now


class CustomUser(AbstractUser):
    email = models.EmailField(max_length=255, blank=True, null=True, default=None)
    username = models.CharField(max_length=255, unique=True)
    password = models.CharField(max_length=255)
    phone_number = models.CharField(
        max_length=15, unique=True, blank=True, null=True, default=None
    )  # We might use phone number for 2FA
    friends = models.ManyToManyField(
        "self", symmetrical=True, blank=True
    )  # Friend list (Many-to-Many)
    privacy_policy_accepted = models.BooleanField(default=False)
    is_online = models.BooleanField(default=False)  # Track online status
    last_seen = models.DateTimeField(blank=True, null=True)  # Track last active time
    date_joined = models.DateTimeField(default=timezone.now, null=True, blank=True)
    # The avatar will be saved under media/avatars/ with a random default image if none is uploaded.
    avatar = models.ImageField(upload_to="", blank=True, null=True)
    is_2fa_enabled = models.BooleanField(default=False)
    otp_secret = models.CharField(max_length=6, blank=True, null=True)  # Store OTP

    def set_random_avatar(self):
        # List of default avatar images in the 'avatars/' folder
        default_avatars = [
            "avatars/avatar1.png",
            "avatars/avatar2.png",
            "avatars/avatar3.png",
            "avatars/avatar4.png",
            "avatars/avatar5.png",
            "avatars/avatar6.png",
            "avatars/avatar7.png",
        ]

        # Choose a random avatar from the list
        chosen_avatar = random.choice(default_avatars)

        # Make the filename unique by adding the username
        new_filename = f"user_{self.id}.png"

        # Get the full path to the avatar file
        avatar_path = os.path.join(settings.MEDIA_ROOT, chosen_avatar)

        # Open the chosen avatar image file and assign its content to the user's avatar field
        with open(avatar_path, "rb") as f:
            self.avatar.save(f"avatars/{new_filename}", File(f), save=False)

        # Optionally save the user instance to commit the changes
        self.save()

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        if is_new:  # If it's a new user, save first to get the ID
            super().save(*args, **kwargs)
            if not self.avatar:  # If no avatar is set, assign a random one
                self.set_random_avatar()  # Now set the avatar with the unique filename
        else:
            super().save(*args, **kwargs)  # Save as usual if not a new user

    def update_last_seen(self):
        """Update last_seen timestamp when the user is active"""
        self.last_seen = now()
        self.save()

    # USERNAME_FIELD = "username" @ receiver(post_save, sender=Tournament)
    USERNAME_FIELD = "username"
    REQUIRED_FIELDS = []

    def __str__(self):
        return self.username


# class Player(models.Model):
#     user = models.OneToOneField(
#         settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True
#     )
#     player = models.CharField(max_length=20, unique=True)
#
#     def __str__(self):
#         return self.user.username if self.user else self.player
#
#     @property
#     def is_guest(self):
#         return self.user is None


class Player(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    player = models.CharField(max_length=20, unique=True)
    authenticated = models.BooleanField(
        default=False
    )  # New field for authentication status

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
    is_finished = models.BooleanField(default=False)
    is_finalized = models.BooleanField(
        default=False
    )  # New field to track if the tournament has been finalized

    def is_tournament_finished(self):
        # Tous les matchs du tournoi doivent avoir été joués pour que le tournoi soit considéré comme terminé
        return all(match.is_match_played() for match in self.matches.all())

    def __str__(self):
        return self.tournament_name


# class TournamentPlayer(models.Model):
#     player = models.ForeignKey(Player, on_delete=models.CASCADE)
#     tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE)
#
#     def __str__(self):
#         return f"{self.player} in {self.tournament}"


class TournamentPlayer(models.Model):
    player = models.ForeignKey(Player, on_delete=models.CASCADE)
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE)
    authenticated = models.BooleanField(default=False)
    guest = models.BooleanField(default=False)  # New field for guest status

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
    user2 = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="opponent_matches",
        null=True,
        blank=True,
    )
    player1 = models.ForeignKey(
        Player, on_delete=models.CASCADE, related_name="matches_as_player1"
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
        null=True,
        blank=True,
    )
    date_played = models.DateTimeField(auto_now_add=True)
    is_tournament_match = models.BooleanField(default=False)
    tournament = models.ForeignKey(
        "Tournament",
        on_delete=models.CASCADE,
        related_name="matches",
        null=True,
        blank=True,
    )

    def __str__(self):
        return f"{self.player1} vs {self.player2} - Winner: {self.winner or 'Not decided yet'}"

    def is_match_played(self):
        """
        Détermine si le match est joué en vérifiant les scores des sets ou le gagnant.
        """
        sets = self.sets.all()
        if sets.exists():
            for set_instance in sets:
                if (set_instance.player1_score or 0) > 0 or (
                    set_instance.player2_score or 0
                ) > 0:
                    return True
        if self.winner or (
            self.player1_sets_won > 0 and self.player1_sets_won == self.player2_sets_won
        ):
            return True
        return False


# class PongMatch(models.Model):
#     user1 = models.ForeignKey(
#         settings.AUTH_USER_MODEL,
#         on_delete=models.SET_NULL,
#         related_name="initiated_matches",
#         null=True,
#         blank=True,
#     )
#     user2 = models.ForeignKey(
#         settings.AUTH_USER_MODEL,
#         on_delete=models.SET_NULL,
#         related_name="opponent_matches",
#         null=True,
#         blank=True,
#     )
#     player1 = models.ForeignKey(
#         Player, on_delete=models.CASCADE, related_name="matches_as_player1"
#     )
#     player2 = models.ForeignKey(
#         Player, on_delete=models.CASCADE, related_name="matches_as_player2"
#     )
#     sets_to_win = models.IntegerField(default=1)
#     points_per_set = models.IntegerField(default=3)
#     player1_sets_won = models.IntegerField(default=0)
#     player2_sets_won = models.IntegerField(default=0)
#     winner = models.ForeignKey(
#         Player,
#         on_delete=models.CASCADE,
#         null=True,  # Permet de ne pas avoir de gagnant pour les matchs en cours ou non terminés
#         blank=True,  # Idem pour les formulaires et l'admin
#     )
#     date_played = models.DateTimeField(auto_now_add=True)
#     is_tournament_match = models.BooleanField(default=False)
#     tournament = models.ForeignKey(
#         Tournament,
#         on_delete=models.CASCADE,
#         related_name="matches",
#         null=True,
#         blank=True,
#     )
#     is_played = models.BooleanField(default=False)
#
#     def is_match_played(self):
#         return (
#             self.player1_sets_won != 0
#             or self.player2_sets_won != 0
#             or self.winner is not None
#         )
#
#     def __str__(self):
#         return f"{self.player1} vs {self.player2} - Winner: {self.winner or 'Not decided yet'}"


class PongSet(models.Model):
    match = models.ForeignKey(PongMatch, on_delete=models.CASCADE, related_name="sets")
    set_number = models.IntegerField()
    player1_score = models.IntegerField(default=0)
    player2_score = models.IntegerField(default=0)
    exchanges = models.IntegerField(default=0)  # Nombre d'échanges
    duration = models.FloatField(default=0.0)  # Durée en secondes

    def __str__(self):
        return f"Set {self.set_number} - {self.match.player1}: {self.player1_score}, {self.match.player2}: {self.player2_score}"


class FriendRequest(models.Model):
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="sent_friend_requests",
        on_delete=models.CASCADE,
    )
    receiver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="received_friend_requests",
        on_delete=models.CASCADE,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    STATUS_CHOICES = (
        ("pending", "Pending"),
        ("accepted", "Accepted"),
        ("declined", "Declined"),
    )
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="pending")

    class Meta:
        unique_together = ("sender", "receiver")

    def __str__(self):
        return f"{self.sender.username} -> {self.receiver.username} ({self.status})"


class Notification(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, related_name="notifications", on_delete=models.CASCADE
    )
    message = models.TextField()
    notification_type = models.CharField(
        max_length=50,
        choices=[
            ("friend_request", "Friend Request"),
            ("friend_request_declined", "Friend Request Declined"),
            ("game_invite", "Game Invite"),
        ],
    )
    created_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    def __str__(self):
        return f"Notification for {self.user.username}: {self.message[:20]}..."


@receiver(post_save, sender=PongMatch)
def update_tournament_status_on_match_update(sender, instance, **kwargs):
    # Calculer si le match est joué
    sets = instance.sets.all()
    is_played = False
    if sets.exists():
        for set_instance in sets:
            if (set_instance.player1_score or 0) > 0 or (
                set_instance.player2_score or 0
            ) > 0:
                is_played = True
                break
    if instance.winner or (
        instance.player1_sets_won > 0
        and instance.player1_sets_won == instance.player2_sets_won
    ):
        is_played = True

    # Mettre à jour le tournoi si nécessaire
    if instance.is_tournament_match and is_played:
        tournament = instance.tournament
        if tournament:
            tournament.is_finished = tournament.is_tournament_finished()
            tournament.save()
