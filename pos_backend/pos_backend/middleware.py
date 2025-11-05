import logging
from django.utils.timezone import now
from django.http import HttpRequest
from custom_user.models import AccessLog

class AccessLogMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request: HttpRequest):
        response = self.get_response(request)

        # Check for 'X-Forwarded-For' header to get the real IP address when using Nginx as a reverse proxy
        ip_address = request.META.get('HTTP_X_FORWARDED_FOR')

        if ip_address:
            # If the X-Forwarded-For header exists, the client IP will be the first in the list
            ip_address = ip_address.split(',')[0]
        else:
            # Fallback to REMOTE_ADDR if X-Forwarded-For is not set
            ip_address = request.META.get('REMOTE_ADDR')

        user = request.user if request.user.is_authenticated else None
        
        # Dynamically set the action based on the HTTP method
        action = f"{request.method} to {request.path}"
        
        # Save the log entry to the database
        AccessLog.objects.create(
            user=user,
            ip_address=ip_address,
            action=action,
            path=request.path,
            status_code=response.status_code,
            timestamp=now()
        )

        return response
