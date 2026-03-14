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
        print(f"WS send personal: {message}")
        await websocket.send_json(message)

    async def broadcast(self, room_id: str, message: dict):
        """Send JSON message to every connection in the room."""
        print(f"WS broadcast room={room_id} message={message}")
        connections = self.active_connections.get(room_id, [])
        dead: list[WebSocket] = []
        for connection in connections:
            try:
                await connection.send_json(message)
            except Exception as exc:
                # Connection already closed; mark for cleanup
                print(f"WS broadcast failed room={room_id} error={exc}")
                dead.append(connection)
        if dead:
            for conn in dead:
                if conn in connections:
                    connections.remove(conn)
            if not connections:
                self.active_connections.pop(room_id, None)


# global manager instance
manager = ConnectionManager()
