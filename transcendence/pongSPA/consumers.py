import json
import asyncio
from pongSPA.ai import PongAI

from channels.generic.websocket import AsyncWebsocketConsumer

class PongAIConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.accept()
        self.AI = PongAI()
        self.paddle_y = 200

    async def disconnect(self, close_code):
        pass

    async def receive(self, text_data):  #toutes les 1 sec
        data = json.loads(text_data)

        if data["type"] == "start":
            self.AI.start(data["canvas_height"], data["canvas_width"], data["paddle_height"], data["paddle_width"], data["fps"], data["step"], data["control"])
        
        if data["type"] == "ball":

            self.paddle_y = self.AI.update(data["x"], data["y"], data["speedx"], data["speedy"])

            #ball_y = data["y"]
            
            #Déplacer le paddle vers la balle
            #self.paddle_y += (ball_y - self.paddle_y) * 0.1

            #Renvoyer la position mise à jour du paddle
            await self.send(text_data=json.dumps({
                "type": "update_paddle",
                "y": self.paddle_y
            }))
        
        if data["type"] == "reset":
            self.AI.reset()
            self.paddle_y = 200
            await self.send(text_data=json.dumps({
                "type": "update_paddle",
                "y": self.paddle_y
            }))
        
        if data["type"] == "hit":
            self.AI.register_hit()
        
        if data["type"] == "score":
            self.AI.update_score(data["player_score"], data["ai_score"])
