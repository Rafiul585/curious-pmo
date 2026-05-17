import json

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import AccessToken

from django.contrib.auth import get_user_model

User = get_user_model()


class NotificationConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer that streams real-time notification events to the
    authenticated user.  The JWT access token must be passed as the `token`
    query-string parameter, e.g. `ws://<host>/ws/notifications/?token=<jwt>`.
    """

    async def connect(self):
        token_str = self._extract_token()
        if not token_str:
            await self.close(code=4001)
            return

        try:
            payload = AccessToken(token_str)
            self.user = await self._get_user(payload['user_id'])
        except (TokenError, User.DoesNotExist):
            await self.close(code=4001)
            return

        self.group_name = f'notifications_{self.user.pk}'
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        pass  # Server → client only; no inbound messages expected

    # --- channel layer event handler ---

    async def notification_message(self, event):
        """Called by channel_layer.group_send with type='notification_message'."""
        await self.send(text_data=json.dumps(event['data']))

    # --- helpers ---

    def _extract_token(self) -> str | None:
        qs = self.scope.get('query_string', b'').decode()
        for part in qs.split('&'):
            if part.startswith('token='):
                return part[6:] or None
        return None

    @database_sync_to_async
    def _get_user(self, user_id: int):
        return User.objects.get(pk=user_id)
