from rest_framework import viewsets
from .models import *
from rest_framework.exceptions import NotFound
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Prefetch, Count, Sum
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from django.db import transaction
from rest_framework import serializers
from .serializers import *
from .permissions import *
from rest_framework.exceptions import ValidationError
from rest_framework import viewsets, permissions
from django.db.models import F, Sum, Q, CharField, Exists, OuterRef
from django.db.models.functions import Cast
from django.shortcuts import get_object_or_404
import base64
from django.core.exceptions import ObjectDoesNotExist
import logging
from django.utils import timezone
from django.contrib.contenttypes.models import ContentType
from datetime import datetime, timedelta
from decimal import Decimal
from .models import (
    Transfer, Warehouse, InventoryItem, LocationPermission,
    VendingCustomerLocation, Vendor
)
from custom_user.models import Account, StoreProfile
from django.contrib.auth import get_user_model

User = get_user_model()
from django.contrib.contenttypes.fields import GenericRelation
from django.contrib.contenttypes.fields import GenericForeignKey
from io import BytesIO
import qrcode
from django.core.files import File
import uuid
from .models import VehicleMaintenance, Vehicle, Attachment, PlatformConfig, PreferredSoftwareOptions
from .serializers import (
    VehicleMaintenanceSerializer, LocationPermissionSerializer,
    VendingCustomerLocationSerializer,
    PlatformConfigSerializer
)
from .printer_service import printer_service
from commonapp.tasks import send_vehicle_maintenance_notification

logger = logging.getLogger(__name__)


class GlobalSearchViewSet(viewsets.ViewSet):
    """
    Global search across multiple models with comprehensive filtering
    """
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'], url_path='test')
    def test_search(self, request):
        """Test endpoint to verify search functionality"""
        try:
            # Test basic model access
            ticket_count = Ticket.objects.count()
            inventory_count = InventoryItem.objects.count()
            user_count = User.objects.count()
            
            return Response({
                'status': 'success',
                'message': 'Search system is working',
                'counts': {
                    'tickets': ticket_count,
                    'inventory': inventory_count,
                    'users': user_count
                }
            })
        except Exception as e:
            logger.error(f"Test search error: {str(e)}")
            return Response({
                'status': 'error',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'], url_path='test-users')
    def test_users(self, request):
        """Test endpoint specifically for user search"""
        try:
            # Test user model access
            user_count = User.objects.count()
            sample_users = list(User.objects.all()[:5].values('id', 'username', 'email', 'role'))
            
            return Response({
                'status': 'success',
                'message': 'User search test',
                'user_count': user_count,
                'sample_users': sample_users,
                'user_model': str(User),
                'user_fields': [f.name for f in User._meta.fields]
            })
        except Exception as e:
            logger.error(f"User test error: {str(e)}")
            return Response({
                'status': 'error',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'], url_path='test-invoices')
    def test_invoices(self, request):
        """Test endpoint specifically for invoice search"""
        try:
            from .models import Invoice
            
            # Test invoice model access
            invoice_count = Invoice.objects.count()
            sample_invoices = list(Invoice.objects.select_related('store', 'store__customer', 'created_by')[:5].values(
                'id', 'invoice_number', 'total_amount', 'status', 'store__store_name', 'store__customer__username'
            ))
            
            return Response({
                'status': 'success',
                'message': 'Invoice search test',
                'invoice_count': invoice_count,
                'sample_invoices': sample_invoices,
                'invoice_model': str(Invoice),
                'invoice_model_fields': [f.name for f in Invoice._meta.fields]
            })
        except Exception as e:
            logger.error(f"Invoice test error: {str(e)}")
            return Response({
                'status': 'error',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'], url_path='test-cash-drawers')
    def test_cash_drawers(self, request):
        """Test endpoint specifically for cash drawer search"""
        try:
            from .models import CashDrawer, CashEntry
            
            # Test cash drawer model access
            cash_drawer_count = CashDrawer.objects.count()
            cash_entry_count = CashEntry.objects.count()
            
            # Get sample cash drawers with store information
            sample_cash_drawers = []
            for drawer in CashDrawer.objects.select_related('user')[:5]:
                drawer_data = {
                    'id': drawer.id,
                    'status': drawer.status,
                    'current_amount': str(drawer.current_amount),
                    'user__username': drawer.user.username if drawer.user else None,
                    'store_info': None
                }
                
                # Try to get store information from entries
                first_entry_with_store = drawer.entries.filter(store__isnull=False).first()
                if first_entry_with_store and first_entry_with_store.store:
                    drawer_data['store_info'] = {
                        'store_name': first_entry_with_store.store.store_name,
                        'store_address': first_entry_with_store.store.store_address,
                        'store_city': first_entry_with_store.store.store_city,
                        'customer_username': first_entry_with_store.store.customer.username
                    }
                
                sample_cash_drawers.append(drawer_data)
            
            return Response({
                'status': 'success',
                'message': 'Cash drawer search test',
                'cash_drawer_count': cash_drawer_count,
                'cash_entry_count': cash_entry_count,
                'sample_cash_drawers': sample_cash_drawers,
                'cash_drawer_model': str(CashDrawer),
                'cash_drawer_fields': [f.name for f in CashDrawer._meta.fields]
            })
        except Exception as e:
            logger.error(f"Cash drawer test error: {str(e)}")
            return Response({
                'status': 'error',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'], url_path='test-assembly-tickets')
    def test_assembly_tickets(self, request):
        """Test endpoint specifically for assembly ticket search"""
        try:
            from assembly.models import AssemblyTicket
            
            # Test assembly ticket model access
            assembly_ticket_count = AssemblyTicket.objects.count()
            
            # Get sample assembly tickets
            sample_assembly_tickets = list(AssemblyTicket.objects.select_related('created_by')[:5].values(
                'id', 'title', 'description', 'status', 'created_at', 'deadline',
                'created_by__username', 'assigned_by__username', 'assembled_item_name',
                'assembled_item_upc', 'assembly_notes', 'flagged'
            ))
            

            
            return Response({
                'status': 'success',
                'message': 'Assembly ticket search test',
                'assembly_ticket_count': assembly_ticket_count,
                'sample_assembly_tickets': sample_assembly_tickets,

                'assembly_ticket_model': str(AssemblyTicket),
                'assembly_ticket_fields': [f.name for f in AssemblyTicket._meta.fields]
            })
        except Exception as e:
            logger.error(f"Assembly ticket test error: {str(e)}")
            return Response({
                'status': 'error',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'], url_path='test-tickets')
    def test_tickets(self, request):
        """Test endpoint specifically for ticket search"""
        try:
            from .models import Ticket
            
            # Test ticket model access
            ticket_count = Ticket.objects.count()
            
            # Get sample tickets with search test
            sample_tickets = list(Ticket.objects.select_related('assigned_by', 'created_by', 'store')[:10].values(
                'id', 'title', 'description', 'status', 'created_at', 'deadline',
                'assigned_by__username', 'created_by__username', 'store__store_name'
            ))
            
            # Test specific search for "build" or "bui"
            build_tickets = list(Ticket.objects.filter(
                Q(title__icontains='build') | Q(description__icontains='build')
            )[:5].values('id', 'title', 'description'))
            
            bui_tickets = list(Ticket.objects.filter(
                Q(title__icontains='bui') | Q(description__icontains='bui')
            )[:5].values('id', 'title', 'description'))
            
            return Response({
                'status': 'success',
                'message': 'Ticket search test',
                'ticket_count': ticket_count,
                'sample_tickets': sample_tickets,
                'build_tickets': build_tickets,
                'bui_tickets': bui_tickets,
                'ticket_model': str(Ticket),
                'ticket_fields': [f.name for f in Ticket._meta.fields]
            })
        except Exception as e:
            logger.error(f"Ticket test error: {str(e)}")
            return Response({
                'status': 'error',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'], url_path='search')
    def global_search(self, request):
        """
        Search across tickets, inventory, users, stores, invoices, and cash drawers
        """
        query = request.query_params.get('q', '').strip()
        if not query:
            return Response({
                'error': 'Search query is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        user = request.user
        logger.info(f"Global search initiated by user {user.username} for query: '{query}'")
        results = {}
        
        try:
            logger.info(f"Global search: Starting search for all models with query: '{query}'")
            # Search tickets
            try:
                logger.info(f"Starting ticket search for query: '{query}'")
                tickets = self._search_tickets(query, user)
                logger.info(f"Ticket search completed, found {len(tickets)} tickets")
                results['tickets'] = tickets
            except Exception as e:
                logger.warning(f"Ticket search failed: {str(e)}")
                logger.error(f"Ticket search error details: {str(e)}")
                results['tickets'] = []
            
            # Search inventory
            try:
                inventory = self._search_inventory(query, user)
                results['inventory'] = inventory
            except Exception as e:
                logger.warning(f"Inventory search failed: {str(e)}")
                results['inventory'] = []
            
            # Search users
            try:
                logger.info(f"Starting user search for query: '{query}'")
                users = self._search_users(query, user)
                logger.info(f"User search completed, found {len(users)} users")
                results['users'] = users
            except Exception as e:
                logger.warning(f"User search failed: {str(e)}")
                logger.error(f"User search error details: {str(e)}")
                results['users'] = []
            
            # Search stores
            try:
                stores = self._search_stores(query, user)
                results['stores'] = stores
            except Exception as e:
                logger.warning(f"Store search failed: {str(e)}")
                results['stores'] = []
            
            # Search invoices
            try:
                logger.info(f"Starting invoice search for query: '{query}'")
                invoices = self._search_invoices(query, user)
                logger.info(f"Invoice search completed, found {len(invoices)} invoices")
                results['invoices'] = invoices
            except Exception as e:
                logger.warning(f"Invoice search failed: {str(e)}")
                logger.error(f"Invoice search error details: {str(e)}")
                results['invoices'] = []
            
            # Search cash drawers
            try:
                logger.info(f"Starting cash drawer search for query: '{query}'")
                cash_drawers = self._search_cash_drawers(query, user)
                logger.info(f"Cash drawer search completed, found {len(cash_drawers)} cash drawers")
                results['cash_drawers'] = cash_drawers
            except Exception as e:
                logger.warning(f"Cash drawer search failed: {str(e)}")
                logger.error(f"Cash drawer search error details: {str(e)}")
                results['cash_drawers'] = []
            
            # Search assembly tickets
            try:
                logger.info(f"Starting assembly ticket search for query: '{query}'")
                logger.info(f"Global search: About to call _search_assembly_tickets")
                assembly_tickets = self._search_assembly_tickets(query, user)
                logger.info(f"Global search: Assembly ticket search returned {len(assembly_tickets)} results")
                results['assembly_tickets'] = assembly_tickets
                logger.info(f"Global search: Assembly tickets added to results: {len(results['assembly_tickets'])}")
            except Exception as e:
                logger.warning(f"Assembly ticket search failed: {str(e)}")
                logger.error(f"Assembly ticket search error details: {str(e)}")
                logger.error(f"Global search: Exception in assembly ticket search: {str(e)}")
                results['assembly_tickets'] = []
            
            # Search transfers
            try:
                transfers = self._search_transfers(query, user)
                results['transfers'] = transfers
            except Exception as e:
                logger.warning(f"Transfer search failed: {str(e)}")
                results['transfers'] = []
            
            # Search vehicles
            try:
                vehicles = self._search_vehicles(query, user)
                results['vehicles'] = vehicles
            except Exception as e:
                logger.warning(f"Vehicle search failed: {str(e)}")
                results['vehicles'] = []
            
            # Calculate totals
            total_results = sum(len(items) for items in results.values())
            
            logger.info(f"Global search completed for user {user.username}. Found {total_results} total results across all categories.")
            logger.info(f"Global search: Final results structure: {list(results.keys())}")
            for key, value in results.items():
                logger.info(f"  {key}: {len(value) if isinstance(value, list) else value}")
            
            return Response(results)
            
        except Exception as e:
            logger.error(f"Global search error: {str(e)}")
            return Response({
                'error': 'An error occurred during search'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _search_tickets(self, query, user):
        """Search tickets based on user permissions"""
        try:
            logger.info(f"Ticket search: Starting search for query '{query}' by user {user.username}")
            
            queryset = Ticket.objects.select_related(
                'assigned_by', 'created_by', 'store', 'store__customer'
            ).prefetch_related('assigned_to')
            
            logger.info(f"Ticket search: Initial queryset count: {queryset.count()}")
            
            # Apply user permissions
            if user.role in ["Admin", "Manager", "Warehouse Manager"]:
                logger.info(f"Ticket search: Admin/Manager/Warehouse Manager user, can see all tickets")
                pass
            elif user.role in ["Vending Customer", "Service Customer"]:
                queryset = queryset.filter(Q(created_by=user) | Q(store__customer=user))
                logger.info(f"Ticket search: Customer user, filtered to own tickets. Count: {queryset.count()}")
            elif user.role in ["Technician", "Warehouse Technician"]:
                queryset = queryset.filter(
                    assigned_to=user,
                    status__in=["IN PROGRESS", "PARTIALLY CLOSED", "PENDING APPROVAL"]
                )
                logger.info(f"Ticket search: Technician user, filtered to assigned tickets. Count: {queryset.count()}")
            
            # Apply search filters - enhanced search with partial matching
            filters = Q(title__icontains=query)  # Search in title (partial match anywhere)
            logger.info(f"Ticket search: Added title filter: {query}")
            
            # Search in description (partial match anywhere)
            filters |= Q(description__icontains=query)
            logger.info(f"Ticket search: Added description filter: {query}")
            
            # Search by ID if query is numeric (exact match for ID)
            if query.isdigit():
                filters |= Q(id=int(query))
                logger.info(f"Ticket search: Added ID filter: {query}")
            
            # Search by status (partial match anywhere)
            filters |= Q(status__icontains=query)
            logger.info(f"Ticket search: Added status filter: {query}")
            
            # Search by assigned user username (partial match anywhere)
            filters |= Q(assigned_by__username__icontains=query)
            logger.info(f"Ticket search: Added assigned by username filter: {query}")
            
            # Search by created user username (partial match anywhere)
            filters |= Q(created_by__username__icontains=query)
            logger.info(f"Ticket search: Added created by username filter: {query}")
            
            # Search by store name (partial match anywhere)
            filters |= Q(store__store_name__icontains=query)
            logger.info(f"Ticket search: Added store name filter: {query}")
            
            logger.info(f"Ticket search: Applied all filters: {filters}")
            
            # Apply all filters
            queryset = queryset.filter(filters)
            logger.info(f"Ticket search: After filters, count: {queryset.count()}")
            
            # Get sample tickets for debugging
            sample_tickets = list(queryset[:5].values('id', 'title', 'description'))
            logger.info(f"Ticket search: Sample tickets: {sample_tickets}")
            
            # Limit results for performance
            results = list(queryset[:50].values(
                'id', 'title', 'description', 'status', 'created_at', 'deadline',
                'assigned_by__username', 'created_by__username', 'store__store_name'
            ))
            
            logger.info(f"Ticket search: Returning {len(results)} ticket results")
            return results
            
        except Exception as e:
            logger.error(f"Error in _search_tickets: {str(e)}")
            logger.error(f"Ticket model: {Ticket}")
            logger.error(f"Ticket model fields: {[f.name for f in Ticket._meta.fields]}")
            raise
    
    def _search_inventory(self, query, user):
        """Search inventory items"""
        try:
            queryset = InventoryItem.objects.select_related(
                'inventory', 'warehouse', 'inventory__category'
            )
            
            # Apply user permissions
            if user.role not in ["Admin", "Manager", "Warehouse Manager"]:
                # For non-admin users, only show items they have access to
                queryset = queryset.filter(warehouse__isnull=False)
            
            # Apply search filters - enhanced search
            filters = Q(inventory__name__icontains=query) | Q(inventory__description__icontains=query)
            
            # Search by ID if query is numeric
            if query.isdigit():
                filters |= Q(id=int(query))
            
            # Search by status
            filters |= Q(status__icontains=query)
            
            # Search by warehouse
            filters |= Q(warehouse__name__icontains=query)
            
            # Search by category
            filters |= Q(inventory__category__name__icontains=query)
            
            # Search by UPC
            filters |= Q(inventory__upc__icontains=query)
            
            # Search by attributes (serial number, MAC address, etc.)
            # Note: This searches in the JSON attributes field
            filters |= Q(attributes__serial_number__icontains=query)
            filters |= Q(attributes__mac_address__icontains=query)
            filters |= Q(attributes__ip_address__icontains=query)
            filters |= Q(attributes__service_tag__icontains=query)
            filters |= Q(attributes__service_number__icontains=query)
            filters |= Q(attributes__model__icontains=query)
            filters |= Q(attributes__brand__icontains=query)
            
            queryset = queryset.filter(filters)
            
            # Get the basic inventory data
            inventory_data = list(queryset[:50].values(
                'id', 'inventory__id', 'inventory__name', 'inventory__description', 'status',
                'warehouse__name', 'inventory__category__name', 'inventory__upc',
                'attributes', 'created_at', 'updated_at'
            ))
            
            # Enhance the data with additional information
            for item in inventory_data:
                # Add serial number from attributes if available
                if item['attributes'] and isinstance(item['attributes'], dict):
                    item['serial_number'] = item['attributes'].get('serial_number', '')
                    item['mac_address'] = item['attributes'].get('mac_address', '')
                    item['ip_address'] = item['attributes'].get('ip_address', '')
                    item['service_tag'] = item['attributes'].get('service_tag', '')
                    item['service_number'] = item['attributes'].get('service_number', '')
                    item['model'] = item['attributes'].get('model', '')
                    item['brand'] = item['attributes'].get('brand', '')
                else:
                    item['serial_number'] = ''
                    item['mac_address'] = ''
                    item['ip_address'] = ''
                    item['service_tag'] = ''
                    item['service_number'] = ''
                    item['model'] = ''
                    item['brand'] = ''
                
                # Add additional inventory fields
                item['inventory__unit_price'] = getattr(queryset.filter(id=item['id']).first().inventory, 'unit_price', '')
                item['inventory__price'] = getattr(queryset.filter(id=item['id']).first().inventory, 'price', '')
                item['inventory__low_stock_threshold'] = getattr(queryset.filter(id=item['id']).first().inventory, 'low_stock_threshold', '')
                item['inventory__serial_number_required'] = getattr(queryset.filter(id=item['id']).first().inventory, 'serial_number_required', False)
                
                # Remove the raw attributes field to avoid confusion
                del item['attributes']
            
            return inventory_data
        except Exception as e:
            logger.error(f"Error in _search_inventory: {str(e)}")
            raise
    
    def _search_users(self, query, user):
        """Search users"""
        try:
            logger.info(f"Starting user search for query: '{query}' by user: {user.username}")
            
            queryset = User.objects.all()
            logger.info(f"Initial user queryset count: {queryset.count()}")
            
            # Apply user permissions
            if user.role not in ["Admin", "Manager"]:
                # Non-admin users can only see themselves
                queryset = queryset.filter(id=user.id)
                logger.info(f"Non-admin user, filtered to self only. Count: {queryset.count()}")
            else:
                logger.info(f"Admin/Manager user, can see all users")
            
            # Apply search filters - use correct Account model fields
            filters = Q(username__icontains=query) | Q(email__icontains=query) | Q(role__icontains=query)
            
            # Search by phone number
            filters |= Q(phone_number__icontains=query)
            
            # Search by ID if query is numeric
            if query.isdigit():
                filters |= Q(id=int(query))
            
            logger.info(f"Applied search filters: {filters}")
            queryset = queryset.filter(filters)
            logger.info(f"After search filters, count: {queryset.count()}")
            
            # Get the results - use correct Account model fields
            results = list(queryset[:50].values(
                'id', 'username', 'email', 'role', 'is_active', 'date_joined', 'phone_number'
            ))
            
            logger.info(f"Returning {len(results)} user results")
            return results
            
        except Exception as e:
            logger.error(f"Error in _search_users: {str(e)}")
            logger.error(f"User model: {User}")
            logger.error(f"User model fields: {[f.name for f in User._meta.fields]}")
            raise
    
    def _search_stores(self, query, user):
        """Search stores"""
        from custom_user.models import StoreProfile
        
        queryset = StoreProfile.objects.select_related('customer')
        
        # Apply user permissions
        if user.role not in ["Admin", "Manager"]:
            # Non-admin users can only see their own stores
            queryset = queryset.filter(customer=user)
        
        # Apply search filters
        filters = Q(store_name__icontains=query) | Q(store_address__icontains=query) | Q(store_city__icontains=query)
        if query.isdigit():
            filters |= Q(id=int(query))
        
        queryset = queryset.filter(filters)
        
        return list(queryset[:50].values(
            'id', 'store_name', 'store_address', 'store_city', 'store_phone', 'store_billing_email',
            'customer__username'
        ))
    
    def _search_invoices(self, query, user):
        """Search invoices by invoice number, store name, and other fields"""
        try:
            from .models import Invoice
            
            logger.info(f"Invoice search: Starting search for query '{query}' by user {user.username}")
            
            queryset = Invoice.objects.select_related('store', 'store__customer', 'created_by')
            logger.info(f"Invoice search: Initial queryset count: {queryset.count()}")
            
            # Apply user permissions
            if user.role not in ["Admin", "Manager"]:
                # Non-admin users can only see their own invoices
                queryset = queryset.filter(created_by=user)
                logger.info(f"Invoice search: Non-admin user, filtered to self only. Count: {queryset.count()}")
            else:
                logger.info(f"Invoice search: Admin/Manager user, can see all invoices")
            
            # Apply comprehensive search filters - partial matches anywhere in the text
            filters = Q(invoice_number__icontains=query)  # Search in invoice number
            logger.info(f"Invoice search: Added invoice_number filter: {query}")
            
            # Search in store name (partial match anywhere in store name)
            filters |= Q(store__store_name__icontains=query)
            logger.info(f"Invoice search: Added store name filter: {query}")
            
            # Search in store address (partial match anywhere in address)
            filters |= Q(store__store_address__icontains=query)
            logger.info(f"Invoice search: Added store address filter: {query}")
            
            # Search in store city (partial match anywhere in city)
            filters |= Q(store__store_city__icontains=query)
            logger.info(f"Invoice search: Added store city filter: {query}")
            
            # Search in customer username (partial match anywhere in username)
            filters |= Q(store__customer__username__icontains=query)
            logger.info(f"Invoice search: Added customer username filter: {query}")
            
            # Search in notes (partial match anywhere in notes)
            filters |= Q(notes__icontains=query)
            logger.info(f"Invoice search: Added notes filter: {query}")
            
            # Search by ID if query is numeric
            if query.isdigit():
                filters |= Q(id=int(query))
                logger.info(f"Invoice search: Added ID filter: {query}")
            
            logger.info(f"Invoice search: Applied all filters: {filters}")
            
            # Apply all filters
            queryset = queryset.filter(filters)
            logger.info(f"Invoice search: After filters, count: {queryset.count()}")
            
            # Get the results
            results = list(queryset[:50].values(
                'id', 'invoice_number', 'total_amount', 'status', 'created_at', 
                'issue_date', 'due_date', 'subtotal', 'total_charges',
                'store__store_name', 'store__store_address', 'store__store_city',
                'store__customer__username', 'created_by__username', 'notes'
            ))
            
            logger.info(f"Invoice search: Returning {len(results)} invoice results")
            return results
            
        except Exception as e:
            logger.error(f"Invoice search error: {str(e)}")
            logger.error(f"Invoice model: {Invoice}")
            logger.error(f"Invoice model fields: {[f.name for f in Invoice._meta.fields]}")
            raise
    
    def _search_cash_drawers(self, query, user):
        """Search cash drawers by ID, user, status, and associated store names"""
        try:
            logger.info(f"Cash drawer search: Starting search for query '{query}' by user {user.username}")
            
            # Use distinct to avoid duplicates when searching through entries
            queryset = CashDrawer.objects.select_related('user').distinct()
            logger.info(f"Cash drawer search: Initial queryset count: {queryset.count()}")
            
            # Apply user permissions
            if user.role not in ["Admin", "Manager"]:
                # Non-admin users can only see their own cash drawers
                queryset = queryset.filter(user=user)
                logger.info(f"Cash drawer search: Non-admin user, filtered to self only. Count: {queryset.count()}")
            else:
                logger.info(f"Cash drawer search: Admin/Manager user, can see all cash drawers")
            
            # Apply comprehensive search filters - partial matches anywhere in the text
            filters = Q(id__icontains=query)  # Search in cash drawer ID
            
            # Search in user username (partial match anywhere in username)
            filters |= Q(user__username__icontains=query)
            logger.info(f"Cash drawer search: Added user username filter: {query}")
            
            # Search in user email (partial match anywhere in email)
            filters |= Q(user__email__icontains=query)
            logger.info(f"Cash drawer search: Added user email filter: {query}")
            
            # Search in user role (partial match anywhere in role)
            filters |= Q(user__role__icontains=query)
            logger.info(f"Cash drawer search: Added user role filter: {query}")
            
            # Search in cash drawer status (partial match anywhere in status)
            filters |= Q(status__icontains=query)
            logger.info(f"Cash drawer search: Added status filter: {query}")
            
            # Search in associated store names through cash entries (partial match anywhere in store name)
            filters |= Q(entries__store__store_name__icontains=query)
            logger.info(f"Cash drawer search: Added store name filter: {query}")
            
            # Search in store addresses through cash entries (partial match anywhere in address)
            filters |= Q(entries__store__store_address__icontains=query)
            logger.info(f"Cash drawer search: Added store address filter: {query}")
            
            # Search in store cities through cash entries (partial match anywhere in city)
            filters |= Q(entries__store__store_city__icontains=query)
            logger.info(f"Cash drawer search: Added store city filter: {query}")
            
            # Search in store customer usernames through cash entries (partial match anywhere in username)
            filters |= Q(entries__store__customer__username__icontains=query)
            logger.info(f"Cash drawer search: Added store customer username filter: {query}")
            
            # Search by ID if query is numeric
            if query.isdigit():
                filters |= Q(id=int(query))
                logger.info(f"Cash drawer search: Added ID filter: {query}")
            
            logger.info(f"Cash drawer search: Applied all filters: {filters}")
            
            # Apply all filters
            queryset = queryset.filter(filters)
            logger.info(f"Cash drawer search: After filters, count: {queryset.count()}")
            
            # Get the results with enhanced store information
            results = list(queryset[:50].values(
                'id', 'status', 'opened_at', 'closed_at', 'current_amount', 'opening_amount',
                'user__username', 'user__email', 'user__role', 'notes'
            ))
            
            # For each cash drawer, get the associated store information from entries
            for result in results:
                try:
                    # Get the first entry with store information
                    cash_drawer = CashDrawer.objects.get(id=result['id'])
                    first_entry_with_store = cash_drawer.entries.filter(store__isnull=False).first()
                    
                    if first_entry_with_store and first_entry_with_store.store:
                        result['store__store_name'] = first_entry_with_store.store.store_name
                        result['store__store_address'] = first_entry_with_store.store.store_address
                        result['store__store_city'] = first_entry_with_store.store.store_city
                        result['store__customer__username'] = first_entry_with_store.store.customer.username
                    else:
                        result['store__store_name'] = None
                        result['store__store_address'] = None
                        result['store__store_city'] = None
                        result['store__customer__username'] = None
                        
                except Exception as e:
                    logger.warning(f"Could not get store info for cash drawer {result['id']}: {str(e)}")
                    result['store__store_name'] = None
                    result['store__store_address'] = None
                    result['store__store_city'] = None
                    result['store__customer__username'] = None
            
            logger.info(f"Cash drawer search: Returning {len(results)} cash drawer results")
            return results
            
        except Exception as e:
            logger.error(f"Cash drawer search error: {str(e)}")
            logger.error(f"Cash drawer model: {CashDrawer}")
            logger.error(f"Cash drawer model fields: {[f.name for f in CashDrawer._meta.fields]}")
            raise

    def _search_assembly_tickets(self, query, user):
        """Search assembly tickets by ID, title, description, and other fields"""
        try:
            from assembly.models import AssemblyTicket
            
            logger.info(f"Assembly ticket search: Starting search for query '{query}' by user {user.username}")
            logger.info(f"Assembly ticket search: AssemblyTicket model: {AssemblyTicket}")
            
            # Check if there are any assembly tickets at all
            total_count = AssemblyTicket.objects.count()
            logger.info(f"Assembly ticket search: Total assembly tickets in database: {total_count}")
            
            # Log available fields for debugging
            try:
                available_fields = [f.name for f in AssemblyTicket._meta.fields]
                logger.info(f"Assembly ticket search: Available fields: {available_fields}")
            except Exception as e:
                logger.error(f"Assembly ticket search: Error getting fields: {str(e)}")
            
            if total_count == 0:
                logger.warning("Assembly ticket search: No assembly tickets found in database")
                return []
            
            queryset = AssemblyTicket.objects.select_related('created_by').all()
            logger.info(f"Assembly ticket search: Initial queryset count: {queryset.count()}")
            
            # Apply user permissions
            logger.info(f"Assembly ticket search: User role: {user.role}")
            logger.info(f"Assembly ticket search: User ID: {user.id}")
            logger.info(f"Assembly ticket search: User username: {user.username}")
            
            if user.role not in ["Admin", "Manager", "Warehouse Manager"]:
                # Non-admin users can only see their own assembly tickets
                logger.info(f"Assembly ticket search: Non-admin user, filtering to self only")
                queryset = queryset.filter(created_by=user)
                logger.info(f"Assembly ticket search: After permission filter, count: {queryset.count()}")
            else:
                logger.info(f"Assembly ticket search: Admin/Manager/Warehouse Manager user, can see all assembly tickets")
                logger.info(f"Assembly ticket search: All assembly tickets count: {queryset.count()}")
                logger.info(f"Assembly ticket search: Sample tickets before permission filter: {list(queryset[:3].values('id', 'title', 'created_by__username'))}")
            
            # Apply comprehensive search filters - partial matches anywhere in the text
            filters = Q(title__icontains=query)  # Search in title (partial match anywhere)
            logger.info(f"Assembly ticket search: Added title filter: {query}")
            
            # Search in description (partial match anywhere)
            filters |= Q(description__icontains=query)
            logger.info(f"Assembly ticket search: Added description filter: {query}")
            
            # Search in status (partial match anywhere)
            filters |= Q(status__icontains=query)
            logger.info(f"Assembly ticket search: Added status filter: {query}")
            
            # Search in created by username (partial match anywhere)
            filters |= Q(created_by__username__icontains=query)
            logger.info(f"Assembly ticket search: Added created by username filter: {query}")
            
            # Search in assigned by username (partial match anywhere)
            filters |= Q(assigned_by__username__icontains=query)
            logger.info(f"Assembly ticket search: Added assigned by username filter: {query}")
            
            # Search in assembled item name (partial match anywhere)
            filters |= Q(assembled_item_name__icontains=query)
            logger.info(f"Assembly ticket search: Added assembled item name filter: {query}")
            
            # Search in assembled item UPC (partial match anywhere)
            filters |= Q(assembled_item_upc__icontains=query)
            logger.info(f"Assembly ticket search: Added assembled item UPC filter: {query}")
            
            # Search in assembly notes (partial match anywhere)
            filters |= Q(assembly_notes__icontains=query)
            logger.info(f"Assembly ticket search: Added assembly notes filter: {query}")
            
            # Search by ID if query is numeric (exact match for ID)
            if query.isdigit():
                filters |= Q(id=int(query))
                logger.info(f"Assembly ticket search: Added ID filter: {query}")
            
            logger.info(f"Assembly ticket search: Applied all filters: {filters}")
            
            # Apply all filters
            queryset = queryset.filter(filters)
            logger.info(f"Assembly ticket search: After filters, count: {queryset.count()}")
            
            # Debug: Check what tickets exist before filtering
            if total_count > 0:
                sample_before_filter = list(AssemblyTicket.objects.all()[:3].values('id', 'title', 'description'))
                logger.info(f"Assembly ticket search: Sample tickets before filter: {sample_before_filter}")
                
                # Test specific search for the query
                test_title_search = AssemblyTicket.objects.filter(title__icontains=query).count()
                test_desc_search = AssemblyTicket.objects.filter(description__icontains=query).count()
                logger.info(f"Assembly ticket search: Test search - title matches: {test_title_search}, description matches: {test_desc_search}")
                
                # Test specific search with permission filter
                if user.role in ["Admin", "Manager", "Warehouse Manager"]:
                    test_admin_title_search = AssemblyTicket.objects.select_related('created_by').filter(title__icontains=query).count()
                    test_admin_desc_search = AssemblyTicket.objects.select_related('created_by').filter(description__icontains=query).count()
                    logger.info(f"Assembly ticket search: Admin test search - title matches: {test_admin_title_search}, description matches: {test_admin_desc_search}")
                else:
                    test_user_title_search = AssemblyTicket.objects.select_related('created_by').filter(created_by=user, title__icontains=query).count()
                    test_user_desc_search = AssemblyTicket.objects.select_related('created_by').filter(created_by=user, description__icontains=query).count()
                    logger.info(f"Assembly ticket search: User test search - title matches: {test_user_title_search}, description matches: {test_user_desc_search}")
            
            # Get the results with enhanced information
            try:
                # Start with basic fields to avoid any field access issues
                results = list(queryset[:50].values(
                    'id', 'title', 'description', 'status', 'created_at', 'deadline'
                ))
                logger.info(f"Assembly ticket search: Successfully got basic values from queryset")
                
                # Now try to get enhanced fields
                try:
                    enhanced_results = list(queryset[:50].values(
                        'id', 'title', 'description', 'status', 'created_at', 'deadline',
                        'created_by__username', 'assigned_by__username', 'assembled_item_name',
                        'assembled_item_upc', 'assembly_notes', 'flagged', 'assigned_at', 'completed_at'
                    ))
                    logger.info(f"Assembly ticket search: Successfully got enhanced values from queryset")
                    results = enhanced_results
                except Exception as e:
                    logger.warning(f"Assembly ticket search: Could not get enhanced values, using basic values: {str(e)}")
                    # Continue with basic results
                    
            except Exception as e:
                logger.error(f"Assembly ticket search: Error getting values: {str(e)}")
                logger.error(f"Assembly ticket search: Query: {queryset.query}")
                return []
            
            # Get sample results for debugging
            sample_results = results[:3] if results else []
            logger.info(f"Assembly ticket search: Sample results: {sample_results}")
            
            logger.info(f"Assembly ticket search: Returning {len(results)} assembly ticket results")
            return results
            
        except Exception as e:
            logger.error(f"Assembly ticket search error: {str(e)}")
            logger.error(f"Assembly ticket model: {AssemblyTicket}")
            logger.error(f"Assembly ticket model fields: {[f.name for f in AssemblyTicket._meta.fields]}")
            raise
    
    def _search_transfers(self, query, user):
        """Search transfers"""
        queryset = Transfer.objects.select_related('from_warehouse', 'to_warehouse', 'created_by')
        
        # Apply user permissions
        if user.role not in ["Admin", "Manager", "Warehouse Manager"]:
            # Non-admin users can only see their own transfers
            queryset = queryset.filter(created_by=user)
        
        # Apply search filters
        filters = Q(reference_number__icontains=query) | Q(notes__icontains=query)
        if query.isdigit():
            filters |= Q(id=int(query))
        
        queryset = queryset.filter(filters)
        
        return list(queryset[:50].values(
            'id', 'reference_number', 'status', 'created_at', 'from_warehouse__name', 
            'to_warehouse__name', 'created_by__username', 'notes'
        ))
    
    def _search_vehicles(self, query, user):
        """Search vehicles"""
        queryset = Vehicle.objects.select_related('driver', 'category')
        
        # Apply user permissions
        if user.role not in ["Admin", "Manager"]:
            # Non-admin users can only see vehicles assigned to them
            queryset = queryset.filter(driver=user)
        
        # Apply search filters
        filters = Q(license_plate__icontains=query) | Q(make__icontains=query) | Q(model__icontains=query)
        if query.isdigit():
            filters |= Q(id=int(query))
        
        queryset = queryset.filter(filters)
        
        return list(queryset[:50].values(
            'id', 'license_plate', 'make', 'model', 'year', 'status', 'driver__username', 'category__name'
        ))


class TicketViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "list":
            return TicketListSerializer
        return TicketSerializer

    def get_queryset(self):
        user = self.request.user
        print(user)
        search = self.request.query_params.get("search")
        status_param = self.request.query_params.get("status")  # Keep existing status param
        calendar_status = self.request.query_params.getlist("calendar_status[]")  # New param for calendar
        user_id = self.request.query_params.get("user_id")
        customer_stores = self.request.query_params.get("customer_stores")
        start_date = self.request.query_params.get("start_date")
        end_date = self.request.query_params.get("end_date")
        ticket_content_type = ContentType.objects.get_for_model(Ticket)

        queryset = Ticket.objects.select_related(
            "assigned_by", "created_by", "store", "store__customer"
        ).prefetch_related(
            "assigned_to",
            Prefetch(
                "items",
                queryset=InventoryItem.objects.select_related("inventory", "warehouse"),
            ),
            Prefetch(
                "attachments",
                queryset=Attachment.objects.filter(content_type=ticket_content_type),
                to_attr="_prefetched_attachments",
            ),
        )

        if user.role in ["Admin", "Manager", "Warehouse Manager"]:
            pass
        elif user.role in ["Vending Customer", "Service Customer"]:
            # Show tickets created by the user or tickets for any of the user's stores
            queryset = queryset.filter(Q(created_by=user) | Q(store__customer=user))
        elif user.role in ["Technician", "Warehouse Technician"]:
            queryset = queryset.filter(
                assigned_to=user,
                status__in=["IN PROGRESS", "PARTIALLY CLOSED", "PENDING APPROVAL"],
            )
        elif user.role in ["Employee"]:            
            linked_customer_ids = PartnerCustomerLink.objects.filter(
                is_active=True
            ).values_list('vending_customer_id', flat=True)
            
            queryset = queryset.filter(
                Q(created_by=user) | 
                Q(store__customer_id__in=linked_customer_ids)
            )
            
        if user_id:
            try:
                user_id = int(user_id)
                queryset = queryset.filter(
                    Q(created_by_id=user_id) | Q(store__customer_id=user_id)
                )
            except ValueError:
                raise ValidationError({"detail": "Invalid user_id"})

        # Support explicit filter by a customer's stores (alias similar to transfers API)
        if customer_stores:
            try:
                cs_id = int(customer_stores)
                queryset = queryset.filter(store__customer_id=cs_id)
            except ValueError:
                raise ValidationError({"detail": "Invalid customer_stores"})

        # Handle regular status parameter (keep existing behavior)
        if status_param:
            valid_statuses = [
                "OPEN",
                "IN PROGRESS",
                "PARTIALLY CLOSED",
                "PENDING APPROVAL",
                "CLOSED",
            ]
            if status_param not in valid_statuses:
                raise ValidationError(
                    {"detail": f"Invalid status. Allowed values: {valid_statuses}"}
                )
            queryset = queryset.filter(status=status_param)

        # Handle calendar status parameter (new)
        if calendar_status:
            valid_statuses = [
                "OPEN",
                "IN PROGRESS",
                "PARTIALLY CLOSED",
                "PENDING APPROVAL",
                "CLOSED",
            ]
            invalid_statuses = [s for s in calendar_status if s not in valid_statuses]
            if invalid_statuses:
                raise ValidationError(
                    {"detail": f"Invalid calendar status(es): {invalid_statuses}. Allowed values: {valid_statuses}"}
                )
            queryset = queryset.filter(status__in=calendar_status)

        # Filter by date range (both created_at and deadline)
        if start_date and end_date:
            try:
                # Filter tickets that have deadlines within the date range OR were created within the range
                queryset = queryset.filter(
                    Q(deadline__range=[start_date, end_date]) | 
                    Q(created_at__date__range=[start_date, end_date])
                )
            except ValueError:
                raise ValidationError({"detail": "Invalid date format. Use YYYY-MM-DD"})
        elif start_date:
            try:
                queryset = queryset.filter(
                    Q(deadline__gte=start_date) | 
                    Q(created_at__date__gte=start_date)
                )
            except ValueError:
                raise ValidationError({"detail": "Invalid start_date format. Use YYYY-MM-DD"})
        elif end_date:
            try:
                queryset = queryset.filter(
                    Q(deadline__lte=end_date) | 
                    Q(created_at__date__lte=end_date)
                )
            except ValueError:
                raise ValidationError({"detail": "Invalid end_date format. Use YYYY-MM-DD"})

        if search:
            # Basic ticket fields
            filters = Q(title__icontains=search) | Q(description__icontains=search)
            
            # Search by ticket ID if search is numeric
            if search.isdigit():
                filters |= Q(id=int(search))
            
            # Search in store profile fields
            store_filters = (
                Q(store__store_name__icontains=search) |
                Q(store__store_address__icontains=search) |
                Q(store__store_city__icontains=search) |
                Q(store__store_zip_code__icontains=search) |
                Q(store__store_billing_email__icontains=search) |
                Q(store__store_phone__icontains=search) |
                Q(store__owner_name__icontains=search) |
                Q(store__owner_email__icontains=search) |
                Q(store__owner_phone__icontains=search) |
                Q(store__distributor_name__icontains=search) |
                Q(store__distributor_email__icontains=search) |
                Q(store__distributor_phone__icontains=search) |
                Q(store__manager_name__icontains=search) |
                Q(store__manager_email__icontains=search) |
                Q(store__manager_phone__icontains=search)
            )
            
            # Search in user fields (customer linked to store profile)
            user_filters = (
                Q(store__customer__username__icontains=search) |
                Q(store__customer__email__icontains=search) |
                Q(store__customer__phone_number__icontains=search)
            )
            
            # Search in assigned users
            assigned_user_filters = (
                Q(assigned_to__username__icontains=search) |
                Q(assigned_to__email__icontains=search) |
                Q(assigned_to__phone_number__icontains=search)
            )
            
            # Search in created_by user
            created_by_filters = (
                Q(created_by__username__icontains=search) |
                Q(created_by__email__icontains=search) |
                Q(created_by__phone_number__icontains=search)
            )
            
            # Search in assigned_by user
            assigned_by_filters = (
                Q(assigned_by__username__icontains=search) |
                Q(assigned_by__email__icontains=search) |
                Q(assigned_by__phone_number__icontains=search)
            )
            
            # Search in deadline date
            deadline_filters = Q()
            try:
                # Try to parse as date in various formats
                from datetime import datetime
                import re
                
                # Check if search contains date-like patterns
                date_patterns = [
                    r'\d{4}-\d{2}-\d{2}',  # YYYY-MM-DD
                    r'\d{2}/\d{2}/\d{4}',  # MM/DD/YYYY
                    r'\d{2}-\d{2}-\d{4}',  # MM-DD-YYYY
                    r'\d{1,2}/\d{1,2}/\d{4}',  # M/D/YYYY
                    r'\d{1,2}-\d{1,2}-\d{4}',  # M-D-YYYY
                ]
                
                for pattern in date_patterns:
                    if re.search(pattern, search):
                        # Try different date formats
                        date_formats = [
                            '%Y-%m-%d',
                            '%m/%d/%Y',
                            '%m-%d-%Y',
                            '%d/%m/%Y',
                            '%d-%m-%Y',
                        ]
                        
                        for date_format in date_formats:
                            try:
                                parsed_date = datetime.strptime(search, date_format).date()
                                deadline_filters |= Q(deadline=parsed_date)
                                break
                            except ValueError:
                                continue
                        break
                
                # Also search for partial date matches (year, month, day)
                if search.isdigit() and len(search) in [4, 2, 1]:
                    if len(search) == 4:  # Year
                        deadline_filters |= Q(deadline__year=int(search))
                    elif len(search) == 2:  # Month or day
                        deadline_filters |= Q(deadline__month=int(search)) | Q(deadline__day=int(search))
                    elif len(search) == 1:  # Single digit month or day
                        deadline_filters |= Q(deadline__month=int(search)) | Q(deadline__day=int(search))
                        
            except (ValueError, TypeError):
                # If date parsing fails, continue without deadline search
                pass
            
            # Combine all filters
            filters |= store_filters | user_filters | assigned_user_filters | created_by_filters | assigned_by_filters | deadline_filters
            
            queryset = queryset.filter(filters)

        return queryset

    def paginate_queryset(self, queryset):
        if self.request.query_params.get("all") == "true":
            return None
        return super().paginate_queryset(queryset)

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def _handle_ticket_status_change(self, ticket, new_status, request_user):
        """
        Handle all the logic related to changing a ticket's status.
        This includes handling transfers and item status updates.
        """
        if new_status == "CLOSED":
            ticket.completed_at = timezone.now()

            # Handle unused items - set them back to available and remove from ticket
            if ticket.items.exists():
                # Get all item IDs from the ticket
                all_ticket_items = set(ticket.items.values_list('id', flat=True))
                # Get used item IDs from item_usages
                used_item_ids = {int(item_id) for item_id, used in ticket.item_usages.items() if used} if ticket.item_usages else set()
                # Get defective item IDs from defective_items
                defective_item_ids = set()
                if ticket.defective_items:
                    defective_item_ids.update({int(item_id) for item_id, defective in ticket.defective_items.items() if defective})

                # Include items whose current status is already 'defective'
                db_defective_ids = set(ticket.items.filter(status='defective').values_list('id', flat=True))
                defective_item_ids.update(db_defective_ids)

                # Calculate unused item IDs (items that are neither used nor defective)
                unused_item_ids = all_ticket_items - used_item_ids - defective_item_ids
                
                if unused_item_ids:
                    # Update status of unused items to available
                    InventoryItem.objects.filter(id__in=unused_item_ids).update(status='available')
                    # Remove unused items from the ticket
                    ticket.items.remove(*unused_item_ids)
                    logger.info(f"Removed {len(unused_item_ids)} unused items from ticket {ticket.id} and set them to available")

            # Create transfers only for items with 'in_use' status
            if ticket.item_usages:
                used_item_ids = [item_id for item_id, used in ticket.item_usages.items() if used]
                
                if used_item_ids:
                    items_by_warehouse = {}
                    for item_id_str in used_item_ids:
                        try:
                            item_id = int(item_id_str)
                            item = InventoryItem.objects.select_related('warehouse').get(id=item_id)
                            # Only include items that are 'in_use' (or already 'consumed') and have a warehouse
                            if item.warehouse and item.status in ['in_use', 'defective', 'consumed']:
                                if item.warehouse.id not in items_by_warehouse:
                                    items_by_warehouse[item.warehouse.id] = []
                                items_by_warehouse[item.warehouse.id].append(item)
                            elif item.status == 'consumed':
                                logger.info(f"Skipping item {item_id} as it's already consumed")
                        except (ValueError, InventoryItem.DoesNotExist):
                            logger.warning(f"Could not process item_id {item_id_str} for transfer creation on ticket {ticket.id}")
                            continue

                    # Only proceed with transfer creation if there are items to transfer
                    if items_by_warehouse:
                        warehouse_content_type = ContentType.objects.get_for_model(Warehouse)
                        account_content_type = ContentType.objects.get_for_model(Account)

                        for warehouse_id, items_in_warehouse in items_by_warehouse.items():
                            if not items_in_warehouse:
                                continue

                            item_ids_for_transfer = [item.id for item in items_in_warehouse]
                            
                            # Get inventory_id from the first item (all items should be from the same inventory)
                            inventory_id = items_in_warehouse[0].inventory_id if items_in_warehouse else None
                            
                            items_data = [
                                {
                                    "quantity": len(item_ids_for_transfer),
                                    "item_ids": item_ids_for_transfer,
                                    "inventory_id": inventory_id,
                                }
                            ]

                            try:
                                with transaction.atomic():
                                    print(f"Creating transfer for ticket {ticket.id} from warehouse {warehouse_id}")
                                    # Determine if we should use store or customer
                                    if ticket.store:
                                        # Use store-based transfer
                                        transfer = Transfer.objects.create(
                                            transfer_type="WAREHOUSE_TO_STORE",
                                            created_by=request_user,
                                            source_content_type=warehouse_content_type,
                                            source_object_id=warehouse_id,
                                            destination_content_type=ContentType.objects.get(model='storeprofile'),
                                            destination_object_id=ticket.store.id,
                                        )
                                    else:
                                        # Fallback to customer-based transfer (legacy)
                                        transfer = Transfer.objects.create(
                                            transfer_type="WAREHOUSE_TO_CUSTOMER",
                                            created_by=request_user,
                                            source_content_type=warehouse_content_type,
                                            source_object_id=warehouse_id,
                                            destination_content_type=account_content_type,
                                            destination_object_id=ticket.customer_id,
                                        )
                                    transfer.process_transfer(items_data)
                                    logger.info(f"Created transfer {transfer.id} for ticket {ticket.id} from warehouse {warehouse_id}")

                            except Exception as e:
                                logger.error(f"Failed to create transfer for ticket {ticket.id}, warehouse {warehouse_id}: {str(e)}")
                    else:
                        logger.info(f"No items with 'in_use' status found for ticket {ticket.id}, skipping transfer creation")

            # Handle defective items and create repair tickets
            if ticket.defective_items:
                defective_item_ids = set()
                if ticket.defective_items:
                    defective_item_ids.update({int(item_id) for item_id, defective in ticket.defective_items.items() if defective})

                # Fallback: include any items on the ticket whose status is already 'defective'
                db_defective_ids = set(ticket.items.filter(status='defective').values_list('id', flat=True))
                defective_item_ids.update(db_defective_ids)

                if defective_item_ids:
                    # Get all defective items
                    defective_items = InventoryItem.objects.filter(id__in=defective_item_ids)
                    
                    # Group items by their original vendor (from first VENDOR_TO_WAREHOUSE transfer)
                    items_by_vendor = {}
                    vendor_content_type = ContentType.objects.get(model='vendor')
                    
                    for item in defective_items:
                        # Find the first VENDOR_TO_WAREHOUSE transfer for this item
                        vendor_transfer = Transfer.objects.filter(
                            transfer_type='VENDOR_TO_WAREHOUSE',
                            source_content_type=vendor_content_type,
                            items=item
                        ).order_by('created_at').first()
                        
                        if vendor_transfer:
                            vendor_id = vendor_transfer.source_object_id
                            if vendor_id not in items_by_vendor:
                                items_by_vendor[vendor_id] = []
                            items_by_vendor[vendor_id].append(item)
                        else:
                            # If no vendor found, group under None
                            if None not in items_by_vendor:
                                items_by_vendor[None] = []
                            items_by_vendor[None].append(item)
                    
                    # Create repair tickets for each vendor group
                    for vendor_id, items in items_by_vendor.items():
                        try:
                            with transaction.atomic():
                                repair = Repair.objects.create(
                                    vendor_id=vendor_id,  # Will be None if no vendor found
                                    status="PENDING",
                                    information={
                                        "notes": f"Defective items from ticket #{ticket.id}",
                                        "tracking_number": "",
                                        "reference_number": f"TICKET-{ticket.id}"
                                    },
                                    created_by=request_user
                                )
                                repair.inventory_items.set(items)
                                
                                # Update items status to in_repair
                                for item in items:
                                    item.status = "in_repair"
                                    item.save()
                                
                                logger.info(f"Created repair ticket {repair.id} for {len(items)} defective items from ticket {ticket.id}")
                        except Exception as e:
                            logger.error(f"Failed to create repair ticket for defective items in ticket {ticket.id}: {str(e)}")

        ticket.status = new_status
        ticket.save()

    def perform_update(self, serializer):
        """Override perform_update to handle status changes during regular updates"""
        instance = serializer.instance
        old_status = instance.status
        
        # Save the instance first
        instance = serializer.save()
        
        # If status changed to CLOSED, handle the status change
        if instance.status == "CLOSED" and old_status != "CLOSED":
            self._handle_ticket_status_change(instance, "CLOSED", self.request.user)
        
        return instance

    @action(detail=True, methods=["post"], url_path="change_status")
    def change_status(self, request, pk=None):
        ticket = self.get_object()
        new_status = request.data.get("status")
        valid_statuses = [
            "OPEN",
            "IN PROGRESS",
            "PARTIALLY CLOSED",
            "PENDING APPROVAL",
            "CLOSED",
        ]

        if not new_status:
            return Response(
                {"detail": "Status is required."}, status=status.HTTP_400_BAD_REQUEST
            )

        if new_status not in valid_statuses:
            return Response(
                {"detail": f"Invalid status. Allowed values: {valid_statuses}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        self._handle_ticket_status_change(ticket, new_status, request.user)
        
        return Response(
            {"detail": f"Ticket status changed to {new_status}." + (" Transfers created if applicable." if new_status == "CLOSED" and ticket.item_usages else "")},
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="create-invoice")
    def create_invoice(self, request, pk=None):
        """Create an invoice from ticket charges"""
        ticket = self.get_object()
        user = request.user

        # Check if user has permission to create invoices
        if user.role not in ["Admin", "Manager", "Technician"]:
            return Response(
                {"detail": "You don't have permission to create invoices"},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Check if ticket has charges
        if not ticket.charges or len(ticket.charges) == 0:
            return Response(
                {"detail": "No charges found in this ticket"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check if an invoice has already been created from this ticket's charges
        for charge in ticket.charges:
            if charge.get('invoice_created', False):
                return Response(
                    {"detail": "An invoice has already been created from this ticket's charges"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Ensure the ticket is linked to a store (customer moved to store)
        if not getattr(ticket, 'store', None):
            return Response(
                {"detail": "Ticket is not linked to any store. Please link a store to the ticket before creating an invoice."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            with transaction.atomic():
                # Get or create Manual charge type
                manual_charge_type, created = InvoiceChargeType.objects.get_or_create(
                    name="Manual",
                    charge_type="MANUAL",
                    defaults={
                        "value": Decimal('0.00'),
                        "is_compulsory": False,
                        "is_active": True,
                        "description": "Manual charges created from tickets"
                    }
                )

                # Create invoice without invoice_number first, let the save method generate it
                invoice = Invoice(
                    store=ticket.store,
                    created_by=user,
                    notes=f"Invoice created from ticket #{ticket.id}: {ticket.title}",
                    status="DRAFT", # TODO: change to paid
                    due_date=timezone.now() + timedelta(days=10),
                    issue_date=timezone.now()
                )
                invoice.save()

                # Add charges to invoice and mark them as invoice_created
                total_charges = Decimal('0.00')
                updated_charges = []
                
                for i, charge_data in enumerate(ticket.charges):
                    amount = Decimal(str(charge_data.get('amount', 0)))
                    description = charge_data.get('description', '')
                    
                    if amount > 0:
                        # Create a custom charge type for this specific charge with unique name
                        timestamp = timezone.now().strftime("%Y%m%d_%H%M%S")
                        custom_charge_type = InvoiceChargeType.objects.create(
                            name=f"Ticket Charge #{ticket.id} : {description[:30]}",
                            charge_type="MANUAL",
                            value=amount,
                            is_compulsory=False,
                            is_active=True,
                            description=f"Manual charge from ticket #{ticket.id}: {description}"
                        )
                        
                        # Create the invoice charge
                        InvoiceCharge.objects.create(
                            invoice=invoice,
                            charge_type=custom_charge_type,
                            amount=amount,
                        )
                        
                        total_charges += amount
                        
                        # Mark this charge as invoice_created
                        charge_data['invoice_created'] = True
                        charge_data['invoice_id'] = invoice.id
                        charge_data['invoice_number'] = invoice.invoice_number
                        charge_data['invoice_created_at'] = timezone.now().isoformat()
                    
                    updated_charges.append(charge_data)

                # Update the ticket charges with invoice_created flags
                ticket.charges = updated_charges
                ticket.save(update_fields=['charges'])

                # Apply compulsory charges (percentage uses total manual charges as base)
                invoice.apply_compulsory_charges(base_amount=total_charges)
                invoice.save()

                return Response({
                    "detail": "Invoice created successfully",
                    "invoice_id": invoice.id,
                    "invoice_number": invoice.invoice_number,
                    "total_amount": str(invoice.total_amount)
                })

        except Exception as e:
            logger.error(f"Error creating invoice from ticket {ticket.id}: {str(e)}")
            return Response(
                {"detail": f"Error creating invoice: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def destroy(self, request, *args, **kwargs):
        ticket = self.get_object()
        if request.user.role in ["Admin", "Vending Customer", "Service Customer"]:
            if (
                request.user.role in ["Vending Customer", "Service Customer"]
                and ticket.created_by != request.user
            ):
                return Response(
                    {"detail": "You do not have permission to delete this ticket."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            with transaction.atomic():
                ticket.delete()
            return Response(
                {"detail": "Ticket deleted successfully."},
                status=status.HTTP_204_NO_CONTENT,
            )
        return Response(
            {"detail": "You do not have permission to delete this ticket."},
            status=status.HTTP_403_FORBIDDEN,
        )

    @action(detail=False, methods=['get'])
    def admin_dashboard_stats(self, request):
        """
        Get all statistics for admin dashboard including:
        - Total counts of different user types
        - Total warehouses
        - Total vehicles
        - Income stats from vault by month (only for Admin users)
        - Ticket status distribution
        """
        try:
            # Get user counts by role
            user_counts = Account.objects.filter(is_active=True).values('role').annotate(
                count=Count('id')
            )
            
            # Convert to dictionary for easier access
            role_counts = {
                item['role']: item['count'] 
                for item in user_counts
            }
            
            # Get warehouse count
            warehouse_count = Warehouse.objects.filter(status='active').count()
            
            # Get vehicle count
            vehicle_count = Vehicle.objects.exclude(status='retired').count()
            
            # Initialize monthly totals with zeros
            monthly_income = {
                'jan': 0, 'feb': 0, 'mar': 0, 'apr': 0,
                'may': 0, 'jun': 0, 'jul': 0, 'aug': 0,
                'sep': 0, 'oct': 0, 'nov': 0, 'dec': 0
            }

            # Only calculate vault income for Admin users
            if request.user.role == 'Admin':
                # Calculate monthly income from vault entries
                now = timezone.now()
                current_year = now.year

                # Get all vault entries for the current year
                vault_entries = VaultEntry.objects.filter(
                    entry_type='deposit',
                    created_at__year=current_year
                ).values('created_at__month').annotate(
                    total=Sum('amount', default=Decimal('0.00'))
                )

                # Map month numbers to month names
                month_map = {
                    1: 'jan', 2: 'feb', 3: 'mar', 4: 'apr',
                    5: 'may', 6: 'jun', 7: 'jul', 8: 'aug',
                    9: 'sep', 10: 'oct', 11: 'nov', 12: 'dec'
                }

                # Fill in the actual totals
                for entry in vault_entries:
                    month_name = month_map[entry['created_at__month']]
                    monthly_income[month_name] = float(entry['total'])
            
            # Get ticket counts by status
            ticket_stats = Ticket.objects.values('status').annotate(
                count=Count('id')
            )
            
            # Convert to dictionary
            ticket_counts = {
                item['status']: item['count']
                for item in ticket_stats
            }
            
            return Response({
                'user_stats': {
                    'vending_customers': role_counts.get('Vending Customer', 0),
                    'service_customers': role_counts.get('Service Customer', 0),
                    'technicians': role_counts.get('Technician', 0),
                    'reporters': role_counts.get('Reporter', 0),
                    'warehouse_managers': role_counts.get('Warehouse Manager', 0),
                    'warehouse_technicians': role_counts.get('Warehouse Technician', 0),
                },
                'warehouse_count': warehouse_count,
                'vehicle_count': vehicle_count,
                'income_stats': monthly_income,
                'ticket_stats': ticket_counts,
            })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class TicketReviewViewSet(viewsets.ViewSet):
    # Allow unauthenticated customers to submit review via emailed link
    permission_classes = [permissions.AllowAny]

    @action(detail=True, methods=["post"], url_path="review")
    def submit_review(self, request, pk=None):
        try:
            decoded_bytes = base64.b64decode(pk)
            ticket_id = decoded_bytes.decode("utf-8")
            ticket = Ticket.objects.get(id=ticket_id)
        except (base64.binascii.Error, UnicodeDecodeError, ObjectDoesNotExist):
            return Response(
                {"error": "Invalid ticket ID or ticket not found."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        review_text = request.data.get("reviewText")
        if not review_text:
            return Response(
                {"error": "Review text is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Determine the acting user: authenticated user, otherwise store's linked customer
        acting_user = request.user if getattr(request.user, 'is_authenticated', False) else None
        if acting_user is None:
            try:
                acting_user = ticket.store.customer if ticket.store and ticket.store.customer else None
            except Exception:
                acting_user = None
        if acting_user is None:
            return Response({"error": "Could not determine customer user."}, status=status.HTTP_400_BAD_REQUEST)

        # Prevent duplicate review by the same acting user
        if TicketNotes.objects.filter(ticket=ticket, status="Service Customer", created_by=acting_user).exists():
            return Response({"error": "You have already submitted a review for this ticket."}, status=status.HTTP_400_BAD_REQUEST)

        # Create the review note directly to avoid serializer's request.user dependency
        TicketNotes.objects.create(
            ticket=ticket,
            description=review_text,
            status="Service Customer",
            created_by=acting_user,
        )
        return Response({"message": "Review submitted successfully!"}, status=status.HTTP_201_CREATED)


class SupportTicketViewSet(viewsets.ModelViewSet):
    serializer_class = SupportTicketSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = SupportTicket.objects.select_related('created_by').all()
        search = self.request.query_params.get("search")

        if search:
            filters = Q(title__icontains=search) | Q(created_by__username__icontains=search)
            if search.isdigit():
                filters |= Q(id=int(search))
            queryset = queryset.filter(filters)
        
        return queryset

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class InventoryCategoryViewSet(viewsets.ModelViewSet):
    queryset = InventoryCategory.objects.all()
    serializer_class = InventoryCategorySerializer
    
    def get_queryset(self):
        search = self.request.query_params.get("search")
        ordering = self.request.query_params.get("ordering")
        
        queryset = InventoryCategory.objects.all()
        
        # Apply search filter
        if search:
            queryset = queryset.filter(name__icontains=search)
        
        # Apply ordering
        if ordering:
            logger.info(f"Applying ordering: {ordering}")
            try:
                queryset = queryset.order_by(ordering)
            except Exception as e:
                logger.warning(f"Invalid ordering parameter: {ordering}, error: {str(e)}")
                # Fallback to default ordering
                queryset = queryset.order_by('name')
        else:
            # Default ordering
            queryset = queryset.order_by('name')
        
        return queryset
    
    def paginate_queryset(self, queryset):
        if self.request.query_params.get("all") == "true":
            return None  # disables pagination
        return super().paginate_queryset(queryset)


class InventoryViewSet(viewsets.ModelViewSet):
    queryset = Inventory.objects.all()
    serializer_class = InventorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        inventory_ct = ContentType.objects.get_for_model(Inventory)
        queryset = Inventory.objects.select_related("category").prefetch_related(
            Prefetch(
                "locations",
                queryset=InventoryLocation.objects.select_related("warehouse"),
            ),
            Prefetch(
                "items", queryset=InventoryItem.objects.select_related("warehouse")
            ),
            Prefetch(
                "attachments",
                queryset=Attachment.objects.filter(content_type=inventory_ct),
                to_attr="_prefetched_attachments",
            ),
        )
        status_filter = self.request.query_params.get("status")
        has_available = self.request.query_params.get("has_available")
        category_id = self.request.query_params.get("category_id")

        if status_filter:
            valid_statuses = [status[0] for status in InventoryItem.STATUS_CHOICES]
            if status_filter not in valid_statuses:
                raise ValidationError(
                    {"detail": f"Invalid status. Allowed values: {valid_statuses}"}
                )
            queryset = queryset.filter(items__status=status_filter).distinct()

        if has_available:
            queryset = queryset.filter(items__status="available").distinct()

        if category_id:
            try:
                queryset = queryset.filter(category_id=int(category_id))
            except ValueError:
                raise ValidationError({"detail": "Invalid category_id"})

        return queryset

    @action(detail=True, methods=["post"], url_path="print-labels")
    def print_labels(self, request, pk=None):
        """Generate printer commands for label printing"""
        inventory = self.get_object()
        printer_type = request.data.get("printer_type", "zpl")
        label_size = request.data.get("label_size", {"width": 50, "height": 25})
        quantity = request.data.get("quantity", 1)
        
        # Generate printer commands based on type
        if printer_type == "zpl":
            commands = self._generate_zpl_commands(inventory, label_size, quantity)
        elif printer_type == "epl":
            commands = self._generate_epl_commands(inventory, label_size, quantity)
        else:
            return Response(
                {"error": "Unsupported printer type"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return Response({
            "commands": commands,
            "printer_type": printer_type,
            "label_size": label_size,
            "quantity": quantity
        })

    @action(detail=True, methods=["post"], url_path="print-labels-direct")
    def print_labels_direct(self, request, pk=None):
        """Print labels directly to connected printer"""
        inventory = self.get_object()
        printer_type = request.data.get("printer_type", "zpl")
        label_size = request.data.get("label_size", {"width": 50, "height": 25})
        quantity = request.data.get("quantity", 1)
        printer_config = request.data.get("printer_config", {})
        
        # Generate printer commands
        if printer_type == "zpl":
            commands = self._generate_zpl_commands(inventory, label_size, quantity)
        elif printer_type == "epl":
            commands = self._generate_epl_commands(inventory, label_size, quantity)
        else:
            return Response(
                {"error": "Unsupported printer type"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Send commands to printer
        success = False
        error_message = ""
        
        try:
            if printer_config.get("type") == "network":
                success = printer_service.send_to_network_printer(
                    printer_config["ip_address"],
                    printer_config["port"],
                    commands
                )
            elif printer_config.get("type") == "usb":
                success = printer_service.send_to_usb_printer(
                    printer_config["device_path"],
                    commands
                )
            elif printer_config.get("type") == "serial":
                success = printer_service.send_to_serial_printer(
                    printer_config["port"],
                    printer_config["baudrate"],
                    commands
                )
            else:
                error_message = "Invalid printer configuration"
        except Exception as e:
            error_message = str(e)
        
        if success:
            return Response({
                "message": f"Successfully printed {quantity} labels",
                "printer_type": printer_type,
                "label_size": label_size,
                "quantity": quantity
            })
        else:
            return Response(
                {"error": f"Failed to print labels: {error_message}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=["get"], url_path="available-printers")
    def get_available_printers(self, request):
        """Get list of available printers on the system"""
        try:
            printers = printer_service.get_available_printers()
            return Response(printers)
        except Exception as e:
            return Response(
                {"error": f"Failed to get printers: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=["post"], url_path="test-printer")
    def test_printer(self, request):
        """Test connection to a printer"""
        printer_config = request.data.get("printer_config", {})
        
        try:
            success = printer_service.test_printer_connection(printer_config)
            if success:
                return Response({"message": "Printer connection test successful"})
            else:
                return Response(
                    {"error": "Printer connection test failed"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Exception as e:
            return Response(
                {"error": f"Printer test failed: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _generate_zpl_commands(self, inventory, label_size, quantity):
        """Generate ZPL commands for Zebra printers"""
        width_dots = int(label_size["width"] * 8)  # 203 DPI = 8 dots per mm
        height_dots = int(label_size["height"] * 8)
        
        return f"""^XA
^PW{width_dots}
^LL{height_dots}
^LS0
^FO50,50^A0N,30,30^FD{inventory.name}^FS
^FO50,100^A0N,25,25^FDUPC: {inventory.upc}^FS
^FO50,150^BY3^BCN,50,Y,N,N^FD{inventory.upc}^FS
^XZ""".repeat(quantity)

    def _generate_epl_commands(self, inventory, label_size, quantity):
        """Generate EPL commands for Epson printers"""
        width_dots = int(label_size["width"] * 8)  # 203 DPI = 8 dots per mm
        height_dots = int(label_size["height"] * 8)
        
        return f"""N
q{width_dots}
Q{height_dots}
ZT
A50,50,0,2,1,1,N,"{inventory.name}"
A50,100,0,2,1,1,N,"UPC: {inventory.upc}"
B50,150,0,1,2,2,50,B,"{inventory.upc}"
P{quantity}""".repeat(quantity)

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def paginate_queryset(self, queryset):
        if self.request.query_params.get("all") == "true":
            return None  # disables pagination
        return super().paginate_queryset(queryset)


class InventorySimpleViewSet(viewsets.ModelViewSet):
    serializer_class = InventorySimpleSerializer  # default
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        """Switch to lightweight serializer when ?list=true is requested."""
        if self.request.query_params.get("list") in ("true", "True", "1"):  # tolerate various truthy forms
            from commonapp.serializers import InventorySimpleListSerializer
            return InventorySimpleListSerializer
        return super().get_serializer_class()

    @action(detail=False, methods=["post"], url_path="generate-upc")
    def generate_upc(self, request):
        """Generate a unique UPC string from a provided inventory name.
        This does not persist anything; it only returns a collision-free UPC
        based on current Inventory.upc values.
        """
        try:
            name = (request.data.get("name") or "").strip()
            if not name:
                return Response({"detail": "'name' is required"}, status=status.HTTP_400_BAD_REQUEST)

            import re, uuid

            # Normalize to alphanumeric, lowercased, remove separators
            base = re.sub(r"[^A-Za-z0-9]+", "", name).lower()
            if not base:
                base = "item"

            candidate = base
            # Ensure uniqueness against existing Inventory UPCs
            from commonapp.models import Inventory
            attempts = 0
            while Inventory.objects.filter(upc=candidate).exists() and attempts < 25:
                suffix = uuid.uuid4().hex[:6]
                candidate = f"{base}_{suffix}"
                attempts += 1

            if Inventory.objects.filter(upc=candidate).exists():
                # Fallback extremely unlikely
                candidate = f"{base}_{uuid.uuid4().hex[:8]}"

            return Response({"upc": candidate})
        except Exception as e:
            logger.error(f"Failed to generate UPC: {str(e)}")
            return Response({"detail": "Failed to generate UPC"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def get_queryset(self):
        search = self.request.query_params.get("search")
        upc = self.request.query_params.get("upc")
        warehouse_id = self.request.query_params.get("warehouse_id")
        has_available = self.request.query_params.get("has_available")
        category_id = self.request.query_params.get("category_id")
        low_stock_min = self.request.query_params.get("low_stock_min")
        low_stock_max = self.request.query_params.get("low_stock_max")
        ordering = self.request.query_params.get("ordering")

        inventory_ct = ContentType.objects.get_for_model(Inventory)

        queryset = Inventory.objects.select_related("category").prefetch_related(
            Prefetch(
                "locations",
                queryset=InventoryLocation.objects.select_related("warehouse"),
            ),
            Prefetch(
                "items", queryset=InventoryItem.objects.select_related("warehouse")
            ),
            Prefetch(
                "attachments",
                queryset=Attachment.objects.filter(content_type=inventory_ct),
                to_attr="_prefetched_attachments",
            ),
        )

        if upc:
            queryset = queryset.filter(upc=upc)

        if warehouse_id:
            try:
                warehouse_id = int(warehouse_id)
                queryset = queryset.filter(
                    Q(items__warehouse_id=warehouse_id)
                    | Q(locations__warehouse_id=warehouse_id)
                ).distinct()
            except ValueError:
                raise ValidationError({"detail": "Invalid warehouse_id"})

        if has_available:
            queryset = queryset.filter(items__status="available").distinct()

        if category_id:
            try:
                queryset = queryset.filter(category_id=int(category_id))
            except ValueError:
                raise ValidationError({"detail": "Invalid category_id"})

        if search:
            # Search in inventory fields
            inventory_filters = (
                Q(name__icontains=search) |
                Q(upc__icontains=search) |
                Q(unit_price__icontains=search) |
                Q(price__icontains=search) |
                Q(description__icontains=search) |
                Q(category__name__icontains=search)
            )

            # Search in related inventory items' attributes
            item_filters = Q(items__attributes__serial_number__icontains=search) | \
                         Q(items__attributes__mac_address__icontains=search) | \
                         Q(items__attributes__ip_address__icontains=search) | \
                         Q(items__attributes__service_tag__icontains=search) | \
                         Q(items__attributes__service_number__icontains=search) | \
                         Q(items__attributes__model__icontains=search) | \
                         Q(items__attributes__brand__icontains=search) | \
                         Q(items__attributes__manufacturer__icontains=search) | \
                         Q(items__attributes__color__icontains=search) | \
                         Q(items__attributes__size__icontains=search) | \
                         Q(items__attributes__location__icontains=search) | \
                         Q(items__attributes__icontains=search)

            # If numeric search, also search by IDs
            if search.isdigit():
                inventory_filters |= Q(id=int(search))
                item_filters |= Q(items__id=int(search))

            # Combine all filters
            queryset = queryset.filter(inventory_filters | item_filters).distinct()

        # Handle low stock range filtering
        if low_stock_min or low_stock_max:
            # Annotate queryset with available quantity for filtering
            queryset = queryset.annotate(
                available_count=Count(
                    'items',
                    filter=Q(items__status='available')
                )
            )
            
            if warehouse_id:
                # If warehouse_id is specified, filter by available items in that warehouse
                queryset = queryset.annotate(
                    available_count=Count(
                        'items',
                        filter=Q(items__status='available', items__warehouse_id=warehouse_id)
                    )
                )

            # Apply min filter
            if low_stock_min:
                try:
                    min_value = int(low_stock_min)
                    queryset = queryset.filter(available_count__gte=min_value)
                except ValueError:
                    raise ValidationError({"detail": "Invalid low_stock_min value"})

            # Apply max filter
            if low_stock_max:
                try:
                    max_value = int(low_stock_max)
                    queryset = queryset.filter(available_count__lte=max_value)
                except ValueError:
                    raise ValidationError({"detail": "Invalid low_stock_max value"})

        # Apply ordering
        if ordering:
            logger.info(f"Applying ordering: {ordering}")
            # Handle special cases for related fields
            if ordering == 'category':
                queryset = queryset.order_by('category__name')
            elif ordering == '-category':
                queryset = queryset.order_by('-category__name')
            elif ordering == 'total_quantity':
                queryset = queryset.annotate(
                    total_count=Count('items')
                ).order_by('total_count')   
            elif ordering == '-total_quantity':
                queryset = queryset.annotate(
                    total_count=Count('items')
                ).order_by('-total_count')
            elif ordering == 'available_quantity':
                queryset = queryset.annotate(
                    available_count=Count('items', filter=Q(items__status='available'))
                ).order_by('available_count')
            elif ordering == '-available_quantity':
                queryset = queryset.annotate(
                    available_count=Count('items', filter=Q(items__status='available'))
                ).order_by('-available_count')
            else:
                # For direct fields like name, upc
                try:
                    queryset = queryset.order_by(ordering)
                except Exception as e:
                    logger.warning(f"Invalid ordering parameter: {ordering}, error: {str(e)}")
                    # Fallback to default ordering
                    queryset = queryset.order_by('name')
        else:
            # Default ordering
            queryset = queryset.order_by('name')

        return queryset

    def get_serializer_context(self):
        context = super().get_serializer_context()
        warehouse_id = self.request.query_params.get("warehouse_id")
        if warehouse_id:
            try:
                context["warehouse_id"] = int(warehouse_id)
            except ValueError:
                pass
        return context
    
    def paginate_queryset(self, queryset):
        if self.request.query_params.get("all") == "true":
            return None  # disables pagination
        return super().paginate_queryset(queryset)

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response(
                {"detail": f"Failed to create inventory: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

    def update(self, request, *args, **kwargs):
        from django.db import transaction
        import time
        from django.db.utils import OperationalError

        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)

        max_retries = 3
        retry_delay = 0.5  # seconds

        for attempt in range(max_retries):
            try:
                with transaction.atomic():
                    serializer.is_valid(raise_exception=True)
                    self.perform_update(serializer)
                    return Response(serializer.data)
            except OperationalError as e:
                if "database is locked" in str(e) and attempt < max_retries - 1:
                    time.sleep(retry_delay)
                    continue
                return Response(
                    {"detail": "Database is temporarily locked. Please try again."},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE
                )
            except Exception as e:
                return Response(
                    {"detail": f"Failed to update inventory: {str(e)}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        return Response(
            {"detail": "Failed to update after multiple attempts. Please try again."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )


class InventoryItemViewSet(viewsets.ModelViewSet):
    queryset = InventoryItem.objects.all()
    serializer_class = InventoryItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        inventory_id = self.request.query_params.get("inventory_id")
        warehouse_id = self.request.query_params.get("warehouse_id")
        status = self.request.query_params.get("status")
        if inventory_id:
            queryset = queryset.filter(inventory_id=inventory_id)
        if warehouse_id:
            queryset = queryset.filter(warehouse_id=warehouse_id)
        if status:
            queryset = queryset.filter(status=status)
        return queryset.select_related("inventory", "warehouse")


# Repairs Management
class RepairViewSet(viewsets.ModelViewSet):
    queryset = Repair.objects.all()
    serializer_class = RepairSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Repair.objects.select_related(
            "vendor",
            "created_by",
            "approved_by"
        ).prefetch_related(
            Prefetch(
                "inventory_items",
                queryset=InventoryItem.objects.select_related("inventory", "warehouse"),
            )
        )

        user = self.request.user
        search = self.request.query_params.get("search")
        status_param = self.request.query_params.get("status")
        start_date = self.request.query_params.get("start_date")
        end_date = self.request.query_params.get("end_date")
        vendor_id = self.request.query_params.get("vendor_id")

        # Filter based on user role
        if user.role not in ["Admin", "Manager", "Warehouse Manager"]:
            # Technicians can only see repairs they created
            if user.role in ["Technician", "Warehouse Technician"]:
                queryset = queryset.filter(created_by=user)
            else:
                # Other roles (e.g., customers) should not see repairs
                return queryset.none()

        if status_param:
            valid_statuses = ["PENDING", "APPROVED", "REPAIRED"]
            if status_param not in valid_statuses:
                raise ValidationError(
                    {"detail": f"Invalid status. Allowed values: {valid_statuses}"}
                )
            queryset = queryset.filter(status=status_param)

        if vendor_id:
            try:
                queryset = queryset.filter(vendor_id=int(vendor_id))
            except ValueError:
                raise ValidationError({"detail": "Invalid vendor_id"})

        if search:
            queryset = queryset.filter(
                Q(inventory_items__inventory__name__icontains=search) |
                Q(inventory_items__inventory__upc__icontains=search) |
                Q(vendor__name__icontains=search, vendor__isnull=False) |
                Q(information__notes__icontains=search) |
                Q(information__tracking_number__icontains=search) |
                Q(information__reference_number__icontains=search)
            )

        # Date range filtering on created_at
        if start_date:
            try:
                start_date_obj = datetime.strptime(start_date, "%Y-%m-%d").date()
                queryset = queryset.filter(created_at__date__gte=start_date_obj)
            except ValueError:
                raise ValidationError({"detail": "Invalid start_date format. Expected YYYY-MM-DD."})

        if end_date:
            try:
                end_date_obj = datetime.strptime(end_date, "%Y-%m-%d").date()
                queryset = queryset.filter(created_at__date__lte=end_date_obj)
            except ValueError:
                raise ValidationError({"detail": "Invalid end_date format. Expected YYYY-MM-DD."})

        return queryset.order_by("-created_at")

    def perform_create(self, serializer):
        user = self.request.user
        if user.role not in ["Technician", "Warehouse Technician", "Admin", "Manager", "Warehouse Manager"]:
            raise ValidationError({"detail": "You do not have permission to create a repair ticket."})
        serializer.save(created_by=user)

    def paginate_queryset(self, queryset):
        if self.request.query_params.get("all") == "true":
            return None  # disables pagination
        return super().paginate_queryset(queryset)
    

    @action(detail=True, methods=["post"], url_path="change_status")
    def change_status(self, request, pk=None):
        repair = self.get_object()
        new_status = request.data.get("status")
        valid_statuses = ["PENDING", "APPROVED", "REPAIRED"]

        if not new_status:
            return Response(
                {"detail": "Status is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if new_status not in valid_statuses:
            return Response(
                {"detail": f"Invalid status. Allowed values: {valid_statuses}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Permissions for status changes
        if new_status == "APPROVED" and request.user.role not in ["Admin", "Manager", "Warehouse Manager"]:
            return Response(
                {"detail": "You do not have permission to approve repairs."},
                status=status.HTTP_403_FORBIDDEN
            )
        if new_status == "REPAIRED" and request.user.role not in ["Admin", "Warehouse Manager"]:
            return Response(
                {"detail": "You do not have permission to mark repairs as repaired."},
                status=status.HTTP_403_FORBIDDEN
            )

        with transaction.atomic():
            # Validate consumed items when moving to PENDING or APPROVED
            if new_status in ["PENDING", "APPROVED"]:
                for item in repair.inventory_items.all():
                    if item.status == "consumed":
                        return Response(
                            {"detail": f"Cannot change status to {new_status} because item ID {item.id} is already consumed."},
                            status=status.HTTP_400_BAD_REQUEST
                        )

            repair.status = new_status
            if new_status == "APPROVED":
                repair.approved_by = request.user
                repair.approved_at = timezone.now()
            elif new_status in ["PENDING", "REPAIRED"]:
                repair.approved_by = None
                repair.approved_at = None
            repair.save()

            # Update inventory item statuses
            for item in repair.inventory_items.all():
                if new_status == "REPAIRED":
                    item.status = "available"
                elif new_status in ["PENDING", "APPROVED"]:
                    item.status = "in_repair"
                item.save()

        return Response(
            {"detail": f"Repair status changed to {new_status}."},
            status=status.HTTP_200_OK
        )

    def destroy(self, request, *args, **kwargs):
        repair = self.get_object()
        if request.user.role not in ["Admin", "Manager", "Warehouse Manager"]:
            return Response(
                {"detail": "You do not have permission to delete this repair ticket."},
                status=status.HTTP_403_FORBIDDEN
            )
        with transaction.atomic():
            # Reset inventory items' status to available
            for item in repair.inventory_items.all():
                item.status = "available"
                item.save()
            repair.delete()
        return Response(
            {"detail": "Repair ticket deleted successfully."},
            status=status.HTTP_204_NO_CONTENT
        )


# ///////////////////  Reconcilation   /////////////////////////////

class ReconciliationViewSet(viewsets.ModelViewSet):
    serializer_class = ReconciliationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Reconciliation.objects.all()
        status_param = self.request.query_params.get("status")
        warehouse_param = self.request.query_params.get("warehouse")

        if status_param == "ALL":
            queryset = queryset.exclude(status="PENDING")
        else:
            queryset = queryset.filter(status=status_param)

        if warehouse_param:
            queryset = queryset.filter(warehouse__name__iexact=warehouse_param)

        return queryset

    def get_object(self):
        # Ignore filters when fetching a single object for detail routes
        return get_object_or_404(Reconciliation, pk=self.kwargs["pk"])

    def perform_create(self, serializer):
        user = self.request.user
        serializer.save(created_by=user)

    @action(detail=True, methods=["post"], url_path="scan")
    def scan(self, request, pk=None):
        reconciliation = self.get_object()
        print(reconciliation.status)
        if reconciliation.status != "PENDING":
            raise ValidationError("Reconciliation must be in PENDING status to scan items.")

        # Add warehouse_id to the request data
        request.data['warehouse_id'] = reconciliation.warehouse.id
        
        serializer = ReconciliationScanSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # The serializer's update_report method now handles all the validation and report creation
        report = serializer.update_report(reconciliation)
        
        return Response(ReconciliationReportSerializer(report).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="submit")
    def submit(self, request, pk=None):
        reconciliation = self.get_object()
        if reconciliation.status != "PENDING":
            raise ValidationError("Reconciliation must be in PENDING status to submit.")

        with transaction.atomic():
            report, created = ReconciliationReport.objects.get_or_create(
                reconciliation=reconciliation,
                warehouse=reconciliation.warehouse,
                defaults={"items": []}
            )
            # Fetch all inventories with items in the reconciliation's warehouse
            warehouse_inventories = Inventory.objects.filter(
                items__warehouse=reconciliation.warehouse,
                items__status="available"
            ).distinct()
            scanned_upcs = {item["upc"] for item in report.items}
            for inventory in warehouse_inventories:
                if inventory.upc not in scanned_upcs:
                    expected_quantity = InventoryItem.objects.filter(
                        inventory=inventory,
                        warehouse=reconciliation.warehouse,
                        status="available"
                    ).count()
                    attributes = [
                        {"id": item.id, "attributes": item.attributes or {}}
                        for item in InventoryItem.objects.filter(
                            inventory=inventory,
                            warehouse=reconciliation.warehouse,
                            status="available"
                        )
                    ]
                    report.items.append({
                        "upc": inventory.upc,
                        "name": inventory.name,
                        "expected_quantity": expected_quantity,
                        "actual_quantity": 0,
                        "discrepancy_type": "MISSING",
                        "attributes": attributes,
                        "action": "NONE"
                    })
            report.save()
            reconciliation.status = "SUBMITTED"
            reconciliation.submitted_at = timezone.now()
            reconciliation.save()
            logger.info(f"Reconciliation {reconciliation.id} submitted by {request.user.username}")

        return Response({"detail": "Reconciliation submitted successfully."}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
        reconciliation = self.get_object()
        if reconciliation.status != "SUBMITTED":
            raise ValidationError("Reconciliation must be in SUBMITTED status to approve.")

        actions = request.data.get("actions", {})  # {upc: action}
        with transaction.atomic():
            report = reconciliation.report
            for item in report.items:
                action = actions.get(item["upc"], "NONE")
                if action not in ["NONE", "ADD_TO_DB", "REMOVE_FROM_DB", "MANUAL_ADJUST"]:
                    raise ValidationError(f"Invalid action: {action} for UPC {item['upc']}")
                item["action"] = action

                if action == "ADD_TO_DB" and item["discrepancy_type"] == "EXTRA":
                    quantity_to_add = item["actual_quantity"] - item["expected_quantity"]
                    inventory = Inventory.objects.get(upc=item["upc"])
                    # Get extra items attributes from the report
                    extra_attributes = [attr for attr in item["attributes"] if attr.get("is_extra", False)]
                    
                    # Create new items with their respective attributes
                    for i in range(quantity_to_add):
                        attributes_to_save = extra_attributes[i]["attributes"] if i < len(extra_attributes) else {}
                        InventoryItem.objects.create(
                            inventory=inventory,
                            warehouse=reconciliation.warehouse,
                            status="available",
                            attributes=attributes_to_save
                        )
                elif action == "REMOVE_FROM_DB" and item["discrepancy_type"] == "MISSING":
                    quantity_to_remove = item["expected_quantity"] - item["actual_quantity"]
                    items = InventoryItem.objects.filter(
                        inventory__upc=item["upc"],
                        warehouse=reconciliation.warehouse,
                        status="available"
                    )[:quantity_to_remove]
                    for item_obj in items:
                        item_obj.delete()
                elif action == "MANUAL_ADJUST" and item["discrepancy_type"] == "MISSING":
                    # Do nothing for manual adjustment as it will be handled by the company
                    pass

            report.save()
            reconciliation.status = "APPROVED"
            reconciliation.approved_by = request.user
            reconciliation.approved_at = timezone.now()
            reconciliation.save()
            logger.info(f"Reconciliation {reconciliation.id} approved by {request.user.username}")

        return Response({"detail": "Reconciliation approved and inventory adjusted."}, status=status.HTTP_200_OK)
    
# /?////////////////////////////////////////////////////////////////

# Attacements create delete view set 
class AttachmentViewSet(viewsets.ModelViewSet):
    queryset = Attachment.objects.all()
    serializer_class = AttachmentSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["post"])
    def attach_to_reference(self, request):
        reference_type = request.data.get("reference_type")
        object_id = request.data.get("id")
        # Check for both 'files' and 'images' keys to support different frontend implementations
        files = request.FILES.getlist("files", [])
        if not files:
            files = request.FILES.getlist("images", [])

        if not reference_type or not object_id:
            return Response(
                {"error": "Both reference_type and id are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        valid_reference_types = [
            "ticket",
            "location",
            "reading",
            "supportticket",
            "inventory",
            "vehicle",
            "vehicle_usage",
            "tutorial",
            "vehiclemaintenance"
        ]
        if reference_type not in valid_reference_types:
            return Response(
                {"error": "Invalid reference type"}, status=status.HTTP_400_BAD_REQUEST
            )

        attachments = []
        for file in files:
            data = {
                "file": file,
                "content_type": reference_type,
                "object_id": object_id,
            }
            serializer = AttachmentSerializer(data=data)
            if serializer.is_valid():
                attachment = serializer.save()
                attachments.append(attachment)
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        attachment_serializer = AttachmentSerializer(attachments, many=True)
        return Response(attachment_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["delete"], url_path="delete")
    def delete_attachment(self, request, pk=None):
        attachment = get_object_or_404(Attachment, pk=pk)
        attachment.delete()
        return Response(
            {"detail": "Attachment deleted successfully."},
            status=status.HTTP_204_NO_CONTENT,
        )


class VendorViewSet(viewsets.ModelViewSet):
    serializer_class = VendorSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Vendor.objects.all()
        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(email__icontains=search)
                | Q(phone__icontains=search)
                | Q(city__icontains=search)
            )
        
        # Handle ordering
        ordering = self.request.query_params.get("ordering")
        if ordering:
            try:
                queryset = queryset.order_by(ordering)
            except Exception as e:
                logger.warning(f"Invalid ordering parameter: {ordering}, error: {str(e)}")
                queryset = queryset.order_by('name')
        else:
            queryset = queryset.order_by('name')
        
        return queryset

    def paginate_queryset(self, queryset):
        if self.request.query_params.get("all") == "true":
            return None  # disables pagination
        return super().paginate_queryset(queryset)


class InventoryItemStatusChoices:
    STATUS_CHOICES = [
        ("available", "Available"),
        ("in_use", "In Use"),
        ("consumed", "Consumed"),
        ("in_repair", "In Repair"),
    ]


class InventoryItemViewSet(viewsets.ModelViewSet):
    queryset = InventoryItem.objects.select_related('inventory', 'warehouse').all()
    serializer_class = InventoryItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = InventoryItem.objects.select_related("inventory", "warehouse")
        inventory_id = self.request.query_params.get("inventory_id")
        warehouse_id = self.request.query_params.get("warehouse_id")
        store_id = self.request.query_params.get("store_id")
        status = self.request.query_params.get("status")
        customer_id = self.request.query_params.get("customer_id")

        search = self.request.query_params.get("search")
        if search:
            # Search in Inventory fields and InventoryItem attributes
            filters = (
                Q(inventory__name__icontains=search) |
                Q(inventory__upc__icontains=search) |
                Q(inventory__unit_price__icontains=search) |
                Q(inventory__description__icontains=search) |
                Q(attributes__icontains=search)  # JSON field search
            )
            queryset = queryset.filter(filters)


        if inventory_id:
            try:
                queryset = queryset.filter(inventory_id=int(inventory_id))
            except ValueError:
                raise ValidationError({"detail": "Invalid inventory_id"})

        if warehouse_id:
            try:
                queryset = queryset.filter(warehouse_id=int(warehouse_id))
            except ValueError:
                raise ValidationError({"detail": "Invalid warehouse_id"})

        if store_id:
            try:
                queryset = queryset.filter(store_id=int(store_id))
            except ValueError:
                raise ValidationError({"detail": "Invalid store_id"})

        if customer_id:
            try:
                customer_id = int(customer_id)
            except ValueError:
                raise ValidationError({"detail": "Invalid customer_id"})

            # Get ContentType for 'account' (customer)
            try:
                account_content_type = ContentType.objects.get(model="account")
            except ContentType.DoesNotExist:
                raise ValidationError({"detail": "Account content type does not exist"})

            # Filter InventoryItems that are:
            # 1. Linked to a WAREHOUSE_TO_CUSTOMER transfer
            # 2. Have destination_content_type='account' and destination_object_id=customer_id
            # 3. Have status='consumed'
            queryset = queryset.filter(
                status="consumed",
                transfers__transfer_type="WAREHOUSE_TO_CUSTOMER",
                transfers__destination_content_type=account_content_type,
                transfers__destination_object_id=customer_id,
            )

        if status:
            valid_statuses = [status[0] for status in InventoryItem.STATUS_CHOICES]
            if status not in valid_statuses:
                raise ValidationError(
                    {"detail": f"Invalid status. Allowed values: {valid_statuses}"}
                )
            queryset = queryset.filter(status=status)

        return queryset.distinct()

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())

        # Check if 'all=true' is in the query parameters
        if request.query_params.get("all") == "true":
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)

        # Apply pagination for other cases
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["post"], url_path="update-status")
    def update_status(self, request):
        """
        Update the status of an InventoryItem.
        Accepts item_id, status in the request body, and optional notes for repair status.
        Creates a Repair record if the status is 'in_repair'.
        """
        item_id = request.data.get("item_id")
        new_status = request.data.get("status")
        notes = request.data.get("notes", "")

        # Validate input
        if not item_id:
            return Response(
                {"detail": "item_id is required"}, status=status.HTTP_400_BAD_REQUEST
            )
        if not new_status:
            return Response(
                {"detail": "status is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        # Validate status
        try:
            item = InventoryItem.objects.get(id=item_id)
        except ObjectDoesNotExist:
            return Response(
                {"detail": f"InventoryItem with ID {item_id} does not exist"},
                status=status.HTTP_404_NOT_FOUND,
            )

        valid_statuses = [
            choice[0] for choice in InventoryItemStatusChoices.STATUS_CHOICES
        ]
        if new_status not in valid_statuses:
            return Response(
                {
                    "detail": f"Invalid status: {new_status}. Valid options are {', '.join(valid_statuses)}"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate user role
        user = request.user
        if user.role not in ["Technician", "Warehouse Technician", "Warehouse Manager"]:
            return Response(
                {"detail": "You do not have permission to update item status"},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Additional validation for specific statuses
        if new_status == "in_repair" and item.status == "consumed":
            return Response(
                {"detail": "Cannot mark a consumed item for repair"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if new_status == "consumed" and item.status == "in_repair":
            return Response(
                {"detail": "Cannot mark an item in repair as consumed"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            # Handle Repair record for in_repair status
            if new_status == "in_repair":
                repair = Repair.objects.create(
                    inventory_item=item,
                    status="in_repair",
                    notes=notes,
                    created_by=user,
                )
                # The Repair model's save method will update the InventoryItem status to in_repair
                response_data = {
                    "detail": f"Item {item_id} status updated to {new_status}",
                    "repair_id": repair.id,
                }
            else:
                # Update InventoryItem status directly for other statuses
                item.status = new_status
                item.save()
                response_data = {
                    "detail": f"Item {item_id} status updated to {new_status}"
                }

            return Response(response_data, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {"detail": f"Failed to update item status: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def update(self, request, *args, **kwargs):
        """
        Custom update method for InventoryItem to handle attribute updates.
        Only allows updating attributes field and validates user permissions.
        """
        instance = self.get_object()
        
        # Check if user has permission to edit inventory items
        user = request.user
        # Only allow updating specific fields
        allowed_fields = ["attributes"]
        data_to_update = {}
        
        for field in allowed_fields:
            if field in request.data:
                data_to_update[field] = request.data[field]
        
        if not data_to_update:
            return Response(
                {"detail": "No valid fields to update"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        # Validate attributes if they're being updated
        if "attributes" in data_to_update:
            attributes = data_to_update["attributes"]
            if not isinstance(attributes, dict):
                return Response(
                    {"detail": "Attributes must be a dictionary"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            
            # Check if inventory requires serial numbers
            if instance.inventory.serial_number_required:
                # Validate that required attributes are present
                required_attrs = ["serial_number"]
                for attr in required_attrs:
                    if attr not in attributes or not attributes[attr]:
                        return Response(
                            {"detail": f"Required attribute '{attr}' is missing or empty"},
                            status=status.HTTP_400_BAD_REQUEST,
                        )
        
        # Update the instance
        for field, value in data_to_update.items():
            setattr(instance, field, value)
        
        instance.save()
        
        # Return updated data
        serializer = self.get_serializer(instance)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def partial_update(self, request, *args, **kwargs):
        """
        Custom partial_update method that calls the update method.
        """
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)


# TransferViewSet handles the creation and management of transfers between inventory items.
class TransferViewSet(viewsets.ModelViewSet):
    """
    TransferViewSet handles the creation and management of transfers between inventory items.
    
    Search functionality:
    - Use ?search=query to search transfers by:
      * Transfer ID
      * Inventory names (from transfer items)
      * Customer names (for WAREHOUSE_TO_CUSTOMER transfers)
      * Store names (for WAREHOUSE_TO_STORE and STORE_TO_WAREHOUSE transfers)
      * Warehouse names
      * Vendor names (for VENDOR_TO_WAREHOUSE transfers)
    """
    queryset = Transfer.objects.all().order_by("-created_at")
    serializer_class = TransferSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()

        # Search functionality - search by customer names, inventory names, store names, or warehouse names
        search_query = self.request.query_params.get("search")
        if search_query:
            try:
                # Search in transfer ID
                transfer_id_search = Q(id__icontains=search_query)
                
                # Search in inventory names from transfer items
                inventory_search = Q(items__inventory__name__icontains=search_query)
                
                # Search in customer names (for WAREHOUSE_TO_CUSTOMER transfers)
                customer_search = Q(destination_content_type__model='account') & Q(
                    destination_object_id__in=Account.objects.filter(
                        username__icontains=search_query
                    ).values_list('id', flat=True)
                )
                
                # Search in store names (for WAREHOUSE_TO_STORE and STORE_TO_WAREHOUSE transfers)
                from custom_user.models import StoreProfile
                store_search = Q(
                    Q(source_content_type__model='storeprofile') | 
                    Q(destination_content_type__model='storeprofile')
                ) & Q(
                    Q(source_object_id__in=StoreProfile.objects.filter(
                        store_name__icontains=search_query
                    ).values_list('id', flat=True)) |
                    Q(destination_object_id__in=StoreProfile.objects.filter(
                        store_name__icontains=search_query
                    ).values_list('id', flat=True))
                )
                
                # Search in warehouse names
                warehouse_search = Q(
                    Q(source_content_type__model='warehouse') | 
                    Q(destination_content_type__model='warehouse')
                ) & Q(
                    Q(source_object_id__in=Warehouse.objects.filter(
                        name__icontains=search_query
                    ).values_list('id', flat=True)) |
                    Q(destination_object_id__in=Warehouse.objects.filter(
                        name__icontains=search_query
                    ).values_list('id', flat=True))
                )
                
                # Search in vendor names (for VENDOR_TO_WAREHOUSE transfers)
                vendor_search = Q(
                    Q(source_content_type__model='vendor') | 
                    Q(destination_content_type__model='vendor')
                ) & Q(
                    Q(source_object_id__in=Vendor.objects.filter(
                        name__icontains=search_query
                    ).values_list('id', flat=True)) |
                    Q(destination_object_id__in=Vendor.objects.filter(
                        name__icontains=search_query
                    ).values_list('id', flat=True))
                )
                
                # Combine all search queries
                search_filter = transfer_id_search | inventory_search | customer_search | store_search | warehouse_search | vendor_search
                queryset = queryset.filter(search_filter).distinct()
            except Exception as e:
                # Log the error and continue without search filtering
                logger.warning(f"Search error in TransferViewSet: {str(e)}")
                # Continue with original queryset without search filtering

        # Filter by source or destination if provided
        source_type = self.request.query_params.get("source_type")
        source_id = self.request.query_params.get("source_id")
        destination_type = self.request.query_params.get("destination_type")
        destination_id = self.request.query_params.get("destination_id")
        transfer_type = self.request.query_params.get("transfer_type")
        start_date = self.request.query_params.get("start_date")
        end_date = self.request.query_params.get("end_date")
        customer_stores = self.request.query_params.get("customer_stores")

        # Filter by customer stores (transfers to/from stores owned by a customer)
        if customer_stores:
            try:
                from custom_user.models import StoreProfile
                customer_id = int(customer_stores)
                # Get all store profiles owned by this customer
                store_profiles = StoreProfile.objects.filter(customer_id=customer_id)
                store_profile_ids = list(store_profiles.values_list('id', flat=True))
                
                if store_profile_ids:
                    # Filter transfers where source OR destination is one of the customer's stores
                    # Specifically for WAREHOUSE_TO_STORE and STORE_TO_WAREHOUSE transfer types
                    store_profile_content_type = ContentType.objects.get(model='storeprofile')
                    warehouse_content_type = ContentType.objects.get(model='warehouse')
                    
                    queryset = queryset.filter(
                        Q(
                            # WAREHOUSE_TO_STORE transfers where destination is customer's store
                            transfer_type='WAREHOUSE_TO_STORE',
                            destination_content_type=store_profile_content_type,
                            destination_object_id__in=store_profile_ids
                        ) |
                        Q(
                            # STORE_TO_WAREHOUSE transfers where source is customer's store
                            transfer_type='STORE_TO_WAREHOUSE',
                            source_content_type=store_profile_content_type,
                            source_object_id__in=store_profile_ids
                        )
                    )
                else:
                    # Customer has no stores, return empty queryset
                    return Transfer.objects.none()
            except (ValueError, ContentType.DoesNotExist):
                return Transfer.objects.none()

        # Apply individual filters
        if source_type and source_id:
            try:
                # Handle content type mapping for backward compatibility
                model_name = source_type.lower()
                if model_name == "store":
                    model_name = "storeprofile"
                content_type = ContentType.objects.get(model=model_name)
                queryset = queryset.filter(
                    source_content_type=content_type, source_object_id=source_id
                )
            except ContentType.DoesNotExist:
                return Transfer.objects.none()

        if destination_type and destination_id:
            try:
                # Handle content type mapping for backward compatibility
                model_name = destination_type.lower()
                if model_name == "store":
                    model_name = "storeprofile"
                content_type = ContentType.objects.get(model=model_name)
                queryset = queryset.filter(
                    destination_content_type=content_type, destination_object_id=destination_id
                )
            except ContentType.DoesNotExist:
                return Transfer.objects.none()

        if transfer_type:
            queryset = queryset.filter(transfer_type=transfer_type)

        if start_date:
            try:
                start_date_obj = datetime.strptime(start_date, "%Y-%m-%d").date()
                queryset = queryset.filter(created_at__date__gte=start_date_obj)
            except ValueError:
                pass

        if end_date:
            try:
                end_date_obj = datetime.strptime(end_date, "%Y-%m-%d").date()
                queryset = queryset.filter(created_at__date__lte=end_date_obj)
            except ValueError:
                pass

        # Handle ordering
        ordering = self.request.query_params.get("ordering")
        if ordering:
            try:
                queryset = queryset.order_by(ordering)
            except Exception as e:
                logger.warning(f"Invalid ordering parameter: {ordering}, error: {str(e)}")
                queryset = queryset.order_by('-created_at')
        else:
            queryset = queryset.order_by('-created_at')

        return queryset

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=["get"])
    def transfer_types(self, request):
        return Response(Transfer.TRANSFER_TYPE_CHOICES)



    @action(detail=False, methods=["get"], url_path="item-history")
    def item_history(self, request):
        item_id = request.query_params.get('item_id')
        if not item_id:
            return Response({"error": "item_id is required"}, status=400)

        try:
            item = InventoryItem.objects.select_related(
                'inventory',
                'warehouse'
            ).get(id=item_id)
        except InventoryItem.DoesNotExist:
            return Response({"error": "Item not found"}, status=404)

        # Get all transfers that include this item
        # We need to look at both source and destination warehouses
        warehouse_content_type = ContentType.objects.get_for_model(Warehouse)
        
        # Get transfers where this item was involved
        transfers = Transfer.objects.filter(
            items=item
        ).select_related(
            'source_content_type',
            'destination_content_type',
            'created_by'
        ).prefetch_related(
            'items',
            'items__inventory',
            'items__warehouse'
        ).order_by('-created_at')

        serializer = self.get_serializer(transfers, many=True)
        
        # Add additional context about the item
        response_data = {
            "item_details": {
                "id": item.id,
                "inventory_name": item.inventory.name,
                "inventory_upc": item.inventory.upc,
                "status": item.status,
                "warehouse_name": item.warehouse.name if item.warehouse else None,
                "attributes": item.attributes,
                "customer_name": None  # We'll set this below if applicable
            },
            "transfers": serializer.data
        }

        # If item is consumed, get customer info from the last WAREHOUSE_TO_CUSTOMER transfer
        if item.status == "consumed":
            last_customer_transfer = transfers.filter(
                transfer_type="WAREHOUSE_TO_CUSTOMER"
            ).first()
            if last_customer_transfer:
                try:
                    customer = Account.objects.get(id=last_customer_transfer.destination_object_id)
                    response_data["item_details"]["customer_name"] = customer.username
                except Account.DoesNotExist:
                    pass

        return Response(response_data)
    
    def paginate_queryset(self, queryset):
        if self.request.query_params.get("all") == "true":
            return None  # disables pagination
        return super().paginate_queryset(queryset)


# =========================================================================


class WarehouseViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        user = self.request.user
        queryset = Warehouse.objects.all().prefetch_related(
            "warehouse_managers__manager",
            Prefetch(
                "inventory_items",
                queryset=InventoryItem.objects.select_related("inventory"),
            ),
        )

        status = self.request.query_params.get("status")
        search = self.request.query_params.get("search")
        ordering = self.request.query_params.get("ordering")

        if search:
            queryset = queryset.filter(Q(name__icontains=search))

        if status:
            queryset = queryset.filter(status=status)

        if user.role == "Warehouse Manager":
            # Filter warehouses where the user is a manager
            queryset = queryset.filter(warehouse_managers__manager=user)

        # Apply ordering
        if ordering:
            logger.info(f"Applying warehouse ordering: {ordering}")
            try:
                queryset = queryset.order_by(ordering)
            except Exception as e:
                logger.warning(f"Invalid warehouse ordering parameter: {ordering}, error: {str(e)}")
                # Fallback to default ordering
                queryset = queryset.order_by('name')
        else:
            # Default ordering
            queryset = queryset.order_by('name')

        return queryset

    def get_serializer_class(self):
        if self.action in ["retrieve"]:
            return WarehouseDetailSerializer
        return WarehouseSerializer

    def paginate_queryset(self, queryset):
        if self.request.query_params.get("all") == "true":
            return None  # disables pagination
        return super().paginate_queryset(queryset)


class CustomerDashboardViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        user = request.user
        if user.role not in ["Service Customer"]:
            return Response(
                {"detail": "You do not have permission to view the dashboard."},
                status=status.HTTP_403_FORBIDDEN,
            )
        tickets = Ticket.objects.filter(Q(created_by=user) | Q(store__customer=user))
        closed_count = tickets.filter(status="CLOSED").count()
        open_count = tickets.filter(status="OPEN").count()
        in_progress_count = tickets.filter(status="IN PROGRESS").count()

        recent_tickets = tickets[:3]
        recent_in_progress_tickets = tickets.filter(status="IN PROGRESS")[:3]

        recent_tickets_serialized = TicketSerializer(recent_tickets, many=True).data
        recent_in_progress_serialized = TicketSerializer(
            recent_in_progress_tickets, many=True
        ).data

        data = {
            "counts": {
                "closed": closed_count,
                "open": open_count,
                "in_progress": in_progress_count,
            },
            "recent_tickets": recent_tickets_serialized,
            "recent_in_progress_tickets": recent_in_progress_serialized,
        }

        return Response(data, status=status.HTTP_200_OK)


class TechnicianDashboardViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        user = request.user
        if user.role not in ["Technician", "Warehouse Technician"]:
            return Response(
                {
                    "detail": "You do not have permission to view the technician dashboard."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        tickets = Ticket.objects.filter(
            assigned_to=user,
            status__in=["PENDING APPROVAL", "PARTIALLY CLOSED", "IN PROGRESS"],
        )

        pending_approval = tickets.filter(status="PENDING APPROVAL").count()
        in_progress_count = tickets.filter(status="IN PROGRESS").count()
        partially_closed_count = tickets.filter(status="PARTIALLY CLOSED").count()

        recent_tickets = tickets.order_by("-created_at")[:6]
        recent_in_progress_tickets = tickets.filter(status="IN PROGRESS").order_by(
            "-created_at"
        )[:6]

        recent_tickets_serialized = TicketSerializer(recent_tickets, many=True).data
        recent_in_progress_serialized = TicketSerializer(
            recent_in_progress_tickets, many=True
        ).data

        data = {
            "counts": {
                "pending_approval": pending_approval,
                "in_progress": in_progress_count,
                "partially_closed": partially_closed_count,
            },
            "recent_tickets": recent_tickets_serialized,
            "recent_in_progress_tickets": recent_in_progress_serialized,
        }

        return Response(data, status=status.HTTP_200_OK)


class VendingCustomerDashboardViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        user = request.user
        if user.role != "Vending Customer":
            return Response(
                {"detail": "You are not authorized for this dashboard."}, status=403
            )

        locations = VendingCustomerLocation.objects.filter(vending_customer=user)
        total_active = locations.filter(status="active").count()
        total_inactive = locations.filter(status="inactive").count()

        recent_active_locations = locations.filter(status="active").order_by(
            "-created_at"
        )[:3]
        recent_inactive_locations = locations.filter(status="inactive").order_by(
            "-created_at"
        )[:3]

        recent_active_data = VendingCustomerLocationSerializer(
            recent_active_locations, many=True
        ).data
        recent_inactive_data = VendingCustomerLocationSerializer(
            recent_inactive_locations, many=True
        ).data

        return Response(
            {
                "total_active_locations": total_active,
                "total_inactive_locations": total_inactive,
                "recent_active_locations": recent_active_data,
                "recent_inactive_locations": recent_inactive_data,
            }
        )


class VendingCustomerLocationViewSet(viewsets.ModelViewSet):
    serializer_class = VendingCustomerLocationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        vending_customer_id = self.request.query_params.get("vending_customer")
        status = self.request.query_params.get("status")
        search = self.request.query_params.get("search")

        queryset = VendingCustomerLocation.objects.all()

        # If user is a reporter, only show their assigned locations
        if user.role == "Reporter":
            queryset = queryset.filter(assigned_to=user)
        # If user is a partner, show locations from linked vending customers
        elif user.role == "Partner":
            linked_customers = PartnerCustomerLink.objects.filter(
                partner=user,
                is_active=True
            ).values_list('vending_customer_id', flat=True)
            queryset = queryset.filter(vending_customer__in=linked_customers)
        # For vending customers and others
        elif user.role == "Vending Customer":
            queryset = queryset.filter(vending_customer=user)
        elif user.role in ["Admin", "Manager"]:
            if vending_customer_id:
                queryset = queryset.filter(vending_customer_id=vending_customer_id)

        if search:
            queryset = queryset.filter(Q(name__icontains=search))
        if status:
            queryset = queryset.filter(status=status)

        return queryset

    def get_object(self):
        return VendingCustomerLocation.objects.get(id=self.kwargs["pk"])
    
    def paginate_queryset(self, queryset):
        if self.request.query_params.get("all") == "true":
            return None
        return super().paginate_queryset(queryset)

    def perform_create(self, serializer):
        vending_customer_id = self.request.query_params.get("vending_customer")
        if vending_customer_id:
            User = get_user_model()
            try:
                vending_customer = User.objects.get(id=vending_customer_id)
            except User.DoesNotExist:
                raise ValidationError("Invalid vending customer ID provided.")
            serializer.save(vending_customer=vending_customer)
        else:
            # If no vending_customer_id provided, use the current user as vending_customer
            serializer.save(vending_customer=self.request.user)

    def perform_update(self, serializer):
        serializer.save()

    def perform_destroy(self, instance):
        instance.delete()


class ReadingBasicViewSet(viewsets.ModelViewSet):
    serializer_class = ReadingSimpleSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        vending_location_id = self.request.query_params.get("vending_location_id")
        search = self.request.query_params.get("search")

        queryset = Reading.objects.select_related("vending_location", "created_by")
        if vending_location_id:
            queryset = queryset.filter(vending_location_id=vending_location_id)
        else:
            return Reading.objects.none()

        if search:
            queryset = queryset.filter(
                Q(profit_amount__icontains=search)
                | Q(notes__icontains=search)
                | Q(vending_location__name__icontains=search)
                | Q(created_by__username__icontains=search)
            )

        return queryset


class ReadingWithAttachmentsViewSet(viewsets.ModelViewSet):
    serializer_class = ReadingWithAttachmentsSerializer
    permission_classes = [IsAuthenticated]
    queryset = Reading.objects.select_related(
        "vending_location", "created_by"
    ).prefetch_related("attachments")

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context


class ReporterDashboardViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        user = request.user
        if not hasattr(user, "role") or user.role != "Reporter":
            return Response(
                {"detail": "You are not authorized for this dashboard."}, status=403
            )

        locations = VendingCustomerLocation.objects.filter(assigned_to=user)
        total_active = locations.filter(status="active").count()
        total_inactive = locations.filter(status="inactive").count()

        recent_active_locations = locations.filter(status="active")[:3]
        recent_inactive_locations = locations.filter(status="inactive")[:3]

        recent_active_data = VendingCustomerLocationSerializer(
            recent_active_locations, many=True
        ).data
        recent_inactive_data = VendingCustomerLocationSerializer(
            recent_inactive_locations, many=True
        ).data

        return Response(
            {
                "total_active_locations": total_active,
                "total_inactive_locations": total_inactive,
                "recent_active_locations": recent_active_data,
                "recent_inactive_locations": recent_inactive_data,
            }
        )


# //////////////////////////////////////////////////////////////////////////////


# Vehicles

class VehicleViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        queryset = Vehicle.objects.all()

        search = self.request.query_params.get("search")
        status_param = self.request.query_params.get("status")

        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | 
                Q(vin__icontains=search) | 
                Q(make__icontains=search) | 
                Q(model__icontains=search) | 
                Q(status__icontains=search) 
            ).distinct()
        
        if status_param:
            queryset = queryset.filter(status=status_param)

        # Handle ordering
        ordering = self.request.query_params.get("ordering")
        if ordering:
            try:
                queryset = queryset.order_by(ordering)
            except Exception as e:
                logger.warning(f"Invalid ordering parameter: {ordering}, error: {str(e)}")
                queryset = queryset.order_by('name')
        else:
            queryset = queryset.order_by('name')

        return queryset

    def get_serializer_class(self):
        return VehicleSerializer

    def paginate_queryset(self, queryset):
        if self.request.query_params.get("all") == "true":
            return None
        return super().paginate_queryset(queryset)

    @action(detail=True, methods=['get'], url_path='secondary-usages')
    def secondary_usages(self, request, pk=None):
        """Get all usages where this vehicle was used as a secondary vehicle"""
        try:
            vehicle = self.get_object()
            secondary_usages = VehicleUsage.objects.filter(
                secondary_vehicles=vehicle
            ).select_related('vehicle', 'user').prefetch_related('attachments')
            
            serializer = VehicleUsageSerializer(secondary_usages, many=True, context={'request': request})
            return Response(serializer.data)
        except Vehicle.DoesNotExist:
            return Response(
                {"detail": "Vehicle not found."}, 
                status=status.HTTP_404_NOT_FOUND
            )


class VehicleUsageViewSet(viewsets.ModelViewSet):
    serializer_class = VehicleUsageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        print(user)
        queryset = VehicleUsage.objects.all().select_related('vehicle', 'user').prefetch_related(
            'attachments', 'secondary_vehicles'
        )

        # Check for vehicle_id in query params first
        vehicle_id = self.request.query_params.get("vehicle_id")
        
        # If not in query params, check if it's in the URL path (for nested routes)
        if not vehicle_id and hasattr(self, 'kwargs') and 'vehicle_id' in self.kwargs:
            vehicle_id = self.kwargs['vehicle_id']
        
        if vehicle_id:
            queryset = queryset.filter(vehicle_id=vehicle_id)

        if user.role not in ['Admin', 'Manager']:
            queryset = queryset.filter(user=user)

        return queryset

    def create(self, request, *args, **kwargs):
        # Get vehicle_id from query params or request data
        vehicle_id = request.query_params.get('vehicle_id') or request.data.get('vehicle')
        
        if not vehicle_id:
            return Response(
                {"vehicle": ["This field is required."]}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            vehicle = Vehicle.objects.get(id=vehicle_id)
        except Vehicle.DoesNotExist:
            return Response(
                {"vehicle": ["Vehicle not found."]}, 
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        pickup_mileage = serializer.validated_data.get('pickup_mileage')
        if not pickup_mileage:
            pickup_mileage = vehicle.current_mileage

        # Save with the vehicle
        instance = serializer.save(
            vehicle=vehicle, 
            user=request.user,
            pickup_mileage=pickup_mileage
        )
        
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        """Handle updating vehicle usage (for returning vehicles)"""
        print(request.data)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        
        # Update the instance
        updated_instance = serializer.save()
        
        # Handle return attachments if provided (let the serializer handle this)
        # The serializer's update method already handles return attachments when return_time is provided
        
        return Response(serializer.data)

    def partial_update(self, request, *args, **kwargs):
        """Handle partial updates (same as update for vehicle returns)"""
        return self.update(request, *args, **kwargs)




class ShiftViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ['update', 'partial_update']:
            return ShiftUpdateSerializer
        return ShiftSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = Shift.objects.select_related("user").all()

        if user.role not in ["Admin", "Manager"]:
            queryset = queryset.filter(user=user)
        
        user_id = self.request.query_params.get("user_id")
        if user_id:
            queryset = queryset.filter(user_id=user_id)

        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(user__username__icontains=search)

        # Filter by date range if both start_date and end_date are provided (format: YYYY-MM-DD)
        start_date = self.request.query_params.get("start_date")
        end_date = self.request.query_params.get("end_date")
        if start_date and end_date:
            # Filter shifts whose start_time date lies within the range (inclusive)
            queryset = queryset.filter(start_time__date__range=[start_date, end_date])

        # Handle ordering
        ordering = self.request.query_params.get("ordering")
        if ordering:
            try:
                queryset = queryset.order_by(ordering)
            except Exception as e:
                logger.warning(f"Invalid ordering parameter: {ordering}, error: {str(e)}")
                queryset = queryset.order_by('-start_time')
        else:
            queryset = queryset.order_by('-start_time')

        return queryset

    def paginate_queryset(self, queryset):
        """Allow clients to disable pagination by passing ?all=true"""
        if self.request.query_params.get("all") == "true":
            return None
        return super().paginate_queryset(queryset)

    @action(detail=False, methods=['get'], url_path='active-shift')
    def get_active_shift(self, request):
        user = request.user
        try:
            active_shift = Shift.objects.get(user=user, end_time__isnull=True)
            serializer = ShiftSerializer(active_shift)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Shift.DoesNotExist:
            return Response({'detail': 'No active shift found.'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['post'], url_path='start')
    def start_shift(self, request):
        user = request.user
        if Shift.objects.filter(user=user, end_time__isnull=True).exists():
            return Response({'detail': 'An active shift is already in progress.'}, status=status.HTTP_400_BAD_REQUEST)
        
        shift = Shift.objects.create(user=user)
        serializer = ShiftSerializer(shift)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='end')
    def end_shift(self, request):
        user = request.user
        try:
            active_shift = Shift.objects.get(user=user, end_time__isnull=True)
            active_shift.end_time = timezone.now()
            active_shift.save()
            serializer = ShiftSerializer(active_shift)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Shift.DoesNotExist:
            return Response({'detail': 'No active shift to end.'}, status=status.HTTP_400_BAD_REQUEST)
        

class TutorialViewSet(viewsets.ModelViewSet):
    queryset = Tutorial.objects.all()
    serializer_class = TutorialSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset().select_related('created_by')
        tutorial_ct = ContentType.objects.get_for_model(Tutorial)
        
        # Get search query from request
        search = self.request.query_params.get('search', '')
        
        # If search query exists, filter in title, description and content
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(description__icontains=search) |
                Q(content__icontains=search)
            )
        
        return queryset.prefetch_related(
            Prefetch(
                "attachments",
                queryset=Attachment.objects.filter(content_type=tutorial_ct),
                to_attr="_prefetched_attachments"
            )
        )


class GroupViewSet(viewsets.ModelViewSet):
    queryset = Group.objects.all()
    serializer_class = GroupSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset().prefetch_related('users')

        # Apply search filter
        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | Q(description__icontains=search)
            )

        # Handle ordering
        ordering = self.request.query_params.get("ordering")
        if ordering:
            try:
                queryset = queryset.order_by(ordering)
            except Exception as e:
                logger.warning(f"Invalid ordering parameter: {ordering}, error: {str(e)}")
                queryset = queryset.order_by('name')
        else:
            queryset = queryset.order_by('name')

        return queryset

    def paginate_queryset(self, queryset):
        if self.request.query_params.get("all") == "true":
            return None
        return super().paginate_queryset(queryset)


class PlatformConfigViewSet(viewsets.ModelViewSet):
    serializer_class = PlatformConfigSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'put', 'patch', 'head', 'options']

    def get_permissions(self):
        # Only Admins can access
        return [p for p in super().get_permissions()]

    def get_queryset(self):
        return PlatformConfig.objects.all()

    def get_object(self):
        return PlatformConfig.get_active()

    def list(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


class PreferredSoftwareOptionsViewSet(viewsets.ViewSet):
    """Public list endpoint, authenticated update endpoint for preferred software options."""
    permission_classes = []

    def list(self, request):
        obj = PreferredSoftwareOptions.get_active()
        from .serializers import PreferredSoftwareOptionsSerializer
        serializer = PreferredSoftwareOptionsSerializer(obj)
        return Response(serializer.data)

    @action(detail=False, methods=["put", "patch"], url_path="update", permission_classes=[IsAuthenticated])
    def update_options(self, request):
        """Authenticated update of preferred software options.

        Body: { "options": ["Option 1", "Option 2", ...] }
        """
        try:
            options = request.data.get("options", [])
            if not isinstance(options, list):
                return Response({"detail": "'options' must be a list of strings"}, status=status.HTTP_400_BAD_REQUEST)

            # Normalize: trim, drop empties, dedupe while preserving order
            seen = set()
            cleaned = []
            for raw in options:
                label = str(raw or "").strip()
                if not label:
                    continue
                if label not in seen:
                    seen.add(label)
                    cleaned.append(label)

            obj = PreferredSoftwareOptions.get_active()
            obj.options = cleaned
            obj.save()

            from .serializers import PreferredSoftwareOptionsSerializer
            serializer = PreferredSoftwareOptionsSerializer(obj)
            return Response(serializer.data)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class VehicleMaintenanceViewSet(viewsets.ModelViewSet):
    serializer_class = VehicleMaintenanceSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        maintenance_ct = ContentType.objects.get_for_model(VehicleMaintenance)
        queryset = VehicleMaintenance.objects.all().select_related(
            'vehicle'
        ).prefetch_related(
            Prefetch(
                'attachments',
                queryset=Attachment.objects.filter(content_type=maintenance_ct)
            )
        )
        
        # Filter by vehicle if specified
        vehicle_id = self.request.query_params.get("vehicle_id")
        if vehicle_id:
            queryset = queryset.filter(vehicle_id=vehicle_id)
            
        # Filter by maintenance type
        maintenance_type = self.request.query_params.get("maintenance_type")
        if maintenance_type:
            queryset = queryset.filter(maintenance_type=maintenance_type)
            
        # Filter by date range
        start_date = self.request.query_params.get("start_date")
        end_date = self.request.query_params.get("end_date")
        if start_date and end_date:
            queryset = queryset.filter(start_date__range=[start_date, end_date])
            
        return queryset
    
    def perform_create(self, serializer):
        # Set vehicle status to in_maintenance when maintenance starts
        vehicle = serializer.validated_data['vehicle']
        vehicle.status = 'in_maintenance'
        vehicle.save()
        
        maintenance = serializer.save()
        
        # Handle attachments
        images = self.request.FILES.getlist('images', [])
        for image in images:
            Attachment.objects.create(
                file=image,
                attachment_type='maintenance',
                content_type=ContentType.objects.get_for_model(maintenance),
                object_id=maintenance.id
            )
        
        # Send email notification
        try:
            # Get recipient email from request data or use tracking email
            recipient_email = self.request.data.get('notification_email')
            send_vehicle_maintenance_notification.delay(maintenance.id, recipient_email)
        except Exception as e:
            logger.error(f"Failed to send vehicle maintenance notification: {e}")
    
    def perform_update(self, serializer):
        maintenance = serializer.instance
        vehicle = maintenance.vehicle
        
        # If maintenance is being completed (end_date is being set)
        if 'end_date' in serializer.validated_data and serializer.validated_data['end_date']:
            # Update vehicle status to available if it was in maintenance
            if vehicle.status == 'in_maintenance':
                vehicle.status = 'available'
                vehicle.save()
        
        maintenance = serializer.save()
        
        # Handle new attachments
        images = self.request.FILES.getlist('images', [])
        for image in images:
            Attachment.objects.create(
                file=image,
                attachment_type='maintenance',
                content_type=ContentType.objects.get_for_model(maintenance),
                object_id=maintenance.id
            )


class CashDrawerViewSet(viewsets.ModelViewSet):
    serializer_class = CashDrawerSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """
        Get cash drawer queryset with filtering options.
        
        Query Parameters:
        - min_amount: Filter by minimum amount (default: filters by current_amount only)
        - max_amount: Filter by maximum amount (default: filters by current_amount only)
        - filter_by_entries: Set to 'true', '1', or 'yes' to also consider entry amounts in filtering
        - include_negative: Set to 'true', '1', or 'yes' to include cash drawers with negative amounts
        - only_positive: Set to 'true', '1', or 'yes' to force exclusion of negative amounts (overrides include_negative)
        - store_id: Filter by store ID (filters cash drawers with entries for that store)
        - customer_id: Legacy parameter that maps to store_id for backward compatibility
        - include_no_store: Set to 'true', '1', or 'yes' to include cash drawers with no store entries when filtering by store_id
        - has_no_store: Set to 'true', '1', or 'yes' to show only cash drawers with entries that have no store assigned
        - user_id: Filter by user ID
        - status: Filter by cash drawer status (open, closed)
        - date: Filter by opened_at or closed_at date
        - user: Search in user username
        
        Amount Filtering Behavior:
        - By default: min_amount and max_amount only filter by cash drawer's current_amount
        - With filter_by_entries=true: min_amount and max_amount consider both current_amount and entry amounts
        
        By default, cash drawers with negative amounts or negative entries are excluded.
        """
        user = self.request.user
        queryset = CashDrawer.objects.select_related('user').all()
        
        # Filter by user_id
        user_id = self.request.query_params.get("user_id")
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        
        # Filter by date
        date = self.request.query_params.get("date")
        if date:
            queryset = queryset.filter(
                Q(opened_at__date=date) | Q(closed_at__date=date)
            )
        
        # Filter by user search
        user_search = self.request.query_params.get("user")
        if user_search:
            queryset = queryset.filter(user__username__icontains=user_search)
        
        # Filter by status
        status = self.request.query_params.get("status")
        if status:
            queryset = queryset.filter(status=status)
        
        # Filter by store - find cash drawers that have entries with the specified store
        store_id = self.request.query_params.get("store_id")
        if store_id:
            # Filter by store_id, but also include cash drawers with no store entries if requested
            include_no_store = self.request.query_params.get("include_no_store", "false").lower() in ['true', '1', 'yes']
            if include_no_store:
                queryset = queryset.filter(
                    Q(entries__store_id=store_id) | Q(entries__store__isnull=True)
                ).distinct()
            else:
                queryset = queryset.filter(entries__store_id=store_id).distinct()
        
        # Legacy support: customer_id parameter now maps to store_id
        customer_id = self.request.query_params.get("customer_id")
        if customer_id:
            # Filter by customer_id (store_id), but also include cash drawers with no store entries if requested
            include_no_store = self.request.query_params.get("include_no_store", "false").lower() in ['true', '1', 'yes']
            if include_no_store:
                queryset = queryset.filter(
                    Q(entries__store_id=customer_id) | Q(entries__store__isnull=True)
                ).distinct()
            else:
                queryset = queryset.filter(entries__store_id=customer_id).distinct()
        
        # Filter by entries with no store (useful for debugging)
        has_no_store = self.request.query_params.get("has_no_store")
        if has_no_store and has_no_store.lower() in ['true', '1', 'yes']:
            queryset = queryset.filter(entries__store__isnull=True).distinct()
        
        # Filter by amount range
        min_amount = self.request.query_params.get("min_amount")
        max_amount = self.request.query_params.get("max_amount")
        filter_by_entries = self.request.query_params.get("filter_by_entries", "false").lower() in ['true', '1', 'yes']
        
        if min_amount is not None or max_amount is not None:
            if filter_by_entries:
                # Filter by entry amounts (original behavior)
                if min_amount is not None:
                    try:
                        min_amount_float = float(min_amount)
                        queryset = queryset.filter(
                            Q(current_amount__gte=min_amount_float) | 
                            Q(entries__amount__gte=min_amount_float) & Q(entries__amount__gte=0)
                        ).distinct()
                    except ValueError:
                        pass
                
                if max_amount is not None:
                    try:
                        max_amount_float = float(max_amount)
                        queryset = queryset.filter(
                            Q(current_amount__gte=0) & Q(current_amount__lte=max_amount_float) | 
                            Q(entries__amount__gte=0) & Q(entries__amount__lte=max_amount_float)
                        ).distinct()
                    except ValueError:
                        pass
            else:
                # Filter by current_amount only (default behavior)
                if min_amount is not None:
                    try:
                        min_amount_float = float(min_amount)
                        queryset = queryset.filter(current_amount__gte=min_amount_float)
                    except ValueError:
                        pass
                
                if max_amount is not None:
                    try:
                        max_amount_float = float(max_amount)
                        queryset = queryset.filter(current_amount__lte=max_amount_float)
                    except ValueError:
                        pass
        
        # Filter out negative amounts by default, unless explicitly requested to include them
        include_negative = self.request.query_params.get("include_negative")
        only_positive = self.request.query_params.get("only_positive")
        
        # If only_positive is explicitly set to true, always filter out negatives
        if only_positive and only_positive.lower() in ['true', '1', 'yes']:
            include_negative = False
        
        if not include_negative or include_negative.lower() not in ['true', '1', 'yes']:
            # Filter out cash drawers with negative current amounts
            queryset = queryset.filter(current_amount__gte=0)
            
            # Also filter out cash drawers that have any negative entry amounts
            # This ensures we don't show cash drawers with negative entries even if current_amount is positive
            queryset = queryset.exclude(entries__amount__lt=0)
            
            # Additional safety: ensure we don't have any cash drawers with negative amounts
            # This is a double-check to make sure our filtering is working
            queryset = queryset.annotate(
                has_negative_entries=Exists(
                    CashEntry.objects.filter(
                        cash_drawer=OuterRef('pk'),
                        amount__lt=0
                    )
                )
            ).filter(has_negative_entries=False)
            
            # Final safety check: ensure current_amount is not negative
            # This handles edge cases where the calculation might be off
            queryset = queryset.filter(current_amount__gte=0)
            
            # Log the filtering for debugging
            logger.info(f"Filtered out negative amounts. Query count: {queryset.count()}")
        else:
            logger.info("Including cash drawers with negative amounts as requested")
        
        return queryset
    
    def perform_create(self, serializer):
        from django.db import transaction
        from decimal import Decimal
        from .vault_utils import transfer_from_vault_to_drawer
        
        user = self.request.user
        # Check if there is already any open cash drawer (only one can be open at a time)
        if CashDrawer.objects.filter(status="open").exists():
            raise ValidationError("There is already an open cash drawer. Please close it before opening a new one.")
        
        # Get the opening amount from the serializer
        opening_amount = serializer.validated_data.get('opening_amount', 0.00)
        
        # Validate opening amount is not negative
        if opening_amount < 0:
            raise ValidationError("Opening amount cannot be negative.")
        
        # Use database transaction to ensure atomicity
        with transaction.atomic():
            # Create the cash drawer with "open" status and current_amount set to opening_amount
            cash_drawer = serializer.save(
                user=user, 
                status="open",
                current_amount=opening_amount
            )
            
            # If there's an opening amount, transfer it from vault to drawer
            if opening_amount > 0:
                transfer_from_vault_to_drawer(opening_amount, user, cash_drawer)
    
    def paginate_queryset(self, queryset):
        if self.request.query_params.get("all") == "true":
            return None  # disables pagination
        return super().paginate_queryset(queryset)
    
    def get_object(self):
        """Override to allow any user to access any cash drawer for closing"""
        # For close action, allow access to any cash drawer
        if self.action == 'close_drawer':
            pk = self.kwargs.get('pk')
            try:
                return CashDrawer.objects.get(pk=pk)
            except CashDrawer.DoesNotExist:
                from rest_framework.exceptions import NotFound
                raise NotFound("Cash drawer not found")
        
        # For other actions, use the default behavior
        return super().get_object()
    
    @action(detail=False, methods=["get"], url_path="check-open")
    def check_open_drawer(self, request):
        """Check if there is any open cash drawer (any user can close any open drawer)"""
        try:
            # Get the latest open cash drawer (any user)
            open_drawer = CashDrawer.objects.filter(
                status="open"
            ).order_by('-opened_at').first()
            
            if open_drawer:
                serializer = self.get_serializer(open_drawer)
                return Response({
                    "has_open_drawer": True,
                    "cash_drawer": serializer.data
                })
            else:
                return Response({
                    "has_open_drawer": False,
                    "cash_drawer": None
                })
        except Exception as e:
            logger.error(f"Error checking open drawer: {str(e)}")
            return Response({
                "has_open_drawer": False,
                "cash_drawer": None
            })
    
    @action(detail=True, methods=["post"], url_path="close")
    def close_drawer(self, request, pk=None):
        cash_drawer = self.get_object()
        
        if cash_drawer.close_drawer(request.user):
            serializer = self.get_serializer(cash_drawer)
            return Response(serializer.data)
        else:
            return Response(
                {"detail": "Cash drawer is already closed."},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=["post"], url_path="add-entry")
    def add_entry(self, request, pk=None):
        cash_drawer = self.get_object()
        
        entry_type = request.data.get("entry_type")
        amount = request.data.get("amount")
        description = request.data.get("description")
        store_id = request.data.get("store_id")
        invoice_id = request.data.get("invoice_id")
        
        if not all([entry_type, amount, description]):
            return Response(
                {"detail": "entry_type, amount, and description are required."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Get store if provided
            store = None
            if store_id:
                try:
                    from custom_user.models import StoreProfile
                    store = StoreProfile.objects.get(id=store_id)
                except StoreProfile.DoesNotExist:
                    return Response(
                        {"detail": "Invalid store ID provided."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Get invoice if provided
            invoice = None
            if invoice_id:
                try:
                    invoice = Invoice.objects.get(id=invoice_id)
                except Invoice.DoesNotExist:
                    return Response(
                        {"detail": "Invalid invoice ID provided."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            entry = cash_drawer.add_entry(
                entry_type=entry_type,
                amount=amount,
                description=description,
                created_by_user=request.user,
                store=store,
                invoice=invoice
            )
            
            # Handle attachments if provided
            images = request.FILES.getlist('images', [])
            for image in images:
                Attachment.objects.create(
                    file=image,
                    attachment_type='cash_entry',
                    content_type=ContentType.objects.get_for_model(CashEntry),
                    object_id=entry.id
                )
            
            serializer = CashEntrySerializer(entry)
            return Response(serializer.data)
        except ValidationError as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=["get"], url_path="entries")
    def get_entries(self, request, pk=None):
        """Get all entries for a specific cash drawer"""
        cash_drawer = self.get_object()
        entries = CashEntry.objects.filter(cash_drawer=cash_drawer).select_related('created_by').order_by('-created_at')
        serializer = CashEntrySerializer(entries, many=True)
        return Response(serializer.data)


class CashEntryViewSet(viewsets.ModelViewSet):
    serializer_class = CashEntrySerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        cash_entry_ct = ContentType.objects.get_for_model(CashEntry)
        queryset = CashEntry.objects.select_related('cash_drawer', 'created_by', 'customer').prefetch_related(
            Prefetch(
                'attachments',
                queryset=Attachment.objects.filter(content_type=cash_entry_ct)
            )
        ).all()
        
        # Filter by cash drawer
        cash_drawer_id = self.request.query_params.get("cash_drawer_id")
        if cash_drawer_id:
            queryset = queryset.filter(cash_drawer_id=cash_drawer_id)
        
        # Filter by entry type
        entry_type = self.request.query_params.get("entry_type")
        if entry_type:
            queryset = queryset.filter(entry_type=entry_type)
        
        # Filter by user if not admin/manager
        if user.role not in ["Admin", "Manager"]:
            queryset = queryset.filter(cash_drawer__user=user)
        
        return queryset
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class VaultViewSet(viewsets.ModelViewSet):
    serializer_class = VaultSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Only return the main vault (id=1)
        return Vault.objects.filter(id=1)
    
    def list(self, request, *args, **kwargs):
        # Get or create the main vault
        vault, created = Vault.objects.get_or_create(id=1)
        serializer = self.get_serializer(vault)
        return Response(serializer.data)
    
    def perform_create(self, serializer):
        # Ensure only one vault exists
        vault, created = Vault.objects.get_or_create(id=1)
        if not created:
            # Update existing vault
            vault.total_amount = serializer.validated_data.get('total_amount', vault.total_amount)
            vault.save()
            return vault
        return serializer.save()


class VaultEntryViewSet(viewsets.ModelViewSet):
    serializer_class = VaultEntrySerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        queryset = VaultEntry.objects.select_related('vault', 'created_by').all()
        
        # Filter by vault
        vault_id = self.request.query_params.get("vault_id") or self.request.query_params.get("vault")
        if vault_id:
            queryset = queryset.filter(vault_id=vault_id)
        
        # Filter by entry type
        entry_type = self.request.query_params.get("entry_type")
        if entry_type:
            queryset = queryset.filter(entry_type=entry_type)
        
        # Filter by start date
        start_date = self.request.query_params.get("start_date")
        if start_date:
            queryset = queryset.filter(created_at__date__gte=start_date)
        
        # Filter by end date
        end_date = self.request.query_params.get("end_date")
        if end_date:
            queryset = queryset.filter(created_at__date__lte=end_date)

        # Filter by description (icontains)
        description = self.request.query_params.get("description")
        if description:
            queryset = queryset.filter(description__icontains=description)

        # Filter by amount range or exact
        amount_min = self.request.query_params.get("amount_min")
        amount_max = self.request.query_params.get("amount_max")
        amount = self.request.query_params.get("amount")
        try:
            if amount is not None and amount != "":
                queryset = queryset.filter(amount=Decimal(str(amount)))
            else:
                if amount_min is not None and amount_min != "":
                    queryset = queryset.filter(amount__gte=Decimal(str(amount_min)))
                if amount_max is not None and amount_max != "":
                    queryset = queryset.filter(amount__lte=Decimal(str(amount_max)))
        except Exception:
            pass
        
        # Filter by user if not admin/manager
        if user.role not in ["Admin", "Manager"]:
            queryset = queryset.filter(created_by=user)
        
        return queryset
    
    def perform_create(self, serializer):
        entry = serializer.save(created_by=self.request.user)
        
        # Update vault amount based on entry type
        vault = entry.vault
        
        # Capture vault amount BEFORE the transaction
        vault_amount_before = vault.total_amount
        
        if entry.entry_type == "deposit":
            vault.add_amount(entry.amount)
        elif entry.entry_type == "withdrawal":
            # Allow negative amounts in vault
            vault.subtract_amount(entry.amount)
        
        # Update the vault entry with the vault amount at time of creation
        entry.vault_amount_at_time = vault_amount_before
        entry.save()
        
        return entry
    
    def paginate_queryset(self, queryset):
        if self.request.query_params.get("all") == "true":
            return None  # disables pagination
        return super().paginate_queryset(queryset)

class InvoiceChargeTypeViewSet(viewsets.ModelViewSet):
    queryset = InvoiceChargeType.objects.all().order_by('name')
    serializer_class = InvoiceChargeTypeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by name (icontains)
        name = self.request.query_params.get('name')
        if name:
            queryset = queryset.filter(name__icontains=name)

        # Filter by active status
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        # Filter by compulsory status
        is_compulsory = self.request.query_params.get('is_compulsory')
        if is_compulsory is not None:
            queryset = queryset.filter(is_compulsory=is_compulsory.lower() == 'true')
        
        # Filter by charge type
        charge_type = self.request.query_params.get('charge_type')
        if charge_type:
            queryset = queryset.filter(charge_type=charge_type)
        
        exclude = self.request.query_params.get('exclude')
        if exclude:
            queryset = queryset.exclude(charge_type=exclude)
        
        # Handle ordering
        ordering = self.request.query_params.get("ordering")
        if ordering:
            try:
                queryset = queryset.order_by(ordering)
            except Exception as e:
                logger.warning(f"Invalid ordering parameter: {ordering}, error: {str(e)}")
                queryset = queryset.order_by('name')
        else:
            queryset = queryset.order_by('name')
            
        return queryset
    
    def paginate_queryset(self, queryset):
        if self.request.query_params.get("all") == "true":
            return None  # disables pagination
        return super().paginate_queryset(queryset) 


class PriceMatrixViewSet(viewsets.ModelViewSet):
    queryset = PriceMatrix.objects.all()
    serializer_class = PriceMatrixSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Only allow Admin, Manager, and Warehouse Manager to access price matrix
        user = self.request.user
        if user.role not in ["Admin", "Manager", "Warehouse Manager"]:
            return PriceMatrix.objects.none()
        return PriceMatrix.objects.all()

    def get_serializer_class(self):
        if self.action == 'create':
            return PriceMatrixCreateSerializer
        return PriceMatrixSerializer

    def perform_create(self, serializer):
        # Check permissions before creating
        user = self.request.user
        if user.role not in ["Admin", "Manager", "Warehouse Manager"]:
            raise PermissionError("You don't have permission to create price matrix rules")
        serializer.save()

    def perform_update(self, serializer):
        # Check permissions before updating
        user = self.request.user
        if user.role not in ["Admin", "Manager", "Warehouse Manager"]:
            raise PermissionError("You don't have permission to update price matrix rules")
        serializer.save()

    def perform_destroy(self, instance):
        # Check permissions before deleting
        user = self.request.user
        if user.role not in ["Admin", "Manager", "Warehouse Manager"]:
            raise PermissionError("You don't have permission to delete price matrix rules")
        instance.delete()

    @action(detail=False, methods=['post'], url_path='calculate-sale-price')
    def calculate_sale_price(self, request):
        """Calculate sale price based on unit price using price matrix"""
        try:
            unit_price = request.data.get('unit_price')
            if not unit_price:
                return Response(
                    {"error": "unit_price is required"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Convert to Decimal with proper error handling
            try:
                unit_price_decimal = Decimal(str(unit_price))
            except (ValueError, TypeError) as e:
                return Response(
                    {"error": f"Invalid unit_price format: {unit_price}. Must be a valid number."}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Log the calculation attempt
            logger.info(f"Calculating sale price for unit_price: {unit_price_decimal}")
            
            sale_price = PriceMatrix.calculate_sale_price(unit_price_decimal)
            tax_percentage = PriceMatrix.get_tax_percentage_for_amount(unit_price_decimal)
            
            logger.info(f"Calculation result - unit_price: {unit_price_decimal}, tax_percentage: {tax_percentage}, sale_price: {sale_price}")
            
            return Response({
                "unit_price": float(unit_price_decimal),
                "tax_percentage": float(tax_percentage),
                "sale_price": float(sale_price),
                "tax_amount": float(sale_price - unit_price_decimal)
            })
        except Exception as e:
            logger.error(f"Error in calculate_sale_price: {str(e)}", exc_info=True)
            return Response(
                {"error": f"Calculation failed: {str(e)}"}, 
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['get'], url_path='get-tax-percentage')
    def get_tax_percentage(self, request):
        """Get tax percentage for a given amount"""
        try:
            amount = request.query_params.get('amount')
            if not amount:
                return Response(
                    {"error": "amount parameter is required"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            tax_percentage = PriceMatrix.get_tax_percentage_for_amount(amount)
            
            return Response({
                "amount": amount,
                "tax_percentage": float(tax_percentage)
            })
        except Exception as e:
            return Response(
                {"error": str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )


class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.all().order_by('-created_at')
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return InvoiceCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return InvoiceUpdateSerializer
        return InvoiceSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Search filter
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(invoice_number__icontains=search) |
                Q(store__customer__username__icontains=search) |
                Q(store__store_name__icontains=search) |
                Q(transfer__reference_number__icontains=search)
            )
        
        # Filter by store
        store_id = self.request.query_params.get('store_id')
        if store_id:
            queryset = queryset.filter(store_id=store_id)
        
        # Filter by customer (through store)
        customer_id = self.request.query_params.get('customer_id')
        if customer_id:
            queryset = queryset.filter(store__customer_id=customer_id)
        
        # Filter by status
        status = self.request.query_params.get('status')
        if status:
            queryset = queryset.filter(status=status)
        
        # Filter by transfer
        transfer_id = self.request.query_params.get('transfer_id')
        if transfer_id:
            queryset = queryset.filter(transfer_id=transfer_id)
        
        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            queryset = queryset.filter(issue_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(issue_date__lte=end_date)
        
        # Filter by amount range
        min_amount = self.request.query_params.get('min_amount')
        max_amount = self.request.query_params.get('max_amount')
        if min_amount:
            queryset = queryset.filter(total_amount__gte=min_amount)
        if max_amount:
            queryset = queryset.filter(total_amount__lte=max_amount)
        
        # Filter by user role
        user = self.request.user
        if user.role in ["Service Customer", "Vending Customer"]:
            queryset = queryset.filter(store__customer=user)
        
        return queryset.select_related(
            'store',
            'store__customer',
            'transfer',
            'created_by'
        ).prefetch_related(
            'items',
            'items__inventory_item',
            'items__inventory_item__inventory',
            'charges',
            'charges__charge_type'
        )
    
    def perform_create(self, serializer):
        print(self.request.data)
        serializer.save(created_by=self.request.user)
    
    @action(detail=True, methods=['post'], url_path='apply-compulsory-charges')
    def apply_compulsory_charges(self, request, pk=None):
        """Apply all compulsory charges to an invoice"""
        invoice = self.get_object()
        invoice.apply_compulsory_charges()
        return Response({'message': 'Compulsory charges applied successfully'})
    
    @action(detail=True, methods=['post'], url_path='change-status')
    def change_status(self, request, pk=None):
        """Change the status of an invoice"""
        invoice = self.get_object()
        new_status = request.data.get('status')
        
        if new_status not in dict(Invoice.STATUS_CHOICES):
            return Response(
                {'error': 'Invalid status'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if status is being changed to PENDING
        status_changed_to_pending = (
            invoice.status != 'PENDING' and 
            new_status == 'PENDING'
        )
        
        invoice.status = new_status
        invoice.save()
        
        # Send email notification if status changed to PENDING
        if status_changed_to_pending:
            try:
                from commonapp.tasks import send_invoice_email
                send_invoice_email.delay(invoice.id)
                logger = logging.getLogger(__name__)
                logger.info(f"Invoice email task queued for invoice_id={invoice.id} (status changed to PENDING via change_status)")
            except Exception as e:
                logger = logging.getLogger(__name__)
                logger.error(f"Error queuing invoice email for invoice_id={invoice.id}: {e}")
                # Don't raise the exception - email failure shouldn't prevent status update
        
        return Response({'message': f'Invoice status changed to {new_status}'})
    
    @action(detail=True, methods=['get'], url_path='print')
    def print_invoice(self, request, pk=None):
        """Get invoice data formatted for printing"""
        invoice = self.get_object()
        serializer = self.get_serializer(invoice)
        
        # Add additional data for printing
        data = serializer.data
        data['print_date'] = timezone.now().strftime('%Y-%m-%d %H:%M:%S')
        
        return Response(data)
    
    def paginate_queryset(self, queryset):
        if self.request.query_params.get("all") == "true":
            return None  # disables pagination
        return super().paginate_queryset(queryset)


class InvoiceItemViewSet(viewsets.ModelViewSet):
    queryset = InvoiceItem.objects.all().order_by('created_at')
    serializer_class = InvoiceItemSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by invoice
        invoice_id = self.request.query_params.get('invoice_id')
        if invoice_id:
            queryset = queryset.filter(invoice_id=invoice_id)
        
        return queryset.select_related(
            'invoice',
            'inventory_item',
            'inventory_item__inventory'
        )


class InvoiceChargeViewSet(viewsets.ModelViewSet):
    queryset = InvoiceCharge.objects.all().order_by('created_at')
    serializer_class = InvoiceChargeSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by invoice
        invoice_id = self.request.query_params.get('invoice_id')
        if invoice_id:
            queryset = queryset.filter(invoice_id=invoice_id)
        
        return queryset.select_related(
            'invoice',
            'charge_type'
        )


class InvoiceFromTransferViewSet(viewsets.ViewSet):
    """ViewSet for creating invoices from transfers"""
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['post'], url_path='create-from-transfer')
    def create_from_transfer(self, request):
        """Create an invoice from a warehouse-to-customer transfer"""
        transfer_id = request.data.get('transfer_id')
        additional_charges = request.data.get('additional_charges', [])
        due_date = request.data.get('due_date')
        notes = request.data.get('notes', '')
        
        try:
            transfer = Transfer.objects.get(
                id=transfer_id,
                transfer_type="WAREHOUSE_TO_CUSTOMER"
            )
        except Transfer.DoesNotExist:
            return Response(
                {'error': 'Transfer not found or not a warehouse-to-customer transfer'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if invoice already exists for this transfer
        if Invoice.objects.filter(transfer=transfer).exists():
            return Response(
                {'error': 'Invoice already exists for this transfer'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get customer from transfer destination
        try:
            customer = User.objects.get(id=transfer.destination_object_id)
        except User.DoesNotExist:
            return Response(
                {'error': 'Customer not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Prepare items data
        items_data = []
        for item in transfer.items.all():
            unit_price = Decimal(item.inventory.unit_price)
            items_data.append({
                'inventory_item_id': item.id,
                'quantity': 1,
                'unit_price': unit_price,
                'description': f'Item from transfer {transfer.reference_number}'
            })
        
        # Create invoice
        invoice_data = {
            'customer': customer.id,
            'transfer': transfer.id,
            'status': 'PENDING',
            'due_date': due_date,
            'notes': notes,
            'items_data': items_data,
            'charges_data': additional_charges
        }
        
        serializer = InvoiceCreateSerializer(data=invoice_data)
        if serializer.is_valid():
            invoice = serializer.save(created_by=request.user)
            return Response(
                InvoiceSerializer(invoice).data,
                status=status.HTTP_201_CREATED
            )
        else:
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )


class LocationPermissionViewSet(viewsets.ModelViewSet):
    serializer_class = LocationPermissionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        user_id = self.request.query_params.get("user_id")
        location_id = self.request.query_params.get("location_id")

        queryset = LocationPermission.objects.select_related(
            "user", "location", "assigned_by"
        )

        # If a specific user_id is provided, filter by that
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        # Otherwise, apply role-based filtering
        else:
            # If the user is a partner, only show their own permissions
            if user.role == "Partner":
                queryset = queryset.filter(user=user)
            # If the user is a vending customer, only show permissions for their locations
            elif user.role == "Vending Customer":
                queryset = queryset.filter(location__vending_customer=user)

        # Filter by location_id if provided
        if location_id:
            queryset = queryset.filter(location_id=location_id)

        return queryset

    def perform_create(self, serializer):
        serializer.save(assigned_by=self.request.user)
        
    def paginate_queryset(self, queryset):
        if self.request.query_params.get("all") == "true":
            return None
        return super().paginate_queryset(queryset)

    @action(detail=False, methods=["post"], url_path="bulk-assign")
    def bulk_assign(self, request):
        user_id = request.data.get("user_id")
        location_ids = request.data.get("location_ids", [])

        if not user_id or not location_ids:
            return Response(
                {"detail": "Both user_id and location_ids are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(id=user_id)
            if user.role != "Partner":
                return Response(
                    {"detail": "User must be a Partner."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except User.DoesNotExist:
            return Response(
                {"detail": "User not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        # Verify that the requesting user has permission to assign these locations
        if request.user.role == "Vending Customer":
            # Verify that all locations belong to the vending customer
            invalid_locations = VendingCustomerLocation.objects.filter(
                id__in=location_ids
            ).exclude(
                vending_customer=request.user
            ).exists()
            
            if invalid_locations:
                return Response(
                    {"detail": "You can only assign your own locations."},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Verify that the partner is linked to this vending customer
            is_linked = PartnerCustomerLink.objects.filter(
                partner_id=user_id,
                vending_customer=request.user,
                is_active=True
            ).exists()

            if not is_linked:
                return Response(
                    {"detail": "You can only assign locations to linked partners."},
                    status=status.HTTP_403_FORBIDDEN
                )

        # Get existing permissions for this user
        existing_permissions = set(
            LocationPermission.objects.filter(user_id=user_id).values_list("location_id", flat=True)
        )

        # Add new permissions
        new_permissions = []
        for location_id in location_ids:
            if location_id not in existing_permissions:
                try:
                    location = VendingCustomerLocation.objects.get(id=location_id)
                    permission = LocationPermission(
                        user=user,
                        location=location,
                        assigned_by=request.user
                    )
                    new_permissions.append(permission)
                except VendingCustomerLocation.DoesNotExist:
                    continue

        # Bulk create new permissions
        if new_permissions:
            LocationPermission.objects.bulk_create(new_permissions)

        return Response(
            {"detail": f"Successfully assigned {len(new_permissions)} locations to {user.username}"},
            status=status.HTTP_201_CREATED
        )


class PartnerCustomerLinkViewSet(viewsets.ModelViewSet):
    serializer_class = PartnerCustomerLinkSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = PartnerCustomerLink.objects.select_related(
            'partner', 'vending_customer', 'created_by'
        )

        # Filter based on user role
        if user.role == 'Vending Customer':
            # Vending customers can only see their linked partners
            queryset = queryset.filter(vending_customer=user)
        elif user.role == 'Partner':
            # Partners can only see their linked customers
            queryset = queryset.filter(partner=user)
        
        # Additional filters
        partner_id = self.request.query_params.get('partner_id')
        customer_id = self.request.query_params.get('customer_id')
        is_active = self.request.query_params.get('is_active')

        if partner_id:
            queryset = queryset.filter(partner_id=partner_id)
        if customer_id:
            queryset = queryset.filter(vending_customer_id=customer_id)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')

        return queryset

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=['GET'])
    def available_partners(self, request):
        """Get list of partners available to be linked with the current vending customer"""
        if request.user.role != 'Vending Customer':
            return Response(
                {"detail": "Only vending customers can view available partners"},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get IDs of partners already linked to this customer
        linked_partner_ids = PartnerCustomerLink.objects.filter(
            vending_customer=request.user,
            is_active=True
        ).values_list('partner_id', flat=True)

        # Get available partners (not yet linked)
        available_partners = User.objects.filter(
            role='Partner'
        ).exclude(
            id__in=linked_partner_ids
        )

        serializer = AccountSerializer(available_partners, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['GET'])
    def available_customers(self, request):
        """Get list of vending customers available to be linked with the current partner"""
        if request.user.role != 'Partner':
            return Response(
                {"detail": "Only partners can view available customers"},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get IDs of customers already linked to this partner
        linked_customer_ids = PartnerCustomerLink.objects.filter(
            partner=request.user,
            is_active=True
        ).values_list('vending_customer_id', flat=True)

        # Get available customers (not yet linked)
        available_customers = User.objects.filter(
            role='Vending Customer'
        ).exclude(
            id__in=linked_customer_ids
        )

        serializer = AccountSerializer(available_customers, many=True)
        return Response(serializer.data)


class SliderSlideViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing slider slides.
    List endpoint is public (no authentication required).
    Create, update, delete require authentication.
    """
    queryset = SliderSlide.objects.filter(is_active=True).order_by('order', 'created_at')
    serializer_class = SliderSlideSerializer
    permission_classes = [permissions.AllowAny]  # Public access for list
    pagination_class = None  # Disable pagination for this ViewSet
    
    def get_permissions(self):
        """
        Instantiates and returns the list of permissions that this view requires.
        """
        if self.action == 'list':
            permission_classes = [permissions.AllowAny]  # Public access for list
        else:
            permission_classes = [permissions.IsAuthenticated]  # Auth required for other actions
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        """
        Return only active slides ordered by order and creation date
        """
        return SliderSlide.objects.filter(is_active=True).order_by('order', 'created_at')
