from django.db import models


class PongResult(models.Model):
    user1 = models.CharField(max_length=100, default="user1")
    user2 = models.CharField(max_length=100, default="Bot_AI")
    score1 = models.IntegerField(default=0)
    score2 = models.IntegerField(default=0)
    winner = models.CharField(max_length=100, blank=True)
    number_of_games = models.IntegerField(default=0)
    points_to_win = models.IntegerField(default=1)
    date_played = models.DateTimeField(auto_now_add=True)
    tournament = models.BooleanField(default=False)
    tournament_name = models.CharField(max_length=100, blank=True)

    def __str__(self):
        return f"{self.user1} vs {self.user2} - Winner: {self.winner}"
