# management/commands/update_online_status.py
from datetime import timedelta

from api.models import CustomUser
from django.core.management.base import BaseCommand
from django.utils import timezone


class Command(BaseCommand):
    help = "Update online status based on last_seen timestamp"

    def handle(self, *args, **kwargs):
        """Passe les utilisateurs inactifs depuis plus de 5 minutes à offline"""
        five_minutes_ago = timezone.now() - timedelta(minutes=5)
        inactive_users = CustomUser.objects.filter(
            is_online=True, last_seen__lt=five_minutes_ago
        )
        count = inactive_users.update(is_online=False)
        self.stdout.write(self.style.SUCCESS(f"Updated {count} users to offline"))
