from django.urls import re_path

from .consumers import PongAIConsumer, NotificationConsumer

websocket_urlpatterns = [
    re_path(r"ws/pong_ai/$", PongAIConsumer.as_asgi()),
	re_path(r"ws/notifications/$", NotificationConsumer.as_asgi()),
]
