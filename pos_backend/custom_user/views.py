from rest_framework import status
from rest_framework.response import Response
from django.contrib.auth.hashers import make_password
from rest_framework.permissions import AllowAny
from .models import Account, StoreProfile, UserPreference, UserFavorite
from .tasks import send_password_reset_email_task
from rest_framework.views import APIView
from .serializers import *
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.views import TokenViewBase
from django.contrib.auth import logout
from rest_framework.permissions import IsAuthenticated
from django.utils.encoding import force_bytes
from django.core.mail import send_mail
from django.utils.http import urlsafe_base64_encode
import requests
from commonapp.models import Notification, PartnerCustomerLink
import os
from django.core.files.base import ContentFile
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework import generics
from rest_framework.generics import CreateAPIView, UpdateAPIView, DestroyAPIView
from django.db.models import Q, Subquery, OuterRef
from django.db.models.functions import Coalesce
from django.db.models import Value
from django.conf import settings
from django.template.loader import render_to_string
from django.core.mail import EmailMultiAlternatives
from rest_framework.decorators import api_view, permission_classes
import json
from rest_framework.decorators import action
from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied, ValidationError as DRFValidationError
from rest_framework import serializers
from django.contrib.auth.tokens import default_token_generator
from django.contrib.auth.password_validation import validate_password
import logging
from django.utils import timezone

logger = logging.getLogger(__name__)

# Regsiter View
# class RegisterUserView(APIView):
#     permission_classes = [AllowAny]

#     def post(self, request, *args, **kwargs):
#         data = request.data
#         try:
#             # Ensure required fields are present in the request
#             username = data.get("username")
#             email = data.get("email")
#             password = data.get("password")

#             if not username or not email or not password:
#                 return Response(
#                     {"error": "Please provide username, email, and password"},
#                     status=status.HTTP_400_BAD_REQUEST,
#                 )

#             # Check if the email already exists
#             if Account.objects.filter(email=email).exists():
#                 return Response(
#                     {"detail": "User with this email already exists."},
#                     status=status.HTTP_400_BAD_REQUEST,
#                 )

#             # Create the new user
#             user = Account.objects.create(
#                 username=username,
#                 email=email,
#                 phone_number=data.get("phone", ""),
#                 password=make_password(password),
#                 role=data["role"],
#             )

#             # Return user data along with token
#             serializer = UserSerializerWithToken(user, many=False)
#             return Response(serializer.data, status=status.HTTP_201_CREATED)

#         except Exception as e:
#             # Handle any unexpected errors
#             print(e)
#             return Response(
#                 {"detail": "An error occurred during registration."},
#                 status=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             )

from django.db import transaction
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.contrib.auth.hashers import make_password
from .serializers import UserSerializerWithToken, UserPreferenceSerializer
from .models import Account, StoreProfile, UserPreference, UserFavorite
from .serializers import (
    AccountSerializer, StoreProfileSerializer, StoreProfileUpdateSerializer, UserPreferenceSerializer, 
    UserFavoriteSerializer
)


class RegisterUserView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        data = request.data
        try:
            # Required fields for Account
            username = data.get("username")
            email = data.get("email")
            password = data.get("password")
            phone_number = data.get("phone_number")

            # Required fields for StoreProfile
            store_name = data.get("store_name")
            store_address = data.get("store_address")
            store_city = data.get("store_city")
            store_zip_code = data.get("store_zip_code")
            store_billing_email = data.get("store_billing_email")
            store_phone = data.get("store_phone")
            owner_name = data.get("owner_name")
            owner_email = data.get("owner_email")
            owner_phone = data.get("owner_phone")
            distributor_name = data.get("distributor_name")
            distributor_email = data.get("distributor_email")
            distributor_phone = data.get("distributor_phone")
            manager_name = data.get("manager_name")
            manager_email = data.get("manager_email")
            manager_phone = data.get("manager_phone")
            open_time = data.get("open_time")
            close_time = data.get("close_time")
            driver_license = request.FILES.get("driver_license")
            
            # Parse time strings if they are provided
            from django.utils.dateparse import parse_time
            parsed_open_time = None
            parsed_close_time = None
            
            if open_time:
                if isinstance(open_time, str):
                    try:
                        parsed_open_time = parse_time(open_time)
                    except (ValueError, TypeError):
                        logger.warning(f"Could not parse open_time: {open_time}")
                        parsed_open_time = None
            
            if close_time:
                if isinstance(close_time, str):
                    try:
                        parsed_close_time = parse_time(close_time)
                    except (ValueError, TypeError):
                        logger.warning(f"Could not parse close_time: {close_time}")
                        parsed_close_time = None

            # Validate required fields (distributor fields are optional)
            required_fields = {
                "username": username,
                "email": email,
                "password": password,
                "phone_number": phone_number,
                "store_name": store_name,
                "store_address": store_address,
                "store_city": store_city,
                "store_zip_code": store_zip_code,
                "store_billing_email": store_billing_email,
                "store_phone": store_phone,
                "owner_name": owner_name,
                "owner_email": owner_email,
                "owner_phone": owner_phone,
                "manager_name": manager_name,
                "manager_email": manager_email,
                "manager_phone": manager_phone,
                "open_time": open_time,
                "close_time": close_time,
            }
            
            missing_fields = [field for field, value in required_fields.items() if value is None or value == ""]
            if missing_fields:
                return Response(
                    {"error": f"Missing required fields: {', '.join(missing_fields)}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            preferred_software = {}
            if "preferred_software" in request.data:
                try:
                    preferred_software = json.loads(request.data["preferred_software"])
                except json.JSONDecodeError:
                    return Response(
                        {"error": "Invalid preferred_software format"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            # Check if the email already exists (case-insensitive) - if it does, don't create anything
            email_lower = email.lower().strip()
            if Account.objects.filter(email__iexact=email_lower).exists():
                return Response(
                    {"error": "Account with this email already exists.", "detail": "account with this email already exists."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Create Account and Store in a transaction
            try:
                with transaction.atomic():
                    # Create the new user account
                    user = Account.objects.create(
                        username=username,
                        email=email,
                        phone_number=phone_number,
                        password=make_password(password),
                        is_active=False,
                        role="Deactivated",
                        license=driver_license,
                    )

                    # Create a store for the user (using StoreProfile model)
                    store = StoreProfile.objects.create(
                        customer=user,
                        store_name=store_name,
                        store_address=store_address,
                        store_city=store_city,
                        store_zip_code=store_zip_code,
                        store_billing_email=store_billing_email,
                        store_phone=store_phone,
                        owner_name=owner_name,
                        owner_email=owner_email,
                        owner_phone=owner_phone,
                        distributor_name=distributor_name or "",
                        distributor_email=distributor_email or "",
                        distributor_phone=distributor_phone or "",
                        manager_name=manager_name or "",
                        manager_email=manager_email or "",
                        manager_phone=manager_phone or "",
                        open=parsed_open_time,
                        close=parsed_close_time,
                        preferred_software=preferred_software if isinstance(preferred_software, dict) else {},
                    )

                    user.save()

                    # Return user data along with token
                    serializer = UserSerializerWithToken(user, many=False)
                    return Response(serializer.data, status=status.HTTP_201_CREATED)
            
            except Exception as e:
                # Log the full error for debugging
                logger.error(f"Registration transaction error: {str(e)}", exc_info=True)
                # Re-raise to be caught by outer exception handler
                raise

        except DRFValidationError as e:
            # Handle serializer validation errors
            logger.error(f"Registration validation error: {str(e)}")
            error_detail = e.detail if hasattr(e, 'detail') else str(e)
            return Response(
                {"error": "Validation error", "detail": error_detail},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except serializers.ValidationError as e:
            # Handle serializer validation errors
            logger.error(f"Registration serializer validation error: {str(e)}")
            error_detail = e.detail if hasattr(e, 'detail') else str(e)
            return Response(
                {"error": "Validation error", "detail": error_detail},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            # Log the full error for debugging
            logger.error(f"Registration error: {str(e)}", exc_info=True)
            import traceback
            error_trace = traceback.format_exc()
            logger.error(f"Full traceback: {error_trace}")
            
            # Return a more user-friendly error message
            error_message = str(e)
            if "UNIQUE constraint" in error_message or "duplicate key" in error_message.lower():
                return Response(
                    {"error": "An account with this information already exists.", "detail": "duplicate entry"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            return Response(
                {"error": "An error occurred during registration. Please try again.", "detail": error_message},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# ///////////////////////////////////////////////////////////////


# Login view
class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer


# /////////////////////////////////////////////////////////


# Login and Signup with google


class GoogleLoginView(APIView):
    def post(self, request):
        print("-------------------- Google Login Attempt --------------------")
        token = request.data.get("token")
        login_type = request.data.get("login_type", "login")
        print("login type", login_type)
        role = request.data.get("role")
        print(role)

        if not token:
            return Response(
                {"error": "No token provided."}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            response = requests.get(
                "https://oauth2.googleapis.com/tokeninfo", params={"id_token": token}
            )
            if response.status_code != 200:
                return Response(
                    {"error": "Invalid token."}, status=status.HTTP_400_BAD_REQUEST
                )

            idinfo = response.json()
            email = idinfo.get("email")
            name = idinfo.get("name", "")
            picture_url = idinfo.get("picture", "")

            try:
                if login_type in ["login", "signup"]:
                    user = Account.objects.get(email=email)
                    print("User found in database")
                    refresh = RefreshToken.for_user(user)
                    access_token = str(refresh.access_token)
                    refresh_token = str(refresh)

                    return Response(
                        {
                            "id": user.id,
                            "email": user.email,
                            "username": user.username,
                            "role": user.role,
                            "profile_image": (
                                user.profile_image.url if user.profile_image else None
                            ),
                            "token": access_token,
                            "is_superuser": user.is_superuser,
                            "refresh": refresh_token,
                            "permissions": user.permissions,
                        },
                        status=status.HTTP_200_OK,
                    )
                else:
                    return Response(
                        {"error": "User already exists. Please log in instead."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            except Account.DoesNotExist:
                if login_type == "signup":
                    print("User not found, creating new user")
                    user = Account(email=email, username=name, role=role)

                    if not user.profile_image and picture_url:
                        response = requests.get(picture_url)
                        if response.status_code == 200:
                            filename = os.path.basename(picture_url)
                            user.profile_image.save(
                                filename, ContentFile(response.content), save=True
                            )
                            print("Profile image downloaded and saved")

                    user.set_unusable_password()
                    user.save()

                    refresh = RefreshToken.for_user(user)
                    access_token = str(refresh.access_token)
                    refresh_token = str(refresh)

                    return Response(
                        {
                            "message": "Google signup successful",
                            "id": user.id,
                            "email": user.email,
                            "username": user.username,
                            "role": user.role,
                            "profile_image": (
                                user.profile_image.url if user.profile_image else None
                            ),
                            "token": access_token,
                            "is_superuser": user.is_superuser,
                            "refresh": refresh_token,
                            "permissions": user.permissions,
                        },
                        status=status.HTTP_200_OK,
                    )
                else:
                    return Response(
                        {"error": "User not found. Please sign up first."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

        except Exception as e:
            print(f"An error occurred: {str(e)}")
            return Response(
                {"error": f"An error occurred: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )


# //////////////////////////////////////


# Access Token refresh View
class MyTokenRefreshView(TokenViewBase):
    serializer_class = MyTokenRefreshSerializer


# ///////////////////////////////////////////////////////////////


# Logout View
class LogoutUserView(APIView):
    def post(self, request):
        try:
            # Log out the user and remove session-related cookies
            logout(request)

            # Prepare response and delete relevant cookies
            response = Response(
                {"message": "Logout successful"}, status=status.HTTP_200_OK
            )
            response.delete_cookie("csrftoken")
            response.delete_cookie("sessionid")
            # response.delete_cookie('jwt')  # Uncomment if using JWT in cookies

            return response
        except Exception as e:
            return Response(
                {"error": "Logout failed", "details": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )


# ////////////////////////////////////////////////////////

# Get or Update User profile


class UpdateUserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = Account.objects.get(pk=request.user.pk)
        serializer = AccountSerializer(user)
        return Response(serializer.data)

    def patch(self, request):
        user = Account.objects.get(pk=request.user.pk)
        serializer = AccountSerializer(user, data=request.data, partial=True)

        if serializer.is_valid():
            # Check for unique email (case-insensitive)
            if "email" in serializer.validated_data:
                email = serializer.validated_data["email"]
                email_lower = email.lower().strip()
                if Account.objects.filter(email__iexact=email_lower).exclude(pk=user.pk).exists():
                    from rest_framework import serializers
                    raise serializers.ValidationError({
                        "email": ["account with this email already exists."]
                    })
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ////////////////////////////////////////////////////////////////////////


class ForgotPasswordView(APIView):
    def post(self, request):
        email = request.data.get("email")

        # Try to extract frontend URL from request headers
        frontend_url = request.headers.get("Origin") or request.headers.get("Referer")

        try:
            user = Account.objects.get(email=email)

            token = default_token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))

            reset_link = f"{frontend_url}/reset-password/{uid}/{token}/"

            # 🟢 Offload to Celery
            try:
                send_password_reset_email_task.delay(user.username, user.email, reset_link)
            except (ConnectionError, OSError) as e:
                # Gracefully handle Celery/Redis connection errors
                logger.warning(f"Failed to queue password reset email task (Celery/Redis may be unavailable): {e}")
                # Optionally send email synchronously as fallback
                # Note: This is a fallback - in production, Redis/Celery should be available
            except Exception as e:
                # Catch any other exceptions to prevent password reset from failing
                logger.warning(f"Failed to queue password reset email task: {e}")

            return Response(
                {
                    "message": "Password reset instructions have been sent to your email."
                },
                status=status.HTTP_200_OK,
            )

        except Account.DoesNotExist:
            # For security reasons, don't reveal whether the email exists or not
            return Response(
                {"message": "Account not Found !"},
                status=status.HTTP_200_OK,
            )
        except Exception as e:
            # Log the error but don't expose details to the client
            return Response(
                {"detail": "Unable to process your request at this time."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# ////////////////////////////////////////////

# Set New Password  View


class SetNewPasswordView(APIView):
    def post(self, request):
        serializer = SetPasswordSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(
                {"message": "Password has been reset successfully."},
                status=status.HTTP_200_OK,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# /////////////////////////Extras


class FirstLoginSetPasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        new_password1 = request.data.get("new_password1")
        new_password2 = request.data.get("new_password2")

        if not new_password1 or not new_password2:
            return Response({"detail": "Both password fields are required."}, status=status.HTTP_400_BAD_REQUEST)

        if new_password1 != new_password2:
            return Response({"detail": "Passwords do not match."}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user

        try:
            validate_password(new_password1, user=user)
        except Exception as e:
            # e can be a list of messages; normalize to list of strings
            messages = getattr(e, 'messages', [str(e)])
            return Response({"password": messages}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password1)
        user.first_login_completed_at = timezone.now()
        user.save()

        # Issue fresh tokens and return user info
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)

        return Response(
            {
                "message": "Password updated. First login complete.",
                "id": user.id,
                "email": user.email,
                "username": user.username,
                "role": user.role,
                "profile_image": (user.profile_image.url if user.profile_image else None),
                "token": access_token,
                "refresh": refresh_token,
            },
            status=status.HTTP_200_OK,
        )


# Get Technicians
class TechnicianUserListView(generics.ListAPIView):
    serializer_class = AccountSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Account.objects.filter(
            role__in=["Technician", "Warehouse Technician"], is_active=True
        )

    def paginate_queryset(self, queryset):
        if self.request.query_params.get("all") == "true":
            return None  # disables pagination
        return super().paginate_queryset(queryset)


# Get External Users
class ExternalUserListView(generics.ListAPIView):
    serializer_class = AccountSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Account.objects.filter(role__in=["External User"])
        # Fetch query parameters
        status = self.request.query_params.get("status")
        search = self.request.query_params.get("search")
        is_active = self.request.query_params.get("is_active")
        
        if is_active:
            if is_active.lower() == "true":
                queryset = queryset.filter(is_active=True)
            elif is_active.lower() == "false":
                queryset = queryset.filter(is_active=False)

        # Filter by status (active/inactive)
        if status:
            if status.lower() == "active":
                queryset = queryset.filter(is_active=True)
            elif status.lower() == "inactive":
                queryset = queryset.filter(is_active=False)

        # Filter by search term (e.g., username, email, phone_number)
        if search:
            queryset = queryset.filter(
                Q(username__icontains=search)
                | Q(email__icontains=search)
                | Q(phone_number__icontains=search)
            )

        return queryset

    def paginate_queryset(self, queryset):
        if self.request.query_params.get("all") == "true":
            return None  # disables pagination
        return super().paginate_queryset(queryset)


# ///////////////////


# Create and manage User Accounts
class AccountCreateView(CreateAPIView):
    """
    API view to create a new user.
    """

    queryset = Account.objects.all()
    serializer_class = AccountSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        """Handle user creation"""
        # Check for case-insensitive email duplicates before creating
        email = request.data.get("email")
        if email:
            # Convert email to lowercase for case-insensitive check
            email_lower = email.lower().strip()
            
            # Check if any user exists with this email (case-insensitive)
            existing_user = Account.objects.filter(email__iexact=email_lower).first()
            if existing_user:
                from rest_framework import serializers
                raise serializers.ValidationError({
                    "email": ["account with this email already exists."]
                })
        
        # Call the parent create method
        response = super().create(request, *args, **kwargs)

        # If a vending customer creates a partner, create a PartnerCustomerLink
        if (
            response.status_code == status.HTTP_201_CREATED
            and self.request.user.role == "Vending Customer"
            and (request.data.get("role") == "Partner" or request.data.get("role") == "Employee")
        ):
            try:
                # Get store_id from request - REQUIRED
                store_id = request.data.get("store_id")
                if not store_id:
                    raise ValueError("store_id is required when creating a partner/employee as a vending customer")
                
                PartnerCustomerLink.objects.create(
                    partner_id=response.data["id"],
                    vending_customer=self.request.user,
                    store_id=store_id,
                    created_by=self.request.user,
                    is_active=True,
                )
            except Exception as e:
                # Log the error but don't fail the request since user was created
                print(f"Error creating PartnerCustomerLink: {str(e)}")

        return response


class AccountRetrieveUpdateView(generics.RetrieveUpdateAPIView):
    """
    API view to retrieve or update a user.
    """

    queryset = Account.objects.all()
    serializer_class = AccountSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        """
        Returns the Account object based on the 'pk' passed in the URL.
        """
        pk = self.kwargs.get("pk")
        try:
            return Account.objects.get(pk=pk)
        except Account.DoesNotExist:
            return None

    def retrieve(self, request, *args, **kwargs):
        """
        Retrieves user information based on pk.
        """
        user = self.get_object()
        if not user:
            return Response(
                {"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND
            )
        serializer = AccountSerializer(user, context={'request': request})
        return Response(serializer.data)

    def update(self, request, *args, **kwargs):
        """
        Update user and handle PartnerCustomerLink store update if needed
        """
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        if not instance:
            return Response(
                {"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if updating a partner/employee and store_id is provided
        store_id = request.data.get('store_id')
        if store_id and instance.role in ['Partner', 'Employee']:
            try:
                # Update the PartnerCustomerLink store
                link = PartnerCustomerLink.objects.filter(
                    partner=instance,
                    is_active=True
                ).first()
                
                if link:
                    link.store_id = store_id
                    link.save()
            except Exception as e:
                print(f"Error updating PartnerCustomerLink store: {str(e)}")
        
        # Call parent update
        return super().update(request, *args, **kwargs)


class AccountPermissionsView(APIView):
    """Fetch and update numeric permissions list for a user account."""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            user = Account.objects.get(pk=pk)
        except Account.DoesNotExist:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        return Response({"permissions": user.permissions or []}, status=status.HTTP_200_OK)

    def patch(self, request, pk):
        # Only Admins and Managers can update others' permissions
        if request.user.role not in ["Admin", "Manager"]:
            raise PermissionDenied("You are not allowed to update permissions.")

        try:
            user = Account.objects.get(pk=pk)
        except Account.DoesNotExist:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        permissions = request.data.get("permissions", [])
        if not isinstance(permissions, list) or not all(isinstance(x, int) for x in permissions):
            return Response({"permissions": "Must be a list of integers"}, status=status.HTTP_400_BAD_REQUEST)

        user.permissions = permissions
        user.save(update_fields=["permissions"])
        return Response({"permissions": user.permissions}, status=status.HTTP_200_OK)


class AccountUpdateLicenseView(APIView):
    """
    API view to update the license file stored at the Account level.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, pk=None):
        try:
            user = Account.objects.get(pk=pk)

            license_file = request.FILES.get("license")
            if not license_file:
                return Response(
                    {"detail": "No license file provided."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Update the license file at the Account level
            user.license = license_file
            user.save()

            return Response(
                {
                    "detail": "License updated successfully.",
                    "license_url": (user.license.url if user.license else None),
                },
                status=status.HTTP_200_OK,
            )

        except Account.DoesNotExist:
            return Response(
                {"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"detail": f"An error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# /////////////////////////////////////


# Delete user
class AccountDeleteView(DestroyAPIView):
    queryset = Account.objects.all()
    permission_classes = [IsAuthenticated]
    lookup_field = "pk"  # URL pattern: /auth/accounts/delete/<pk>/

    def delete(self, request, *args, **kwargs):
        user = self.get_object()
        user.delete()
        return Response(
            {"detail": "User deleted successfully."}, status=status.HTTP_204_NO_CONTENT
        )


# ////////////////////////////////////////////////////////

# Get All users of filter users by role


class AccountListView(generics.ListAPIView):
    """
    API view to list all users with filters: role, status, search.
    """

    serializer_class = AccountSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Account.objects.exclude(id=user.id)

        # Fetch query parameters
        role = self.request.query_params.get("role")
        status = self.request.query_params.get("status")
        search = self.request.query_params.get("search")
        exclude_role = self.request.query_params.get("exclude")
        exclude_list = self.request.query_params.get("exclude_list")
        ordering = self.request.query_params.get("ordering")
        is_active = self.request.query_params.get("is_active")
        
        if is_active:
            if is_active.lower() == "true":
                queryset = queryset.filter(is_active=True)
            elif is_active.lower() == "false":
                queryset = queryset.filter(is_active=False)

        # Exclude specific roles
        if exclude_role:
            if exclude_role.lower() == "customers":
                queryset = queryset.exclude(
                    role__in=["Service Customer", "Vending Customer"]
                )
            else:
                queryset = queryset.exclude(role=exclude_role)

        # Exclude multiple roles from list
        if exclude_list:
            try:
                # Parse the comma-separated list of roles
                roles_to_exclude = [role.strip() for role in exclude_list.split(',') if role.strip()]
                if roles_to_exclude:
                    queryset = queryset.exclude(role__in=roles_to_exclude)
            except Exception as e:
                # If parsing fails, log the error but continue
                print(f"Error parsing exclude_list parameter: {e}")

        # Filter by role if provided
        if role:
            # If requesting partners and user is a vending customer, only show linked partners
            if role == "Partner" and user.role == "Vending Customer":
                linked_partner_ids = PartnerCustomerLink.objects.filter(
                    vending_customer=user, is_active=True
                ).values_list("partner_id", flat=True)
                queryset = queryset.filter(role=role, id__in=linked_partner_ids)
            else:
                queryset = queryset.filter(role=role)

        # Filter by status (active/inactive)
        if status:
            if status.lower() == "active":
                queryset = queryset.filter(is_active=True)
            elif status.lower() == "inactive":
                queryset = queryset.filter(is_active=False)

        if user.role == "Vending Customer":
            linked_partner_ids = PartnerCustomerLink.objects.filter(
                vending_customer=user, is_active=True
            ).values_list("partner_id", flat=True)
            queryset = queryset.filter(id__in=linked_partner_ids)

        # Filter by search term (e.g., username, email, phone_number)
        if search:
            queryset = queryset.filter(
                Q(username__icontains=search)
                | Q(email__icontains=search)
                | Q(phone_number__icontains=search)
            )

        # Apply ordering
        if ordering:
            logger.info(f"Applying AccountListView ordering: {ordering}")
            try:
                # Handle special cases for store-based sorting
                if ordering == 'store_names':
                    # Sort by the first store name for each user
                    queryset = queryset.annotate(
                        first_store_name=Coalesce(
                            Subquery(
                                StoreProfile.objects.filter(
                                    customer=OuterRef('pk')
                                ).order_by('store_name').values('store_name')[:1]
                            ),
                            Value('')  # Default value for users without stores
                        )
                    ).order_by('first_store_name')
                elif ordering == '-store_names':
                    # Sort by the first store name for each user (descending)
                    queryset = queryset.annotate(
                        first_store_name=Coalesce(
                            Subquery(
                                StoreProfile.objects.filter(
                                    customer=OuterRef('pk')
                                ).order_by('store_name').values('store_name')[:1]
                            ),
                            Value('')  # Default value for users without stores
                        )
                    ).order_by('-first_store_name')
                else:
                    # For other fields, use standard ordering
                    queryset = queryset.order_by(ordering)
            except Exception as e:
                logger.warning(f"Invalid AccountListView ordering parameter: {ordering}, error: {str(e)}")
                # Fallback to default ordering
                queryset = queryset.order_by('username')
        else:
            # Default ordering
            queryset = queryset.order_by('username')

        return queryset

    def paginate_queryset(self, queryset):
        if self.request.query_params.get("all", "false").lower() == "true":
            return None
        return super().paginate_queryset(queryset)


class AccountDetailView(generics.RetrieveAPIView):
    """
    API view to retrieve a single user by ID.
    """

    queryset = Account.objects.all()
    serializer_class = AccountSerializer
    permission_classes = [IsAuthenticated]


# Get All Active  Customers


class ActiveCustomers(generics.ListAPIView):
    """
    API view to list all Active Customers with filters: status, search.
    """

    serializer_class = AccountSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Account.objects.exclude(id=self.request.user.id)
        queryset = queryset.filter(role__in=["Vending Customer", "Service Customer"]).distinct()

        # Fetch query parameters
        role = self.request.query_params.get("role")
        status = self.request.query_params.get("status")
        search = self.request.query_params.get("search")
        ordering = self.request.query_params.get("ordering")
        is_active = self.request.query_params.get("is_active")

        if role:
            queryset = queryset.filter(role=role)

        # Filter by status (active/inactive)
        if status:
            if status.lower() == "active":
                queryset = queryset.filter(is_active=True)
            elif status.lower() == "inactive":
                queryset = queryset.filter(is_active=False)

        if is_active:
            if is_active.lower() == "true":
                queryset = queryset.filter(is_active=True)
            elif is_active.lower() == "false":
                queryset = queryset.filter(is_active=False)

        # Filter by search term (e.g., username, email, phone_number, and store profile fields)
        if search:
            queryset = queryset.filter(
                Q(username__icontains=search)
                | Q(email__icontains=search)
                | Q(phone_number__icontains=search)
                | Q(store_profiles__store_name__icontains=search)
                | Q(store_profiles__store_address__icontains=search)
                | Q(store_profiles__store_city__icontains=search)
                | Q(store_profiles__store_zip_code__icontains=search)
                | Q(store_profiles__store_billing_email__icontains=search)
                | Q(store_profiles__store_phone__icontains=search)
                | Q(store_profiles__owner_name__icontains=search)
                | Q(store_profiles__owner_email__icontains=search)
                | Q(store_profiles__owner_phone__icontains=search)
                | Q(store_profiles__distributor_name__icontains=search)
                | Q(store_profiles__distributor_email__icontains=search)
                | Q(store_profiles__distributor_phone__icontains=search)
                | Q(store_profiles__manager_name__icontains=search)
                | Q(store_profiles__manager_email__icontains=search)
                | Q(store_profiles__manager_phone__icontains=search)
            ).distinct()

        # Apply ordering
        if ordering:
            logger.info(f"Applying ActiveCustomers ordering: {ordering}")
            try:
                # Handle special cases for store-based sorting
                if ordering == 'store_names':
                    logger.info("Applying store_names ordering for ActiveCustomers")
                    # Sort by the first store name for each customer
                    queryset = queryset.annotate(
                        first_store_name=Coalesce(
                            Subquery(
                                StoreProfile.objects.filter(
                                    customer=OuterRef('pk')
                                ).order_by('store_name').values('store_name')[:1]
                            ),
                            Value('')  # Default value for users without stores
                        )
                    ).order_by('first_store_name')
                    logger.info(f"ActiveCustomers queryset SQL: {queryset.query}")
                elif ordering == '-store_names':
                    logger.info("Applying -store_names ordering for ActiveCustomers")
                    # Sort by the first store name for each customer (descending)
                    queryset = queryset.annotate(
                        first_store_name=Coalesce(
                            Subquery(
                                StoreProfile.objects.filter(
                                    customer=OuterRef('pk')
                                ).order_by('store_name').values('store_name')[:1]
                            ),
                            Value('')  # Default value for users without stores
                        )
                    ).order_by('-first_store_name')
                    logger.info(f"ActiveCustomers queryset SQL: {queryset.query}")
                else:
                    # For other fields, use standard ordering
                    logger.info(f"Applying standard ordering '{ordering}' for ActiveCustomers")
                    queryset = queryset.order_by(ordering)
            except Exception as e:
                logger.error(f"Error in ActiveCustomers ordering: {ordering}, error: {str(e)}")
                logger.exception("Full traceback:")
                # Fallback to default ordering
                queryset = queryset.order_by('username')
        else:
            # Default ordering
            queryset = queryset.order_by('username')

        return queryset

    def list(self, request, *args, **kwargs):
        """Override list method to add debugging for store sorting"""
        ordering = request.query_params.get("ordering")
        if ordering and 'store_names' in ordering:
            logger.info(f"ActiveCustomers list called with ordering: {ordering}")
            logger.info(f"Request user: {request.user.username}")
            logger.info(f"Request query params: {request.query_params}")
        
        return super().list(request, *args, **kwargs)


# Get All Inactive  Customers


class InActiveCustomers(generics.ListAPIView):
    """
    API view to list all Active Customers with filters: status, search.
    """

    serializer_class = AccountSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Account.objects.exclude(id=self.request.user.id)
        queryset = queryset.filter(role__in=["Deactivated"]).distinct()

        # Fetch query parameters
        search = self.request.query_params.get("search")
        ordering = self.request.query_params.get("ordering")

        # Filter by search term (e.g., username, email, phone_number, and store profile fields)
        if search:
            queryset = queryset.filter(
                Q(username__icontains=search)
                | Q(email__icontains=search)
                | Q(phone_number__icontains=search)
                | Q(store_profiles__store_name__icontains=search)
                | Q(store_profiles__store_address__icontains=search)
                | Q(store_profiles__store_city__icontains=search)
                | Q(store_profiles__store_zip_code__icontains=search)
                | Q(store_profiles__store_billing_email__icontains=search)
                | Q(store_profiles__store_phone__icontains=search)
                | Q(store_profiles__owner_name__icontains=search)
                | Q(store_profiles__owner_email__icontains=search)
                | Q(store_profiles__owner_phone__icontains=search)
                | Q(store_profiles__distributor_name__icontains=search)
                | Q(store_profiles__distributor_email__icontains=search)
                | Q(store_profiles__distributor_phone__icontains=search)
                | Q(store_profiles__manager_name__icontains=search)
                | Q(store_profiles__manager_email__icontains=search)
                | Q(store_profiles__manager_phone__icontains=search)
            ).distinct()

        # Apply ordering
        if ordering:
            logger.info(f"Applying InActiveCustomers ordering: {ordering}")
            try:
                # Handle special cases for store-based sorting
                if ordering == 'store_names':
                    # Sort by the first store name for each customer
                    queryset = queryset.annotate(
                        first_store_name=Coalesce(
                            Subquery(
                                StoreProfile.objects.filter(
                                    customer=OuterRef('pk')
                                ).order_by('store_name').values('store_name')[:1]
                            ),
                            Value('')  # Default value for users without stores
                        )
                    ).order_by('first_store_name')
                elif ordering == '-store_names':
                    # Sort by the first store name for each customer (descending)
                    queryset = queryset.annotate(
                        first_store_name=Coalesce(
                            Subquery(
                                StoreProfile.objects.filter(
                                    customer=OuterRef('pk')
                                ).order_by('store_name').values('store_name')[:1]
                            ),
                            Value('')  # Default value for users without stores
                        )
                    ).order_by('-first_store_name')
                else:
                    # For other fields, use standard ordering
                    queryset = queryset.order_by(ordering)
            except Exception as e:
                logger.warning(f"Invalid InActiveCustomers ordering parameter: {ordering}, error: {str(e)}")
                # Fallback to default ordering
                queryset = queryset.order_by('username')
        else:
            # Default ordering
            queryset = queryset.order_by('username')

        return queryset


# Get Unread notifications numbers for all users


class UserUnreadNotificationCountView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        count = Notification.objects.filter(recipient=user, read=False).count()
        return Response(
            {
                "unread_count": count,
            },
            status=status.HTTP_200_OK,
        )


class ClearAllNotificationsView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        Notification.objects.filter(recipient=user).delete()
        return Response(status=status.HTTP_200_OK)


# Get Notifications
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def user_notifications(request):
    user = request.user
    try:
        start = int(request.GET.get("start", 0))  # Start index (offset)
        limit = int(request.GET.get("limit", 20))  # Number of items to fetch

        if start < 0 or limit <= 0:
            raise ValueError
    except ValueError:
        return Response(
            {"error": "Invalid pagination values."}, status=status.HTTP_400_BAD_REQUEST
        )

    notifications_unread_list = []

    # Fetch all notifications for the user
    notifications = Notification.objects.filter(recipient=user).order_by("-created_at")

    # Fetch unread notifications for the user
    notifications_unread = Notification.objects.filter(
        recipient=user, read=False
    ).order_by("-created_at")

    # Collect unread notification IDs
    for unread in notifications_unread:
        notifications_unread_list.append(unread.id)

    total_notifications = (
        notifications.count()
    )  # Get the total count before applying pagination
    limited_notifications = notifications[start : start + limit]  # Apply pagination
    # Calculate next offset (if more notifications are available)
    next_start = start + limit if (start + limit) < total_notifications else None

    # Serialize the notifications data
    serializer = NotificationSerializer(limited_notifications, many=True)

    # Mark all notifications as read
    for notif in limited_notifications:
        notif.read = True
        notif.save()

    response_data = {
        "notifications": serializer.data,
        "unread_notifications_ids": notifications_unread_list,
        "remaining": max(0, total_notifications - (start + limit)),
        "next_start": next_start,  # This tells the frontend what offset to use next
    }
    return Response(response_data, status=status.HTTP_200_OK)


class UserPreferenceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        preference, _ = UserPreference.objects.get_or_create(user=request.user)
        serializer = UserPreferenceSerializer(preference)
        return Response(serializer.data, status=200)

    def patch(self, request):
        preference, _ = UserPreference.objects.get_or_create(user=request.user)
        serializer = UserPreferenceSerializer(
            preference, data=request.data, partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=200)
        return Response(serializer.errors, status=400)


class UserFavoriteViewSet(viewsets.ModelViewSet):
    """ViewSet for managing user favorites"""
    serializer_class = UserFavoriteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return UserFavorite.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def perform_destroy(self, instance):
        # Ensure user can only delete their own favorites
        if instance.user == self.request.user:
            instance.delete()
        else:
            raise PermissionDenied("You can only delete your own favorites")

# Get Stores for a Customer
class CustomerStoresView(generics.ListAPIView):
    """
    API view to list all stores for a specific customer.
    """
    serializer_class = StoreProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        customer_id = self.kwargs.get('customer_id')
        return StoreProfile.objects.filter(customer_id=customer_id)

    def paginate_queryset(self, queryset):
        # Check if all=true parameter is provided
        if self.request.query_params.get('all') == 'true':
            return None  # Disable pagination
        return super().paginate_queryset(queryset)


# Combined Stores View - supports both GET (list) and POST (create)
class StoresView(generics.ListCreateAPIView):
    """
    API view to list all stores and create new stores.
    """
    serializer_class = StoreProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = StoreProfile.objects.all()
        
        if self.request.query_params.get('all') == 'true':
            queryset = queryset.filter(is_active=True)
            
        if self.request.user.role == "Employee":
            # Get the store IDs from PartnerCustomerLink for this employee
            linked_store_ids = PartnerCustomerLink.objects.filter(
                partner=self.request.user,
                is_active=True
            ).values_list('store_id', flat=True)
            
            # Filter stores to only show linked stores
            if linked_store_ids:
                queryset = queryset.filter(id__in=linked_store_ids)
            else:
                # If no linked stores, return empty queryset
                queryset = StoreProfile.objects.none()
        
        
        # Fetch query parameters
        search = self.request.query_params.get("search")

        # Filter by search term
        if search:
            queryset = queryset.filter(
                Q(store_name__icontains=search)
                | Q(store_address__icontains=search)
                | Q(store_city__icontains=search)
                | Q(store_zip_code__icontains=search)
                | Q(store_billing_email__icontains=search)
                | Q(store_phone__icontains=search)
                | Q(owner_name__icontains=search)
                | Q(owner_email__icontains=search)
                | Q(owner_phone__icontains=search)
                | Q(distributor_name__icontains=search)
                | Q(distributor_email__icontains=search)
                | Q(distributor_phone__icontains=search)
                | Q(manager_name__icontains=search)
                | Q(manager_email__icontains=search)
                | Q(manager_phone__icontains=search)
                | Q(customer__username__icontains=search)
                | Q(customer__email__icontains=search)
            )

        return queryset

    def paginate_queryset(self, queryset):
        # Check if all=true parameter is provided
        if self.request.query_params.get('all') == 'true':
            return None  # Disable pagination
        return super().paginate_queryset(queryset)

    def perform_create(self, serializer):
        serializer.save()


class StoreDetailView(generics.RetrieveAPIView):
    """
    API view to retrieve a single store by ID.
    """
    queryset = StoreProfile.objects.all()
    serializer_class = StoreProfileSerializer
    permission_classes = [IsAuthenticated]


class StoreUpdateView(generics.UpdateAPIView):
    """
    API view to update a store.
    """
    queryset = StoreProfile.objects.all()
    serializer_class = StoreProfileUpdateSerializer
    permission_classes = [IsAuthenticated]


class StoreDeleteView(generics.DestroyAPIView):
    """
    API view to delete a store.
    """
    queryset = StoreProfile.objects.all()
    permission_classes = [IsAuthenticated]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response({"detail": "Store deleted successfully"}, status=status.HTTP_204_NO_CONTENT)
