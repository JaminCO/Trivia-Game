from typing import Dict, List
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        # mapping from room_id to list of WebSocket connections
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, room_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.setdefault(room_id, []).append(websocket)

    def disconnect(self, room_id: str, websocket: WebSocket):
        connections = self.active_connections.get(room_id)
        if connections and websocket in connections:
            connections.remove(websocket)
            if not connections:
                # clean up empty list
                del self.active_connections[room_id]

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        await websocket.send_json(message)

    async def broadcast(self, room_id: str, message: dict):
        """Send JSON message to every connection in the room."""
        for connection in self.active_connections.get(room_id, []):
            await connection.send_json(message)


# global manager instance
manager = ConnectionManager()
