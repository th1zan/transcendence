import json
from channels.generic.websocket import AsyncWebsocketConsumer

class PongAIConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.accept()

    async def receive(self, text_data):
        data = json.loads(text_data)
        await self.send(json.dumps({"response": "pong"}))