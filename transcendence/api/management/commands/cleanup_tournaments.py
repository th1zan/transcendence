# api/management/commands/cleanup_tournaments.py

from django.core.management.base import BaseCommand
from django.utils import timezone

from ...models import Tournament, TournamentPlayer


class Command(BaseCommand):
    help = "Clean up unfinalized tournaments"

    def handle(self, *args, **options):
        # Define how old an unfinalized tournament should be to be considered for deletion
        # max_age = timezone.now() - timezone.timedelta(
        #     days=7
        # )  # Example: delete tournaments older than 7 days if not finalized
        unfinalized_tournaments = Tournament.objects.filter(
            is_finalized=False
            # is_finalized=False, date__lt=max_age
        )

        for tournament in unfinalized_tournaments:
            # Delete associated TournamentPlayer entries
            TournamentPlayer.objects.filter(tournament=tournament).delete()
            # Then delete the tournament
            tournament.delete()

        self.stdout.write(
            self.style.SUCCESS(
                f"Cleaned up {unfinalized_tournaments.count()} unfinalized tournaments"
            )
        )
