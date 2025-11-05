import json
from django.http import JsonResponse, HttpResponse
from django.utils.deprecation import MiddlewareMixin
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


class PayRatePermissionMiddleware(MiddlewareMixin):
    """
    Middleware to filter pay rates based on user permissions.
    - If user is superuser OR Admin role OR has permission 3: show actual pay rates
    - Otherwise: replace pay rates with "N/A"
    """
    
    def process_response(self, request, response):
        # Only process JSON responses and API endpoints
        if not self._should_process_response(request, response):
            return response
            
        # Skip if user is not authenticated
        if not hasattr(request, 'user') or not request.user.is_authenticated:
            return response
            
        # Check if user has permission to view pay rates
        can_view_pay_rates = self._can_view_pay_rates(request.user)
        
        # If user can view pay rates, return response as is
        if can_view_pay_rates:
            return response
            
        # Filter pay rates in the response
        try:
            filtered_response = self._filter_response(response)
            return filtered_response
        except Exception as e:
            logger.error(f"Error filtering pay rates: {e}")
            return response
    
    def _should_process_response(self, request, response):
        """Check if this response should be processed"""
        # Only process JSON responses
        if not isinstance(response, (JsonResponse, HttpResponse)):
            return False
            
        # Only process API endpoints (not admin, static files, etc.)
        if not request.path.startswith('/api/') and not request.path.startswith('/auth/'):
            return False
            
        # Don't process error responses (4xx, 5xx)
        if hasattr(response, 'status_code') and response.status_code >= 400:
            return False
            
        # Check content type
        content_type = response.get('Content-Type', '')
        if 'application/json' not in content_type:
            return False
            
        return True
    
    def _can_view_pay_rates(self, user):
        """Check if user can view pay rates"""
        try:
            # Superuser can always view pay rates
            if user.is_superuser:
                return True
                
            # Admin users can view pay rates
            if hasattr(user, 'role') and user.role == 'Admin':
                return True
                
            # Check if user has permission 3
            if hasattr(user, 'permissions') and user.permissions:
                if isinstance(user.permissions, list) and 3 in user.permissions:
                    return True
                elif isinstance(user.permissions, str):
                    # Handle string-based permissions
                    permissions = json.loads(user.permissions) if user.permissions.startswith('[') else [user.permissions]
                    if 3 in permissions:
                        return True
                    
            return False
        except Exception as e:
            logger.error(f"Error checking pay rate permissions: {e}")
            return False
    
    def _filter_response(self, response):
        """Filter pay rates in the response"""
        try:
            # Parse JSON content
            data = json.loads(response.content)
            
            # Filter pay rates
            filtered_data = self._filter_pay_rates(data)
            
            # Create new response
            new_response = JsonResponse(filtered_data, safe=False)
            
            # Copy headers from original response
            for key, value in response.items():
                if key.lower() != 'content-length':  # Skip content-length as it will be recalculated
                    new_response[key] = value
                    
            return new_response
            
        except (json.JSONDecodeError, TypeError) as e:
            logger.error(f"Error parsing JSON response: {e}")
            return response
    
    def _filter_pay_rates(self, data):
        """
        Recursively filter pay rates in the data structure
        """
        if isinstance(data, dict):
            filtered_dict = {}
            for key, value in data.items():
                if key == 'pay_rate' and value is not None and value != "":
                    # Replace pay rate with "N/A"
                    filtered_dict[key] = "N/A"
                elif key == 'results' and isinstance(value, list):
                    # Handle paginated results
                    filtered_dict[key] = [self._filter_pay_rates(item) for item in value]
                elif isinstance(value, (dict, list)):
                    # Recursively filter nested objects/arrays
                    filtered_dict[key] = self._filter_pay_rates(value)
                else:
                    filtered_dict[key] = value
            return filtered_dict
            
        elif isinstance(data, list):
            # Handle arrays of objects
            return [self._filter_pay_rates(item) for item in data]
            
        else:
            # Return primitive values as is
            return data


class PayRatePermissionMiddlewareAlternative(MiddlewareMixin):
    """
    Alternative implementation that works with Django's serialization
    """
    
    def process_response(self, request, response):
        # Only process JSON responses
        if not isinstance(response, JsonResponse):
            return response
            
        # Skip if user is not authenticated
        if not hasattr(request, 'user') or not request.user.is_authenticated:
            return response
            
        # Check permissions
        can_view_pay_rates = (
            request.user.is_superuser or 
            (hasattr(request.user, 'permissions') and 3 in request.user.permissions)
        )
        
        if can_view_pay_rates:
            return response
            
        # Filter the response content
        try:
            import json
            data = json.loads(response.content)
            filtered_data = self._replace_pay_rates(data)
            response.content = json.dumps(filtered_data, ensure_ascii=False)
        except (json.JSONDecodeError, TypeError, AttributeError):
            pass
            
        return response
    
    def _replace_pay_rates(self, obj):
        """Replace pay_rate fields with 'N/A'"""
        if isinstance(obj, dict):
            return {
                key: 'N/A' if key == 'pay_rate' and value is not None 
                else self._replace_pay_rates(value) if isinstance(value, (dict, list))
                else value
                for key, value in obj.items()
            }
        elif isinstance(obj, list):
            return [self._replace_pay_rates(item) for item in obj]
        else:
            return obj
