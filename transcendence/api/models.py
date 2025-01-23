from django.contrib.auth.models import User
from django.db import models

# from django.contrib.auth.models import AbstractUser


class Player(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, null=True, blank=True)
    pseudo = models.CharField(max_length=20)

    def __str__(self):
        return self.user.username if self.user else self.pseudo


class Tournament(models.Model):
    tournament_name = models.CharField(max_length=100)
    date = models.DateField()

    def __str__(self):
        return f"{self.tournament_name} ({self.date})"


class TournamentPlayer(models.Model):
    player = models.ForeignKey(Player, on_delete=models.CASCADE)
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE)

    def __str__(self):
        return f"{self.player} in {self.tournament}"


class PongMatch(models.Model):
    user1 = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="initiated_matches"
    )
    player1 = models.ForeignKey(
        Player, on_delete=models.CASCADE, related_name="matches_as_player1"
    )
    user2 = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
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
    winner = models.CharField(max_length=100, blank=True)
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
        return f"{self.player1} vs {self.player2} - Winner: {self.winner}"


class PongSet(models.Model):
    match = models.ForeignKey(PongMatch, on_delete=models.CASCADE, related_name="sets")
    set_number = models.IntegerField()
    player1_score = models.IntegerField(default=0)
    player2_score = models.IntegerField(default=0)

    def __str__(self):
        return f"Set {self.set_number} - {self.match.user1}: {self.user1_score}, {self.match.user2}: {self.user2_score}"


# class User(AbstractUser):
#     email = models.EmailField(max_length=255, unique=True)
#     username = models.CharField(max_length=255, unique=True)
#     password = models.CharField(max_length=255)


#     USERNAME_FIELD = "email"  # Use email for authentication
#     REQUIRED_FIELDS = []  # or "username" to Require username during registration

#     def __str__(self):
#         return self.email
