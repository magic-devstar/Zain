import logging
from urllib.parse import parse_qs
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from custom_user.models import Account

logger = logging.getLogger(__name__)

@database_sync_to_async
def get_user(token_key):
    try:
        token = AccessToken(token_key)
        user_id = token['user_id']
        user = Account.objects.get(id=user_id)
        logger.info(f"Middleware: Successfully authenticated user {user.username}")
        return user
    except (InvalidToken, TokenError, Account.DoesNotExist, KeyError) as e:
        logger.warning(f"Middleware: Failed to authenticate token. Error: {e}")
        return AnonymousUser()

class TokenAuthMiddleware:
    """
    Custom middleware for Django Channels to authenticate users using JWT tokens
    passed in the query string. This middleware adds logging to trace the
    connection lifecycle.
    """
    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        try:
            query_string = scope.get("query_string", b"").decode("utf-8")
            query_params = parse_qs(query_string)
            token = query_params.get("access", [None])[0]

            if token:
                scope['user'] = await get_user(token)
            else:
                logger.warning("Middleware: No token found in query string.")
                scope['user'] = AnonymousUser()
        except Exception as e:
            logger.error(f"Middleware Error: Exception during authentication: {e}", exc_info=True)
            scope['user'] = AnonymousUser()
        
        logger.info(f"Middleware: Handing off connection for user: {scope.get('user', 'Anonymous')}")

        try:
            return await self.inner(scope, receive, send)
        finally:
            logger.info(f"Middleware: Connection teardown for user: {scope.get('user', 'Anonymous')}. This should appear AFTER the consumer's disconnect logs.") 