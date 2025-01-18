from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    email = models.EmailField(max_length=255, unique=True)
    username = models.CharField(max_length=255, unique=True)
    password = models.CharField(max_length=255)

    USERNAME_FIELD = "email"  # Use email for authentication
    REQUIRED_FIELDS = []  # or "username" to Require username during registration

    def __str__(self):
        return self.email
    
# class PlayerProfile(models.Model):
#     user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
#     alias = models.CharField(max_length=100, unique=True, null=True, blank=True)
#     score = models.IntegerField(default=0)
#     is_guest = models.BooleanField(default=False)

#     def __str__(self):
#         return f"{self.alias or self.user.username}'s Profile"

class PongMatch(models.Model):
    user1 = models.CharField(max_length=100, default="user1")
    user2 = models.CharField(max_length=100, default="Bot_AI")
    sets_to_win = models.IntegerField(default=1)
    points_per_set = models.IntegerField(default=3)
    user1_sets_won = models.IntegerField(default=0)
    user2_sets_won = models.IntegerField(default=0)
    winner = models.CharField(max_length=100, blank=True)
    date_played = models.DateTimeField(auto_now_add=True)
    tournament = models.BooleanField(default=False)
    tournament_name = models.CharField(max_length=100, blank=True)

    def __str__(self):
        return f"{self.user1} vs {self.user2} - Winner: {self.winner}"


class PongSet(models.Model):
    match = models.ForeignKey(PongMatch, on_delete=models.CASCADE, related_name="sets")
    set_number = models.IntegerField()
    user1_score = models.IntegerField(default=0)
    user2_score = models.IntegerField(default=0)

    def __str__(self):
        return f"Set {self.set_number} - {self.match.user1}: {self.user1_score}, {self.match.user2}: {self.user2_score}"
