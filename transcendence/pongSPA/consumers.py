import asyncio
import json
import logging

from channels.generic.websocket import (
    AsyncJsonWebsocketConsumer,
    AsyncWebsocketConsumer,
)

logger = logging.getLogger(__name__)
from pongSPA.ai import PongAI


class PongAIConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.accept()
        self.AI = PongAI()
        self.paddle_y = 200

    async def disconnect(self, close_code):
        # pass
        logger.info(f"WebSocket déconnecté avec code: {close_code}")

    # class NotificationConsumer(AsyncJsonWebsocketConsumer):
    #     async def connect(self):
    #         if self.scope["user"].is_anonymous:
    #             await self.close()
    #         else:
    #             self.user = self.scope["user"]
    #             self.group_name = f"notifications_{self.user.id}"
    #             await self.channel_layer.group_add(self.group_name, self.channel_name)
    #             await self.accept()

    #     async def disconnect(self, close_code):
    #         await self.channel_layer.group_discard(self.group_name, self.channel_name)

    #     # This method is called when a notification needs to be sent
    #     async def send_notification(self, event):
    #         await self.send_json(
    #             {
    #                 "message": event["content"]["message"],
    #                 "notification_type": event["content"][
    #                     "notification_type"
    #                 ],  # Ensure WebSocket forwards this
    #             }
    #         )

    async def receive(self, text_data):  # toutes les 1 sec
        data = json.loads(text_data)

        if data["type"] == "start":
            self.AI.start(
                data["canvas_height"],
                data["canvas_width"],
                data["paddle_height"],
                data["fps"],
                data["step"],
                data["control"],
            )

        if data["type"] == "ball":

            self.paddle_y = self.AI.update(
                data["x"], data["y"], data["speedx"], data["speedy"]
            )

            # ball_y = data["y"]

            # Déplacer le paddle vers la balle
            # self.paddle_y += (ball_y - self.paddle_y) * 0.1

            # Renvoyer la position mise à jour du paddle
            await self.send(
                text_data=json.dumps({"type": "update_paddle", "y": self.paddle_y})
            )

        if data["type"] == "reset":
            self.AI.reset()
            self.paddle_y = 200
            await self.send(
                text_data=json.dumps({"type": "update_paddle", "y": self.paddle_y})
            )
