import json
import asyncio

from channels.generic.websocket import AsyncWebsocketConsumer
from channels.generic.websocket import AsyncJsonWebsocketConsumer


class PongAIConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.accept()
        self.paddle_y = 200  # Position initiale de l'IA

    async def disconnect(self, close_code):
        pass

    async def receive(self, text_data):
        data = json.loads(text_data)
        
        if data["type"] == "ball_position":
            ball_y = data["y"]
            
            #Déplacer le paddle vers la balle
            self.paddle_y += (ball_y - self.paddle_y) * 0.1
            
            #Renvoyer la position mise à jour du paddle
            await self.send(text_data=json.dumps({
                "type": "update_paddle",
                "y": self.paddle_y
            }))


class NotificationConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        if self.scope["user"].is_anonymous:
            await self.close()
        else:
            self.user = self.scope["user"]
            self.group_name = f"notifications_{self.user.id}"
            await self.channel_layer.group_add(self.group_name, self.channel_name)
            await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    # This method is called when a notification needs to be sent
    async def send_notification(self, event):
        await self.send_json(event["content"])