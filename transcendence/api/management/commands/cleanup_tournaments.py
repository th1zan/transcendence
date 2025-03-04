# api/management/commands/cleanup_tournaments.py
from django.core.management.base import BaseCommand
from django.utils import timezone

from ...models import Tournament, TournamentPlayer


class Command(BaseCommand):
    help = "Clean up unfinalized tournaments older than 7 days"

    def handle(self, *args, **options):
        max_age = timezone.now() - timezone.timedelta(days=1)
        unfinalized_tournaments = Tournament.objects.filter(
            is_finalized=False, date__lt=max_age
        )

        for tournament in unfinalized_tournaments:
            TournamentPlayer.objects.filter(tournament=tournament).delete()
            tournament.delete()

        self.stdout.write(
            self.style.SUCCESS(
                f"Cleaned up {unfinalized_tournaments.count()} unfinalized tournaments"
            )
        )
