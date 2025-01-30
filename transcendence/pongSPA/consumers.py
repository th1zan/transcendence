import json
import asyncio

from channels.generic.websocket import AsyncWebsocketConsumer

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
