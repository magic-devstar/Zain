from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q, Count, Prefetch
from django.contrib.contenttypes.models import ContentType
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError
import logging

from .models import AssemblyTicket, AssemblyNotes
from .serializers import AssemblyTicketSerializer, AssemblyTicketListSerializer, AssemblyNotesSerializer
from commonapp.models import InventoryItem, Inventory, Transfer, Warehouse, Notification, Attachment, InventoryCategory, InventoryLocation, Repair

logger = logging.getLogger(__name__)


class AssemblyTicketViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "list":
            return AssemblyTicketListSerializer
        return AssemblyTicketSerializer

    def get_queryset(self):
        user = self.request.user
        search = self.request.query_params.get("search")
        status_param = self.request.query_params.get("status")
        calendar_status = self.request.query_params.getlist("calendar_status[]")
        user_id = self.request.query_params.get("user_id")
        start_date = self.request.query_params.get("start_date")
        end_date = self.request.query_params.get("end_date")
        assembly_ticket_content_type = ContentType.objects.get_for_model(AssemblyTicket)

        queryset = AssemblyTicket.objects.select_related(
            "assigned_by", "created_by"
        ).prefetch_related(
            "assigned_to",
            Prefetch(
                "items",
                queryset=InventoryItem.objects.select_related("inventory", "warehouse"),
            ),
            Prefetch(
                "attachments",
                queryset=Attachment.objects.filter(content_type=assembly_ticket_content_type),
                to_attr="_prefetched_attachments",
            ),
        )

        if user.role in ["Admin", "Manager", "Warehouse Manager"]:
            pass
        elif user.role in ["Technician", "Warehouse Technician"]:
            queryset = queryset.filter(
                assigned_to=user,
            )
        else:
            queryset = queryset.filter(created_by=user)

        if status_param:
            queryset = queryset.filter(status=status_param)

        if calendar_status:
            queryset = queryset.filter(status__in=calendar_status)

        if user_id:
            try:
                queryset = queryset.filter(assigned_to__id=int(user_id))
            except ValueError:
                raise ValidationError({"detail": "Invalid user_id"})

        if start_date:
            try:
                queryset = queryset.filter(created_at__date__gte=start_date)
            except ValueError:
                raise ValidationError({"detail": "Invalid start_date format. Use YYYY-MM-DD"})

        if end_date:
            try:
                queryset = queryset.filter(created_at__date__lte=end_date)
            except ValueError:
                raise ValidationError({"detail": "Invalid end_date format. Use YYYY-MM-DD"})

        if search:
            filters = Q(title__icontains=search) | Q(description__icontains=search) | Q(assembled_item_name__icontains=search) | Q(assembled_item_upc__icontains=search) | Q(assembly_notes__icontains=search)
            if search.isdigit():
                filters |= Q(id=int(search))
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

    def _handle_assembly_ticket_status_change(self, assembly_ticket, new_status, request_user):
        """
        Handle all the logic related to changing an assembly ticket's status.
        This includes handling item status updates and creating assembled items.
        """
        # Update the status first
        assembly_ticket.status = new_status
        
        if new_status == "CLOSED":
            # Initialize in case there are no items or no usages/defective mappings
            used_item_ids: set[int] = set()
            defective_item_ids: set[int] = set()
            assembly_ticket.completed_at = timezone.now()

            # Handle unused items - set them back to available and remove from ticket
            if assembly_ticket.items.exists():
                # Get all item IDs from the ticket
                all_ticket_items = set(assembly_ticket.items.values_list('id', flat=True))
                # Get used item IDs from item_usages
                used_item_ids = {int(item_id) for item_id, used in assembly_ticket.item_usages.items() if used} if assembly_ticket.item_usages else set()
                # Get defective item IDs from defective_items
                defective_item_ids = {int(item_id) for item_id, defective in assembly_ticket.defective_items.items() if defective} if assembly_ticket.defective_items else set()
                # Calculate unused item IDs (items that are neither used nor defective)
                unused_item_ids = all_ticket_items - used_item_ids - defective_item_ids
                
                if unused_item_ids:
                    # Update status of unused items to available
                    InventoryItem.objects.filter(id__in=unused_item_ids).update(status='available')
                    # Remove unused items from the ticket
                    logger.info(f"Removed {len(unused_item_ids)} unused items from assembly ticket {assembly_ticket.id} and set them to available")

            # Handle used items - mark them as consumed
            if used_item_ids:
                InventoryItem.objects.filter(id__in=used_item_ids).update(status='consumed')
                logger.info(f"Marked {len(used_item_ids)} used items as consumed in assembly ticket {assembly_ticket.id}")

            # Handle defective items - mark them as in_repair
            if defective_item_ids:
                InventoryItem.objects.filter(id__in=defective_item_ids).update(status='in_repair')
                logger.info(f"Marked {len(defective_item_ids)} defective items as in_repair in assembly ticket {assembly_ticket.id}")

                # Create repair tickets grouped by vendor (similar to regular tickets)
                try:
                    defective_items_qs = InventoryItem.objects.filter(id__in=defective_item_ids)

                    # Group items by their original vendor from first VENDOR_TO_WAREHOUSE transfer
                    items_by_vendor = {}
                    vendor_content_type = ContentType.objects.get(model='vendor')

                    for item in defective_items_qs:
                        vendor_transfer = Transfer.objects.filter(
                            transfer_type='VENDOR_TO_WAREHOUSE',
                            source_content_type=vendor_content_type,
                            items=item
                        ).order_by('created_at').first()

                        vendor_id = vendor_transfer.source_object_id if vendor_transfer else None

                        if vendor_id not in items_by_vendor:
                            items_by_vendor[vendor_id] = []
                        items_by_vendor[vendor_id].append(item)

                    # Create Repair record per vendor group
                    for vendor_id, items in items_by_vendor.items():
                        with transaction.atomic():
                            repair = Repair.objects.create(
                                vendor_id=vendor_id,
                                status='PENDING',
                                information={
                                    'notes': f'Defective items from assembly ticket #{assembly_ticket.id}',
                                    'tracking_number': '',
                                    'reference_number': f'ASM-TICKET-{assembly_ticket.id}'
                                },
                                created_by=request_user
                            )
                            repair.inventory_items.set(items)
                            logger.info(f"Created repair ticket {repair.id} for {len(items)} defective items from assembly ticket {assembly_ticket.id}")
                except Exception as e:
                    logger.error(f"Failed to create repair ticket for defective items in assembly ticket {assembly_ticket.id}: {str(e)}")

            # Create assembled items (multiple) from JSONField
            logger.info(f"Starting assembly item creation for ticket {assembly_ticket.id}")
            assembled_items = assembly_ticket.assembled_items or []
            if assembled_items:
                try:
                    # Get the warehouse from the first item in the ticket
                    warehouse = None
                    if assembly_ticket.items.exists():
                        warehouse = assembly_ticket.items.first().warehouse
                        logger.info(f"Using warehouse from first item: {warehouse.name}")
                    else:
                        warehouse = Warehouse.objects.filter(status='active').first()
                        logger.info(f"Using first active warehouse: {warehouse.name if warehouse else 'None'}")
                    if not warehouse:
                        logger.error(f"No warehouse available for assembly ticket {assembly_ticket.id}")
                        return
                    for assembled_item in assembled_items:
                        # Create or get the inventory
                        inventory_data = {
                            'name': assembled_item['name'],
                            'upc': assembled_item['upc'] or f"ASSEMBLED_{assembly_ticket.id}",
                            'unit_price': assembled_item['unit_price'] or "0.00",
                            'price': assembled_item['unit_price'] or "0.00",
                            'serial_number_required': assembled_item['serial_number_required'],
                        }
                        category_id = assembled_item.get('category')
                        if category_id:
                            try:
                                category = InventoryCategory.objects.get(id=category_id)
                                inventory_data['category'] = category
                            except InventoryCategory.DoesNotExist:
                                logger.warning(f"Category {category_id} not found")
                        inventory, created = Inventory.objects.get_or_create(
                            upc=inventory_data['upc'],
                            defaults=inventory_data
                        )
                        if not created:
                            for key, value in inventory_data.items():
                                if key != 'category' and hasattr(inventory, key):
                                    setattr(inventory, key, value)
                            inventory.save()
                        # Create the inventory items
                        quantity = assembled_item['quantity']
                        attributes_list = assembled_item.get('attributes_list', [])
                        for i in range(quantity):
                            item_data = {
                                'inventory': inventory,
                                'warehouse': warehouse,
                                'status': 'available',
                            }
                            if assembled_item['serial_number_required'] and attributes_list and len(attributes_list) > i:
                                item_data['attributes'] = attributes_list[i]
                            InventoryItem.objects.create(**item_data)
                        # Create inventory location if it doesn't exist
                        InventoryLocation.objects.get_or_create(
                            inventory=inventory,
                            warehouse=warehouse,
                            defaults={
                                'aisle': 'Assembly',
                                'shelf': f'ASM-{assembly_ticket.id}',
                                'bay': '01'
                            }
                        )
                        logger.info(f"Created {quantity} inventory items for {inventory.name} (ID: {inventory.id}) in warehouse {warehouse.name} from assembly ticket {assembly_ticket.id}")
                except Exception as e:
                    logger.error(f"Failed to create assembled items for assembly ticket {assembly_ticket.id}: {str(e)}")
                    import traceback
                    logger.error(f"Traceback: {traceback.format_exc()}")
            else:
                logger.warning(f"No assembled items provided for assembly ticket {assembly_ticket.id}")

        assembly_ticket.save()

    def perform_update(self, serializer):
        """Override perform_update to handle status changes during regular updates"""
        instance = serializer.instance
        old_status = instance.status
        
        # Save the instance first
        instance = serializer.save()
        
        # If status changed to CLOSED, handle the status change
        if instance.status == "CLOSED" and old_status != "CLOSED":
            self._handle_assembly_ticket_status_change(instance, "CLOSED", self.request.user)
        
        return instance

    @action(detail=True, methods=["post"], url_path="change_status")
    def change_status(self, request, pk=None):
        assembly_ticket = self.get_object()
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

        self._handle_assembly_ticket_status_change(assembly_ticket, new_status, request.user)
        
        return Response(
            {"detail": f"Assembly ticket status changed to {new_status}."},
            status=status.HTTP_200_OK,
        )



    def destroy(self, request, *args, **kwargs):
        assembly_ticket = self.get_object()
        if request.user.role in ["Admin", "Manager"]:
            with transaction.atomic():
                assembly_ticket.delete()
            return Response(
                {"detail": "Assembly ticket deleted successfully."},
                status=status.HTTP_204_NO_CONTENT,
            )
        return Response(
            {"detail": "You do not have permission to delete this assembly ticket."},
            status=status.HTTP_403_FORBIDDEN,
        )

    @action(detail=False, methods=['get'])
    def admin_dashboard_stats(self, request):
        if request.user.role not in ["Admin", "Manager"]:
            return Response(
                {"detail": "You do not have permission to view dashboard stats."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Get assembly ticket counts by status
        assembly_ticket_stats = AssemblyTicket.objects.values('status').annotate(
            count=Count('id')
        )
        
        # Convert to dictionary
        assembly_ticket_counts = {
            item['status']: item['count']
            for item in assembly_ticket_stats
        }

        # Get total counts
        total_assembly_tickets = sum(assembly_ticket_counts.values())
        open_assembly_tickets = assembly_ticket_counts.get('OPEN', 0)
        in_progress_assembly_tickets = assembly_ticket_counts.get('IN PROGRESS', 0)
        closed_assembly_tickets = assembly_ticket_counts.get('CLOSED', 0)

        data = {
            "assembly_ticket_counts": assembly_ticket_counts,
            "total_assembly_tickets": total_assembly_tickets,
            "open_assembly_tickets": open_assembly_tickets,
            "in_progress_assembly_tickets": in_progress_assembly_tickets,
            "closed_assembly_tickets": closed_assembly_tickets,
        }

        return Response(data, status=status.HTTP_200_OK)


class AssemblyNotesViewSet(viewsets.ModelViewSet):
    queryset = AssemblyNotes.objects.all()
    serializer_class = AssemblyNotesSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        assembly_ticket_id = self.request.query_params.get("assembly_ticket_id")
        if assembly_ticket_id:
            queryset = queryset.filter(assembly_ticket_id=assembly_ticket_id)
        return queryset.select_related("assembly_ticket", "created_by")
