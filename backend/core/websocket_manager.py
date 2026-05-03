from typing import Dict, Set
from fastapi import WebSocket
import json
import asyncio

class WebSocketManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.role_map: Dict[str, str] = {}  # connection_id → role

    async def connect(self, websocket: WebSocket, connection_id: str, role: str = "citizen"):
        await websocket.accept()
        self.active_connections[connection_id] = websocket
        self.role_map[connection_id] = role

    def disconnect(self, connection_id: str):
        self.active_connections.pop(connection_id, None)
        self.role_map.pop(connection_id, None)

    async def broadcast(self, message: dict, min_role: str = "citizen"):
        """Broadcast to all connections with sufficient role."""
        role_order = ["citizen", "responder", "admin"]
        min_idx = role_order.index(min_role) if min_role in role_order else 0
        dead = []
        for cid, ws in list(self.active_connections.items()):
            conn_role = self.role_map.get(cid, "citizen")
            conn_idx = role_order.index(conn_role) if conn_role in role_order else 0
            if conn_idx >= min_idx:
                try:
                    await ws.send_text(json.dumps(message))
                except Exception:
                    dead.append(cid)
        for cid in dead:
            self.disconnect(cid)

    async def send_personal(self, connection_id: str, message: dict):
        ws = self.active_connections.get(connection_id)
        if ws:
            try:
                await ws.send_text(json.dumps(message))
            except Exception:
                self.disconnect(connection_id)

    @property
    def connection_count(self) -> int:
        return len(self.active_connections)

ws_manager = WebSocketManager()
