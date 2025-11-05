from django.urls import path, include
from .views import *
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r'favorites', UserFavoriteViewSet, basename='user-favorites')

urlpatterns = [
    path("register/", RegisterUserView.as_view(), name="register_user"),
    path("login/", MyTokenObtainPairView.as_view(), name="token_obtain_pair_view"),
    path('google-login/', GoogleLoginView.as_view(), name='google-login'),
    path('refresh/', MyTokenRefreshView.as_view(), name='refresh_token'),
    path('logout/', LogoutUserView.as_view(), name='logout_page'),
    path('profile/', UpdateUserProfileView.as_view(), name='get-update-user-profile'),
    path('accounts/create/', AccountCreateView.as_view(), name='account-create'),
    path('accounts/<int:pk>/', AccountRetrieveUpdateView.as_view(), name='account-retrieve-update'),
    path('accounts/update/<int:pk>/', AccountRetrieveUpdateView.as_view(), name='account-update'),
    path('accounts/<int:pk>/permissions/', AccountPermissionsView.as_view(), name='account-permissions'),
    path('accounts/<int:pk>/update-license/', AccountUpdateLicenseView.as_view(), name='account-update-license'),
    path("accounts/delete/<int:pk>/", AccountDeleteView.as_view(), name="account-delete"),
    path('forgot-password/', ForgotPasswordView.as_view(), name='send-reset-password-link'),
    path('set-password/', SetNewPasswordView.as_view(), name='set-new-password'),
    path('first-login/set-password/', FirstLoginSetPasswordView.as_view(), name='first-login-set-password'),
    path('technician-users/', TechnicianUserListView.as_view(), name='technician-users'),
    path('external-users/', ExternalUserListView.as_view(), name='external-users'),
    path('get-users/', AccountListView.as_view(), name='all-users'),
    path('get-users/<int:pk>/', AccountDetailView.as_view(), name='user-detail'),
    path('active-customers/', ActiveCustomers.as_view(), name='active-customers'),
    path('in-active-customers/', InActiveCustomers.as_view(), name='in-active-customers'),
    path('stores/', StoresView.as_view(), name='stores'),
    path('stores/<int:pk>/', StoreDetailView.as_view(), name='store-detail'),
    path('stores/<int:pk>/update/', StoreUpdateView.as_view(), name='store-update'),
    path('stores/<int:pk>/delete/', StoreDeleteView.as_view(), name='store-delete'),
    path('stores/<int:customer_id>/', CustomerStoresView.as_view(), name='customer-stores'),
    path('unread-notifications/', UserUnreadNotificationCountView.as_view(), name='unread-notifications'),
    path('get-notifications/', user_notifications, name='user-unread-notifications'),
    path('clear-notifications/', ClearAllNotificationsView.as_view(), name='clear-notifications'),
    path('user-preferences/', UserPreferenceView.as_view(), name='user-preferences'),
    path('', include(router.urls)),
]

