from rest_framework.routers import DefaultRouter
from .views import *

router = DefaultRouter()
router.register(r'assembly-tickets', AssemblyTicketViewSet, basename='assembly-ticket')
router.register(r'assembly-notes', AssemblyNotesViewSet, basename='assembly-notes')

urlpatterns = router.urls 