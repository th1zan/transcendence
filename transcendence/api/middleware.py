# middleware.py
from django.utils import timezone

from .models import CustomUser


class UpdateLastSeenMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        """Met à jour last_seen pour chaque requête authentifiée"""
        if request.user.is_authenticated:
            request.user.update_last_seen()
        response = self.get_response(request)
        return response
