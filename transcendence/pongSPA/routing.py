from django.urls import re_path

from .consumers import PongAIConsumer

websocket_urlpatterns = [
    re_path(r"ws/pong_ai/$", PongAIConsumer.as_asgi()),
]
