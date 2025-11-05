from .models import *
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils.http import urlsafe_base64_decode
from django.utils.encoding import force_str
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.exceptions import InvalidToken
from rest_framework.exceptions import NotAuthenticated
from commonapp.models import Notification
from .utils import generate_random_password
from .tasks import send_account_credentials_email
from rest_framework.exceptions import AuthenticationFailed


class UserSerializerWithToken(serializers.ModelSerializer):
    token = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Account
        fields = ["id", "username", "email", "role", "token"]

    def get_token(self, obj):
        token = RefreshToken.for_user(obj)
        return str(token.access_token)


class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)

        if self.user.role == "Deactivated":
            raise AuthenticationFailed("Your Account is Under Review, Please wait for approval !")

        data["id"] = self.user.id
        data["username"] = f"{self.user.username}"
        data["email"] = self.user.email
        data["role"] = self.user.role
        data["check_in_required"] = self.user.check_in_required
        data["is_superuser"] = self.user.is_superuser
        data["profile_image"] = (
            self.user.profile_image.url if self.user.profile_image else None,
        )
        data["permissions"] = self.user.permissions

        # Ask for password change if first login timestamp is not set
        data["must_change_password"] = True if not getattr(self.user, "first_login_completed_at", None) else False

        return data


class MyTokenRefreshSerializer(TokenRefreshSerializer):
    def validate(self, attrs):
        # Call the default validation
        data = super().validate(attrs)

        # Decode the refresh token to extract user-related information
        refresh = self.token_class(attrs["refresh"])
        user_id = refresh.payload.get("user_id")

        # Check if the user exists
        try:
            user = Account.objects.get(id=user_id)
        except Account.DoesNotExist:
            raise NotAuthenticated("User associated with this token no longer exists.")

        # 👇 Return a new refresh token along with access
        new_refresh = RefreshToken.for_user(user)
        data["refresh"] = str(new_refresh)

        return data

class StoreProfileSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    customer_email = serializers.SerializerMethodField()
    
    class Meta:
        model = StoreProfile
        fields = [
            'id', 'store_name', 'store_address', 'store_city', 'store_zip_code',
            'store_billing_email', 'store_phone', 'owner_name', 'owner_email',
            'owner_phone', 'distributor_name', 'distributor_email', 'distributor_phone',
            'manager_name', 'manager_email', 'manager_phone', 'open', 'close',
            'preferred_software', 'is_active', 'created_at', 'customer',
            'customer_name', 'customer_email'
        ]
        read_only_fields = ['id', 'created_at', 'customer_name', 'customer_email']
    
    def get_customer_name(self, obj):
        return obj.customer.username if obj.customer else None
    
    def get_customer_email(self, obj):
        return obj.customer.email if obj.customer else None 


class StoreProfileUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating store profiles - makes customer field read-only
    """
    customer_name = serializers.SerializerMethodField()
    customer_email = serializers.SerializerMethodField()
    
    class Meta:
        model = StoreProfile
        fields = [
            'id', 'store_name', 'store_address', 'store_city', 'store_zip_code',
            'store_billing_email', 'store_phone', 'owner_name', 'owner_email',
            'owner_phone', 'distributor_name', 'distributor_email', 'distributor_phone',
            'manager_name', 'manager_email', 'manager_phone', 'open', 'close',
            'preferred_software', 'is_active', 'created_at', 'customer',
            'customer_name', 'customer_email'
        ]
        read_only_fields = ['id', 'created_at', 'customer', 'customer_name', 'customer_email']
    
    def get_customer_name(self, obj):
        return obj.customer.username if obj.customer else None
    
    def get_customer_email(self, obj):
        return obj.customer.email if obj.customer else None


class AccountSerializer(serializers.ModelSerializer):
    store_profiles = StoreProfileSerializer(many=True, read_only=True)
    partner_customer_link_store = serializers.SerializerMethodField()

    class Meta:
        model = Account
        fields = ["id", "username", "email", "phone_number", "profile_image", "license", "role", "is_active", "check_in_required", "pay_rate", "is_broker", "permissions", "store_profiles", "is_superuser", "partner_customer_link_store"]
    
    def get_partner_customer_link_store(self, obj):
        """Get the store_id from the active PartnerCustomerLink if this user is a partner/employee"""
        from commonapp.models import PartnerCustomerLink
        
        try:
            # Get the active link for this user as a partner
            link = PartnerCustomerLink.objects.filter(
                partner=obj,
                is_active=True
            ).first()
            
            if link and link.store:
                return {
                    "store_id": link.store.id,
                    "store_name": link.store.store_name
                }
        except Exception as e:
            # If there's any error, just return None
            pass
        
        return None


    def create(self, validated_data):
        # Check for case-insensitive email duplicates before creating
        if "email" in validated_data:
            email = validated_data["email"]
            email_lower = email.lower().strip()
            
            # Check if any user exists with this email (case-insensitive)
            existing_user = Account.objects.filter(email__iexact=email_lower).first()
            if existing_user:
                from rest_framework import serializers
                raise serializers.ValidationError({
                    "email": ["account with this email already exists."]
                })
        
        # 1. Generate password using your utility
        random_password = generate_random_password()

        # 2. Create user and set hashed password
        user = Account(**validated_data)
        user.set_password(random_password)
        user.save()

        # 3. Send password to user using your email utility
        send_account_credentials_email.delay(user.email, user.username, user.email, random_password)

        return user
    
    def update(self, instance, validated_data):
        # Check for case-insensitive email duplicates before updating
        if "email" in validated_data:
            email = validated_data["email"]
            email_lower = email.lower().strip()
            
            # Check if any other user exists with this email (case-insensitive)
            existing_user = Account.objects.filter(email__iexact=email_lower).exclude(pk=instance.pk).first()
            if existing_user:
                from rest_framework import serializers
                raise serializers.ValidationError({
                    "email": ["account with this email already exists."]
                })
        
        store_profiles_data = validated_data.pop('store_profiles', None)

        # Update Account fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update or create StoreProfile
        if store_profiles_data:
            try:
                profile = instance.store_profiles.first()
                if profile:
                    for attr, value in store_profiles_data.items():
                        setattr(profile, attr, value)
                    profile.save()
                else:
                    StoreProfile.objects.create(customer=instance, **store_profiles_data)
            except StoreProfile.DoesNotExist:
                StoreProfile.objects.create(customer=instance, **store_profiles_data)

        return instance


class SetPasswordSerializer(serializers.Serializer):
    new_password1 = serializers.CharField(write_only=True)
    new_password2 = serializers.CharField(write_only=True)
    uid = serializers.CharField()
    token = serializers.CharField()

    def validate(self, data):
        uid = force_str(urlsafe_base64_decode(data["uid"]))
        token = data["token"]

        # Try to retrieve the user
        try:
            user = Account.objects.get(pk=uid)
        except Account.DoesNotExist:
            raise serializers.ValidationError({"uid": "Invalid user."})

        # Check if the token is valid
        if not default_token_generator.check_token(user, token):
            raise serializers.ValidationError({"token": "Invalid or expired token."})

        # Validate password matching
        if data["new_password1"] != data["new_password2"]:
            raise serializers.ValidationError({"password": "Passwords do not match."})

        # Validate the strength of the new password
        try:
            validate_password(data["new_password1"], user=user)
        except serializers.ValidationError as e:
            raise serializers.ValidationError({"password": e.messages})

        return data

    def save(self):
        uid = force_str(urlsafe_base64_decode(self.validated_data["uid"]))
        user = Account.objects.get(pk=uid)
        user.set_password(self.validated_data["new_password1"])
        user.save()


 



class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'title', 'message', 'notification_type', 'created_at', 'read', 'link']


class UserPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserPreference
        fields = ['receive_email_notifications', 'receive_whatsapp_notifications']


class UserFavoriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserFavorite
        fields = ['id', 'title', 'url', 'created_at']
        read_only_fields = ['created_at']

    def create(self, validated_data):
        # Ensure the user is set from the request
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)
        
        