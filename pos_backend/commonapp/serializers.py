from rest_framework import viewsets, serializers
from rest_framework.exceptions import NotFound, ValidationError
from django.db.models import Prefetch, Q, Sum
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.utils import timezone
from django.contrib.contenttypes.models import ContentType
from rest_framework.decorators import action
from .models import *
from custom_user.serializers import AccountSerializer, StoreProfileSerializer
from custom_user.models import Account, StoreProfile
import logging

logger = logging.getLogger(__name__)


# Serializers
class SliderSlideSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = SliderSlide
        fields = ['id', 'title', 'description', 'image', 'image_url', 'is_active', 'order', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None


class VendorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendor
        fields = "__all__"


class InventoryItemSerializer(serializers.ModelSerializer):
    inventory_name = serializers.CharField(source="inventory.name", read_only=True)
    inventory_upc = serializers.CharField(source="inventory.upc", read_only=True)
    inventory_unit_price = serializers.CharField(source="inventory.unit_price", read_only=True)
    warehouse_name = serializers.CharField(source="warehouse.name", read_only=True)
    serial_number_required = serializers.BooleanField(source="inventory.serial_number_required", read_only=True)
    store_id = serializers.SerializerMethodField()
    store_name = serializers.SerializerMethodField()
    customer_id = serializers.SerializerMethodField()
    customer_name = serializers.SerializerMethodField()
    assembly_ticket_ids = serializers.SerializerMethodField()

    class Meta:
        model = InventoryItem
        fields = [
            "id",
            "status",
            "attributes",
            "inventory_id",
            "inventory_upc",
            "warehouse",
            "inventory_unit_price",
            "inventory_name",
            "warehouse_name",
            "serial_number_required",
            "store_id",
            "store_name",
            "customer_id",
            "customer_name",
            "created_at",
            "updated_at",
            "assembly_ticket_ids",
        ]

    def get_store_id(self, obj):
        # Prefer the explicit store relation when set
        if obj.store:
            return obj.store.id
        return None

    def get_store_name(self, obj):
        if obj.store:
            return obj.store.store_name
        return None

    def get_customer_id(self, obj):
        # Prefer the customer via store when available (new logic)
        if obj.store and obj.store.customer:
            return obj.store.customer.id
        # Fallback to legacy transfer link (WAREHOUSE_TO_CUSTOMER)
        if obj.status == "consumed":
            transfer = obj.transfers.filter(
                transfer_type="WAREHOUSE_TO_CUSTOMER"
            ).first()
            if transfer:
                return transfer.destination_object_id
        return None

    def get_customer_name(self, obj):
        if obj.store and obj.store.customer:
            return obj.store.customer.username
        if obj.status == "consumed":
            transfer = obj.transfers.filter(
                transfer_type="WAREHOUSE_TO_CUSTOMER"
            ).first()
            if transfer and transfer.destination:
                return transfer.destination.username
        return None

    def get_assembly_ticket_ids(self, obj):
        return list(obj.assembly_tickets.values_list('id', flat=True))


class InventoryCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = InventoryCategory
        fields = ["id", "name"]


class UserSimpleSerializer(serializers.ModelSerializer):
    profile_image = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "email", "profile_image"]

    def get_profile_image(self, obj):
        if obj.profile_image:
            return obj.profile_image.url
        return None


class AttachmentSerializer(serializers.ModelSerializer):
    content_type = serializers.CharField()
    name = serializers.SerializerMethodField()

    class Meta:
        model = Attachment
        fields = ["id", "file", "name", "uploaded_at", "content_type", "object_id", "attachment_type"]
        extra_kwargs = {
            "file": {"required": True},
            "content_type": {"required": True},
            "object_id": {"required": True},
            "attachment_type": {"required": False},
        }

    def get_name(self, obj):
        return obj.file.name.split('/')[-1] if obj.file else None

    def to_internal_value(self, data):
        content_type_str = data.get("content_type")
        if content_type_str:
            try:
                content_type_obj = ContentType.objects.get(
                    model=content_type_str.lower()
                )
                data["content_type"] = content_type_obj.id
            except ContentType.DoesNotExist:
                raise serializers.ValidationError(
                    {"content_type": f"Invalid content type: {content_type_str}"}
                )
        return super().to_internal_value(data)

    def validate(self, data):
        content_type_id = data.get("content_type")
        object_id = data.get("object_id")

        if not content_type_id or not object_id:
            raise serializers.ValidationError(
                {
                    "content_type": "This field is required.",
                    "object_id": "This field is required.",
                }
            )

        try:
            content_type = ContentType.objects.get(pk=content_type_id)
            model_class = content_type.model_class()
            model_class.objects.get(id=object_id)
        except ContentType.DoesNotExist:
            raise serializers.ValidationError("Invalid content type ID.")
        except model_class.DoesNotExist:
            raise serializers.ValidationError(
                f"No {model_class.__name__} found with ID {object_id}."
            )

        return data

    def create(self, validated_data):
        attachment = Attachment.objects.create(
            file=validated_data["file"],
            content_type_id=validated_data["content_type"],
            object_id=validated_data["object_id"],
            attachment_type=validated_data.get("attachment_type"),
        )
        return attachment


class TicketNotesSerializer(serializers.ModelSerializer):
    class Meta:
        model = TicketNotes
        fields = ["ticket", "description", "status", "created_by"]
        read_only_fields = ["created_by"]

    def create(self, validated_data):
        validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)


class TicketListSerializer(serializers.ModelSerializer):
    assigned_to = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), many=True, write_only=True, required=False
    )
    assigned_to_users = UserSimpleSerializer(
        source="assigned_to", many=True, read_only=True
    )
    attachment_count = serializers.SerializerMethodField()
    created_by = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = Ticket
        fields = [
            "id",
            "title",
            "deadline",
            "created_at",
            "assigned_at",
            "created_by",
            "flagged",
            "assigned_to",
            "assigned_to_users",
            "attachment_count",
            "status",
        ]

    def get_attachment_count(self, obj):
        attachments = getattr(obj, "_prefetched_attachments", None)
        if attachments is not None:
            return len(attachments)
        return Attachment.objects.filter(
            content_type=ContentType.objects.get_for_model(Ticket), object_id=obj.id
        ).count()


class TicketListSerializer(serializers.ModelSerializer):
    assigned_to = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), many=True, write_only=True, required=False
    )
    assigned_to_users = UserSimpleSerializer(
        source="assigned_to", many=True, read_only=True
    )
    attachment_count = serializers.SerializerMethodField()
    created_by = serializers.StringRelatedField(read_only=True)
    customer_name = serializers.SerializerMethodField()
    store_details = serializers.SerializerMethodField()

    class Meta:
        model = Ticket
        fields = [
            "id",
            "title",
            "deadline",
            "created_at",
            "description",
            "assigned_at",
            "created_by",
            "flagged",
            "assigned_to",
            "assigned_to_users",
            "attachment_count",
            "status",
            "customer_name",
            "store_details",
        ]
        
    def get_customer_name(self, obj):
        if obj.store and obj.store.customer:
            return obj.store.customer.username
        return None

    def get_store_details(self, obj):
        if obj.store:
            return {
                'id': obj.store.id,
                'store_name': obj.store.store_name,
                'store_address': obj.store.store_address,
                'store_city': obj.store.store_city,
                'store_zip_code': obj.store.store_zip_code,
                'store_billing_email': obj.store.store_billing_email,
                'store_phone': obj.store.store_phone,
                'owner_name': obj.store.owner_name,
                'owner_email': obj.store.owner_email,
                'owner_phone': obj.store.owner_phone,
                'distributor_name': obj.store.distributor_name,
                'distributor_email': obj.store.distributor_email,
                'distributor_phone': obj.store.distributor_phone,
                'manager_name': obj.store.manager_name,
                'manager_email': obj.store.manager_email,
                'manager_phone': obj.store.manager_phone,
                'open': obj.store.open,
                'close': obj.store.close,
                'customer': {
                    'id': obj.store.customer.id,
                    'username': obj.store.customer.username,
                    'email': obj.store.customer.email,
                    'role': obj.store.customer.role
                } if obj.store.customer else None
            }
        return None

    def get_attachment_count(self, obj):
        attachments = getattr(obj, "_prefetched_attachments", None)
        if attachments is not None:
            return len(attachments)
        return Attachment.objects.filter(
            content_type=ContentType.objects.get_for_model(Ticket), object_id=obj.id
        ).count()

class TicketSerializer(serializers.ModelSerializer):
    assigned_to = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), many=True, write_only=True, required=False)
    assigned_to_users = AccountSerializer(source="assigned_to", many=True, read_only=True)
    assigned_by = serializers.StringRelatedField(read_only=True)
    created_by = serializers.StringRelatedField(read_only=True)
    items = InventoryItemSerializer(many=True, read_only=True, default=[])
    ticket_items = serializers.JSONField(write_only=True, required=False, allow_null=True, help_text='List of item IDs, e.g., [1, 2, 3]')
    item_usages = serializers.JSONField(required=False, allow_null=True, help_text='Dictionary of used item IDs, e.g., {"1": true, "2": true}')
    defective_items = serializers.JSONField(required=False, allow_null=True, help_text='Dictionary of defective item IDs, e.g., {"1": true, "2": true}')
    non_serialized_items = serializers.JSONField(required=False, allow_null=True, help_text='List of non-serialized items with quantities, e.g., [{"inventory_id": 1, "warehouse_id": 1, "total_quantity": 5, "used_quantity": 3, "defective_quantity": 1}]')
    charges = serializers.JSONField(required=False, allow_null=True, help_text='List of ticket charges, e.g., [{"amount": 100.00, "description": "Service fee"}]')
    attachments = serializers.SerializerMethodField()
    ticketNotes = serializers.CharField(required=False, allow_blank=True, write_only=True, source="ticket_notes")
    technician_notes = serializers.SerializerMethodField()  # Renamed to avoid conflict
    customer_notes = serializers.SerializerMethodField()
    store_details = serializers.SerializerMethodField()

    class Meta:
        model = Ticket
        fields = [
            "id", "title", "description", "deadline", "assigned_to", "assigned_by",
            "items", "ticket_items", "item_usages", "defective_items", "non_serialized_items", "charges", "created_at", "assigned_at",
            "completed_at", "store", "store_details", "flagged", "assigned_to_users", "attachments",
            "status", "created_by", "ticketNotes", "technician_notes", "customer_notes", "paid", "payable",
            "representativePhone", "representativeName"
        ]

    def get_attachments(self, obj):
        attachments = getattr(obj, "_prefetched_attachments", None)
        if attachments is None:
            attachments = Attachment.objects.filter(content_type=ContentType.objects.get_for_model(Ticket), object_id=obj.id)
        return AttachmentSerializer(attachments, many=True).data

    def get_technician_notes(self, obj):
        technician_note = TicketNotes.objects.filter(ticket=obj, status="Technician").first()
        return technician_note.description if technician_note else None

    def get_customer_notes(self, obj):
        customer_note = TicketNotes.objects.filter(ticket=obj, status="Service Customer").first()
        return customer_note.description if customer_note else None

    def get_store_details(self, obj):
        if obj.store:
            return {
                'id': obj.store.id,
                'store_name': obj.store.store_name,
                'store_address': obj.store.store_address,
                'store_city': obj.store.store_city,
                'store_zip_code': obj.store.store_zip_code,
                'store_billing_email': obj.store.store_billing_email,
                'store_phone': obj.store.store_phone,
                'owner_name': obj.store.owner_name,
                'owner_email': obj.store.owner_email,
                'owner_phone': obj.store.owner_phone,
                'distributor_name': obj.store.distributor_name,
                'distributor_email': obj.store.distributor_email,
                'distributor_phone': obj.store.distributor_phone,
                'manager_name': obj.store.manager_name,
                'manager_email': obj.store.manager_email,
                'manager_phone': obj.store.manager_phone,
                'open': obj.store.open,
                'close': obj.store.close,
                'customer': {
                    'id': obj.store.customer.id,
                    'username': obj.store.customer.username,
                    'email': obj.store.customer.email,
                    'role': obj.store.customer.role
                } if obj.store.customer else None
            }
        return None

    def validate_ticket_items(self, ticket_items_list):
        if not isinstance(ticket_items_list, list):
            raise serializers.ValidationError({"ticket_items": "Must be a list of item IDs."})
        current_ticket_id = self.instance.id if self.instance else None
        for item_id in ticket_items_list:
            try:
                item_id = int(item_id)
                item = InventoryItem.objects.get(id=item_id)
                # Allow items that are already assigned to this ticket
                if item.status == "in_use" and not Ticket.objects.filter(
                    items=item, id=current_ticket_id
                ).exists():
                    if Ticket.objects.filter(
                        items=item, status__in=["OPEN", "IN PROGRESS", "PARTIALLY CLOSED", "PENDING APPROVAL"]
                    ).exclude(id=current_ticket_id).exists():
                        raise serializers.ValidationError({"ticket_items": f"Item ID {item_id} is already assigned to another open ticket."})
            except (ValueError, TypeError):
                raise serializers.ValidationError({"ticket_items": f"Invalid item_id: {item_id}."})
            except InventoryItem.DoesNotExist:
                raise serializers.ValidationError({"ticket_items": f"Item ID {item_id} does not exist."})
        return ticket_items_list

    def validate_item_usages(self, item_usages_dict):
        if not isinstance(item_usages_dict, dict):
            raise serializers.ValidationError({"item_usages": "Must be a dictionary with item IDs as keys and boolean values."})
        for item_id, used in item_usages_dict.items():
            try:
                item_id = str(item_id)
                if not isinstance(used, bool):
                    raise serializers.ValidationError({"item_usages": f"Value for item ID {item_id} must be a boolean."})
                int(item_id)  # Ensure item_id is numeric
            except (ValueError, TypeError):
                raise serializers.ValidationError({"item_usages": f"Invalid item_id: {item_id}."})
        return item_usages_dict

    def validate_defective_items(self, defective_items_dict):
        if not isinstance(defective_items_dict, dict):
            raise serializers.ValidationError({"defective_items": "Must be a dictionary with item IDs as keys and boolean values."})
        for item_id, is_defective in defective_items_dict.items():
            try:
                item_id = str(item_id)
                if not isinstance(is_defective, bool):
                    raise serializers.ValidationError({"defective_items": f"Value for item ID {item_id} must be a boolean."})
                int(item_id)  # Ensure item_id is numeric
            except (ValueError, TypeError):
                raise serializers.ValidationError({"defective_items": f"Invalid item_id: {item_id}."})
        return defective_items_dict

    def validate_non_serialized_items(self, non_serialized_items_list):
        if not isinstance(non_serialized_items_list, list):
            raise serializers.ValidationError({"non_serialized_items": "Must be a list of non-serialized item objects."})
        
        for item in non_serialized_items_list:
            if not isinstance(item, dict):
                raise serializers.ValidationError({"non_serialized_items": "Each non-serialized item must be an object."})
            
            required_fields = ['inventory_id', 'warehouse_id', 'quantity']
            for field in required_fields:
                if field not in item:
                    raise serializers.ValidationError({"non_serialized_items": f"Each non-serialized item must have '{field}' field."})
            
            try:
                inventory_id = int(item['inventory_id'])
                warehouse_id = int(item['warehouse_id'])
                quantity = int(item['quantity'])
                
                if quantity < 0:
                    raise serializers.ValidationError({"non_serialized_items": "Quantity cannot be negative."})
                
                # Validate inventory exists
                try:
                    inventory = Inventory.objects.get(id=inventory_id)
                    if inventory.serial_number_required:
                        raise serializers.ValidationError({"non_serialized_items": f"Inventory ID {inventory_id} requires serial numbers and cannot be used as non-serialized."})
                except Inventory.DoesNotExist:
                    raise serializers.ValidationError({"non_serialized_items": f"Inventory ID {inventory_id} does not exist."})
                
                # Validate warehouse exists
                try:
                    Warehouse.objects.get(id=warehouse_id)
                except Warehouse.DoesNotExist:
                    raise serializers.ValidationError({"non_serialized_items": f"Warehouse ID {warehouse_id} does not exist."})
                
            except (ValueError, TypeError):
                raise serializers.ValidationError({"non_serialized_items": "Quantity must be a valid integer."})
        
        return non_serialized_items_list

    def validate_charges(self, charges_list):
        if not isinstance(charges_list, list):
            raise serializers.ValidationError({"charges": "Must be a list of charge objects."})
        for charge in charges_list:
            if not isinstance(charge, dict):
                raise serializers.ValidationError({"charges": "Each charge must be an object."})
            if 'amount' not in charge or 'description' not in charge:
                raise serializers.ValidationError({"charges": "Each charge must have 'amount' and 'description' fields."})
            try:
                amount = float(charge['amount'])
                if amount < 0:
                    raise serializers.ValidationError({"charges": "Charge amount cannot be negative."})
            except (ValueError, TypeError):
                raise serializers.ValidationError({"charges": "Charge amount must be a valid number."})
            if not isinstance(charge['description'], str) or not charge['description'].strip():
                raise serializers.ValidationError({"charges": "Charge description cannot be empty."})
        return charges_list

    def deduct_stock(self, item_id):
        try:
            item = InventoryItem.objects.get(id=item_id)
            if item.status == "available":
                item.status = "in_use"
                item.save()
            return item
        except InventoryItem.DoesNotExist:
            raise serializers.ValidationError(f"No item with ID {item_id}.")

    def create(self, validated_data):
        request = self.context["request"]
        user = request.user
        assigned_to_users = validated_data.pop("assigned_to", [])
        ticket_items_input = validated_data.pop("ticket_items", [])
        item_usages_input = validated_data.pop("item_usages", {})
        defective_items_input = validated_data.pop("defective_items", {})
        non_serialized_items_input = validated_data.pop("non_serialized_items", [])
        charges_input = validated_data.pop("charges", [])
        ticket_notes_description = validated_data.pop("ticket_notes", None)
        ticket_items_list = self.validate_ticket_items(ticket_items_input)
        item_usages_dict = self.validate_item_usages(item_usages_input)
        defective_items_dict = self.validate_defective_items(defective_items_input)
        non_serialized_items_list = self.validate_non_serialized_items(non_serialized_items_input)
        charges_list = self.validate_charges(charges_input)

        with transaction.atomic():
            ticket = Ticket.objects.create(
                **validated_data,
                created_by=user,
                assigned_by=user if assigned_to_users else None,
                assigned_at=timezone.now() if assigned_to_users else None,
                item_usages=item_usages_dict,
                defective_items=defective_items_dict,
                charges=charges_list
            )
            if assigned_to_users:
                ticket.assigned_to.set(assigned_to_users)
                for technician in assigned_to_users:
                    Notification.objects.create(
                        title="New Ticket Assigned",
                        message=f"A new ticket ID #{ticket.id}, titled '{ticket.title}', has been assigned to you by {user.username}.",
                        notification_type="INFO",
                        recipient=technician,
                        link=f"/tickets/{ticket.id}"
                    )
            if ticket_notes_description:
                note_status = "Service Customer" if user.role == "Service Customer" else "Technician"
                TicketNotes.objects.create(
                    ticket=ticket,
                    description=ticket_notes_description,
                    created_by=user,
                    status=note_status
                )
            
            # Handle serialized items
            used_items = []
            for item_id in ticket_items_list:
                item = self.deduct_stock(item_id)
                used_items.append(item)
            ticket.items.set(used_items)
            
            # Handle non-serialized items - just assign them to the ticket
            for non_serialized_item in non_serialized_items_list:
                inventory_id = non_serialized_item['inventory_id']
                warehouse_id = non_serialized_item['warehouse_id']
                quantity = non_serialized_item['quantity']
                
                # Get available non-serialized items for this inventory and warehouse
                available_items = InventoryItem.objects.filter(
                    inventory_id=inventory_id,
                    warehouse_id=warehouse_id,
                    status='available',
                    attributes={}  # No attributes for non-serialized items
                )[:quantity]
                
                if available_items.count() < quantity:
                    raise serializers.ValidationError(f"Not enough available items for inventory {inventory_id} in warehouse {warehouse_id}")
                
                # Convert to list and set status to in_use (assigned to ticket)
                items_to_use = list(available_items)
                for item in items_to_use:
                    item.status = 'in_use'
                    item.save()
                
                # Add items to ticket
                ticket.items.add(*items_to_use)
            
            # Now handle the item_usages and defective_items for ALL items (both serialized and non-serialized)
            # This will be done after all items are assigned to the ticket
            for item in ticket.items.all():
                item_id_str = str(item.id)
                # Leave used items as 'in_use'. Only mark defective items here.
                if item_id_str in defective_items_dict and defective_items_dict[item_id_str]:
                    item.status = 'defective'
                    item.save()
            
            # Note: Non-serialized items are now handled with actual item IDs in item_usages and defective_items
            # The frontend sends the actual item IDs, so no special key handling is needed
            
            # Update ticket with final item_usages and defective_items
            ticket.item_usages = item_usages_dict
            ticket.defective_items = defective_items_dict
            ticket.save()
            
        return ticket

    def update(self, instance, validated_data):
        request = self.context["request"]
        user = request.user
        assigned_to_users = validated_data.pop("assigned_to", None)
        ticket_items_input = validated_data.pop("ticket_items", [])
        item_usages_input = validated_data.pop("item_usages", {})
        defective_items_input = validated_data.pop("defective_items", {})
        non_serialized_items_input = validated_data.pop("non_serialized_items", [])
        charges_input = validated_data.pop("charges", [])
        ticket_notes_description = validated_data.pop("ticket_notes", None)
        ticket_items_list = self.validate_ticket_items(ticket_items_input)
        item_usages_dict = self.validate_item_usages(item_usages_input)
        defective_items_dict = self.validate_defective_items(defective_items_input)
        non_serialized_items_list = self.validate_non_serialized_items(non_serialized_items_input)
        charges_list = self.validate_charges(charges_input)

        with transaction.atomic():
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            instance.item_usages = item_usages_dict
            instance.defective_items = defective_items_dict
            instance.charges = charges_list

            if assigned_to_users is not None:
                old_assigned_to = set(instance.assigned_to.all())
                instance.assigned_to.set(assigned_to_users)
                instance.assigned_by = user
                instance.assigned_at = timezone.now()
                for technician in old_assigned_to - set(assigned_to_users):
                    Notification.objects.create(
                        title="Ticket Unassigned",
                        message=f"You have been unassigned from ticket ID #{instance.id}, titled '{instance.title}'.",
                        notification_type="INFO",
                        recipient=technician,
                        link=f"/tickets/{instance.id}"
                    )
                for technician in set(assigned_to_users) - old_assigned_to:
                    Notification.objects.create(
                        title="New Ticket Assigned",
                        message=f"Ticket ID #{instance.id}, titled '{instance.title}', has been assigned to you by {user.username}.",
                        notification_type="INFO",
                        recipient=technician,
                        link=f"/tickets/{instance.id}"
                    )

            if ticket_notes_description:
                note_status = "Service Customer" if user.role == "Service Customer" else "Technician"
                existing_note = TicketNotes.objects.filter(ticket=instance, status=note_status).first()
                if existing_note:
                    existing_note.description = ticket_notes_description
                    existing_note.save()
                else:
                    TicketNotes.objects.create(
                        ticket=instance,
                        description=ticket_notes_description,
                        created_by=user,
                        status=note_status
                    )

            # Handle serialized items
            current_items = {item.id: item for item in instance.items.all()}
            new_items = {int(item_id): item_id for item_id in ticket_items_list}
            used_items = []

            # Add or keep serialized items
            for item_id in new_items.values():
                if item_id in current_items:
                    used_items.append(current_items[item_id])
                else:
                    item = self.deduct_stock(item_id)
                    used_items.append(item)

            # Handle non-serialized items - just assign them to the ticket
            for non_serialized_item in non_serialized_items_list:
                inventory_id = non_serialized_item['inventory_id']
                warehouse_id = non_serialized_item['warehouse_id']
                quantity = non_serialized_item['quantity']
                
                # Get available non-serialized items for this inventory and warehouse
                available_items = InventoryItem.objects.filter(
                    inventory_id=inventory_id,
                    warehouse_id=warehouse_id,
                    status='available',
                    attributes={}  # No attributes for non-serialized items
                )[:quantity]
                
                if available_items.count() < quantity:
                    raise serializers.ValidationError(f"Not enough available items for inventory {inventory_id} in warehouse {warehouse_id}")
                
                # Convert to list and set status to in_use (assigned to ticket)
                items_to_use = list(available_items)
                for item in items_to_use:
                    item.status = 'in_use'
                    item.save()
                    used_items.append(item)

            # Release items no longer in the ticket
            for item_id, item in current_items.items():
                if item_id not in new_items and item not in used_items:
                    item.status = "available"
                    item.save()

            instance.items.set(used_items)
            
            # Now handle the item_usages and defective_items for ALL items (both serialized and non-serialized)
            # This will be done after all items are assigned to the ticket
            for item in instance.items.all():
                item_id_str = str(item.id)
                # Leave used items as 'in_use'. Only mark defective items here.
                if item_id_str in defective_items_dict and defective_items_dict[item_id_str]:
                    item.status = 'defective'
                    item.save()
                elif item.status == 'in_use':  # Keep as in_use if not marked as used or defective
                    pass
                else:
                    item.status = 'in_use'  # Default to in_use for assigned items
                    item.save()
            
            # Note: Non-serialized items are now handled with actual item IDs in item_usages and defective_items
            # The frontend sends the actual item IDs, so no special key handling is needed
            
            instance.item_usages = item_usages_dict
            instance.defective_items = defective_items_dict
            instance.save()
        return instance



class SupportTicketSerializer(serializers.ModelSerializer):
    attachments = AttachmentSerializer(many=True, read_only=True)
    created_by = AccountSerializer(read_only=True)

    class Meta:
        model = SupportTicket
        fields = ["id", "type", "title", "description", "created_by", "created_at", "attachments"]


class InventoryCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = InventoryCategory
        fields = ["id", "name"]


class WarehouseManagerSerializer(serializers.ModelSerializer):
    manager = serializers.PrimaryKeyRelatedField(
        queryset=Account.objects.filter(role="Warehouse Manager")
    )

    class Meta:
        model = WarehouseManager
        fields = ["id", "manager"]


class WarehouseSerializer(serializers.ModelSerializer):
    warehouse_managers = WarehouseManagerSerializer(many=True)

    class Meta:
        model = Warehouse
        fields = ["id", "name", "status", "warehouse_managers"]

    def create(self, validated_data):
        manager_data = validated_data.pop("warehouse_managers", [])
        warehouse = Warehouse.objects.create(**validated_data)

        for manager in manager_data:
            warehouse.warehouse_managers.create(**manager)

        return warehouse

    def update(self, instance, validated_data):
        manager_data = validated_data.pop("warehouse_managers", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if manager_data is not None:
            instance.warehouse_managers.all().delete()
            for manager in manager_data:
                instance.warehouse_managers.create(**manager)

        return instance


class InventoryLocationSerializer(serializers.ModelSerializer):
    warehouse_name = serializers.CharField(source="warehouse.name", read_only=True)
    available_quantity = serializers.SerializerMethodField()
    in_use_quantity = serializers.SerializerMethodField()
    consumed_quantity = serializers.SerializerMethodField()

    class Meta:
        model = InventoryLocation
        fields = [
            "warehouse", 
            "aisle", 
            "shelf", 
            "bay", 
            "warehouse_name", 
            "available_quantity",
            "in_use_quantity",
            "consumed_quantity"
        ]

    def validate_warehouse(self, value):
        try:
            Warehouse.objects.get(id=value.id)
        except Warehouse.DoesNotExist:
            raise serializers.ValidationError("Invalid warehouse ID.")
        return value
    
    def get_available_quantity(self, obj):
        """
        Returns the count of InventoryItem objects with status='available'
        for the InventoryLocation's inventory and warehouse.
        """
        return InventoryItem.objects.filter(
            inventory=obj.inventory,
            warehouse=obj.warehouse,
            status="available"
        ).count()

    def get_in_use_quantity(self, obj):
        """
        Returns the count of InventoryItem objects with status='in_use'
        for the InventoryLocation's inventory and warehouse.
        """
        return InventoryItem.objects.filter(
            inventory=obj.inventory,
            warehouse=obj.warehouse,
            status="in_use"
        ).count()

    def get_consumed_quantity(self, obj):
        """
        Returns the count of InventoryItem objects with status='consumed'
        for the InventoryLocation's inventory and warehouse.
        """
        return InventoryItem.objects.filter(
            inventory=obj.inventory,
            warehouse=obj.warehouse,
            status="consumed"
        ).count()


class InventorySerializer(serializers.ModelSerializer):
    category = InventoryCategorySerializer(read_only=True)
    locations = InventoryLocationSerializer(many=True, read_only=True)
    items = InventoryItemSerializer(many=True, read_only=True)
    attachments = serializers.SerializerMethodField()

    class Meta:
        model = Inventory
        fields = "__all__"

    def get_attachments(self, obj):
        attachments = getattr(obj, "_prefetched_attachments", None)
        if attachments is None:
            attachments = Attachment.objects.filter(content_type=ContentType.objects.get_for_model(Inventory), object_id=obj.id)
        return AttachmentSerializer(attachments, many=True).data


class InventoryCompleteSerializer(serializers.ModelSerializer):
    items = InventoryItemSerializer(many=True, read_only=True)
    locations = InventoryLocationSerializer(many=True, read_only=True)

    class Meta:
        model = Inventory
        fields = ["id", "name", "upc", "items", "locations"]



class InventorySimpleSerializer(serializers.ModelSerializer):
    category = serializers.PrimaryKeyRelatedField(
        queryset=InventoryCategory.objects.all(),
        allow_null=True,
        required=False
    )
    category_name = serializers.CharField(source="category.name", read_only=True, allow_null=True)
    locations = InventoryLocationSerializer(many=True, required=False, default=[])
    items = InventoryItemSerializer(many=True, read_only=True, default=[])
    total_quantity = serializers.SerializerMethodField()
    available_quantity = serializers.SerializerMethodField()
    attachments = serializers.SerializerMethodField()
    warehouse_names = serializers.SerializerMethodField()
    warehouse_ids = serializers.SerializerMethodField()

    class Meta:
        model = Inventory
        fields = [
            "id",
            "name",
            "upc",
            "description",
            "category",
            "category_name",
            "unit_price",
            "price",
            "low_stock_threshold",
            "serial_number_required",
            "qr_code",
            "locations",
            "items",
            "total_quantity",
            "available_quantity",
            "warehouse_names",
            "warehouse_ids",
            "created_at",
            "updated_at",
            "attachments"
        ]

    def get_total_quantity(self, obj):
        warehouse_id = self.context.get("warehouse_id")
        if warehouse_id:
            return obj.items.filter(warehouse_id=warehouse_id).count()
        return obj.items.count()

    def get_available_quantity(self, obj):
        warehouse_id = self.context.get("warehouse_id")
        if warehouse_id:
            return obj.items.filter(warehouse_id=warehouse_id, status="available").count()
        return obj.items.filter(status="available").count()
    
    def get_warehouse_names(self, obj):
        """Get warehouse names for this inventory item"""
        warehouse_id = self.context.get("warehouse_id")
        if warehouse_id:
            # If viewing a specific warehouse, return that warehouse name
            try:
                warehouse = Warehouse.objects.get(id=warehouse_id)
                return [warehouse.name]
            except Warehouse.DoesNotExist:
                return []
        else:
            # Union of warehouses from locations and items
            location_wh_ids = set(
                obj.locations.values_list('warehouse_id', flat=True).distinct()
            )
            item_wh_ids = set(
                obj.items.values_list('warehouse_id', flat=True).distinct()
            )
            warehouse_ids = list(location_wh_ids.union(item_wh_ids))
            if not warehouse_ids:
                return []
            warehouses = Warehouse.objects.filter(id__in=warehouse_ids)
            return [warehouse.name for warehouse in warehouses]
    
    def get_warehouse_ids(self, obj):
        """Get warehouse IDs for this inventory item"""
        warehouse_id = self.context.get("warehouse_id")
        if warehouse_id:
            try:
                Warehouse.objects.get(id=warehouse_id)
                return [warehouse_id]
            except Warehouse.DoesNotExist:
                return []
        else:
            location_wh_ids = set(
                obj.locations.values_list('warehouse_id', flat=True).distinct()
            )
            item_wh_ids = set(
                obj.items.values_list('warehouse_id', flat=True).distinct()
            )
            return list(location_wh_ids.union(item_wh_ids))
    
    def get_attachments(self, obj):
        attachments = getattr(obj, "_prefetched_attachments", None)
        if attachments is None:
            attachments = Attachment.objects.filter(content_type=ContentType.objects.get_for_model(Inventory), object_id=obj.id)
        return AttachmentSerializer(attachments, many=True).data


    def validate_upc(self, value):
        if not self.instance and Inventory.objects.filter(upc=value).exists():
            raise serializers.ValidationError("An inventory with this UPC already exists.")
        return value

    def validate_locations(self, locations_data):
        logger.debug(f"Validating locations: {locations_data}")
        if not locations_data and self.instance:
            item_warehouses = set(self.instance.items.values_list('warehouse_id', flat=True))
            existing_locations = set(self.instance.locations.values_list('warehouse_id', flat=True))
            if item_warehouses - existing_locations:
                logger.warning(
                    f"Validation failed for inventory {self.instance.id}: Cannot remove locations for "
                    f"warehouses with items: {item_warehouses - existing_locations}"
                )
                raise serializers.ValidationError(
                    "Cannot remove locations for warehouses with items."
                )
        else:
            warehouse_ids = []
            for loc in locations_data:
                warehouse = loc.get("warehouse")
                if warehouse is None:
                    logger.error(f"Missing warehouse in location: {loc}")
                    raise serializers.ValidationError("Warehouse ID is required for each location.")
                # Handle Warehouse object or ID
                if isinstance(warehouse, Warehouse):
                    warehouse_id = warehouse.id
                else:
                    try:
                        warehouse_id = int(str(warehouse))
                    except (ValueError, TypeError):
                        logger.error(f"Invalid warehouse ID received: {warehouse} (type: {type(warehouse)})")
                        raise serializers.ValidationError(
                            f"Invalid warehouse ID: {warehouse}. Expected a numeric ID."
                        )
                try:
                    Warehouse.objects.get(id=warehouse_id)
                except Warehouse.DoesNotExist:
                    logger.error(f"Warehouse ID {warehouse_id} does not exist in database.")
                    raise serializers.ValidationError(f"Warehouse ID {warehouse_id} does not exist.")
                warehouse_ids.append(warehouse_id)
            # Ensure all item warehouses are included
            if self.instance:
                item_warehouses = set(self.instance.items.values_list('warehouse_id', flat=True))
                provided_warehouses = set(warehouse_ids)
                if item_warehouses - provided_warehouses:
                    missing_warehouses = item_warehouses - provided_warehouses
                    logger.warning(
                        f"Missing locations for inventory {self.instance.id} warehouses: {missing_warehouses}"
                    )
                    raise serializers.ValidationError(
                        f"Missing locations for warehouses with items: {missing_warehouses}"
                    )
        return locations_data

    def create(self, validated_data):
        locations_data = validated_data.pop("locations", [])
        validated_data.pop("items", None)

        inventory = Inventory.objects.create(**validated_data)

        for loc_data in locations_data:
            warehouse_id = loc_data.get("warehouse")
            if isinstance(warehouse_id, Warehouse):
                warehouse_id = warehouse_id.id
            try:
                warehouse_id = int(warehouse_id)
                InventoryLocation.objects.create(
                    inventory=inventory,
                    warehouse_id=warehouse_id,
                    aisle=loc_data.get("aisle", ""),
                    shelf=loc_data.get("shelf", ""),
                    bay=loc_data.get("bay", ""),
                )
            except (ValueError, TypeError):
                logger.error(f"Invalid warehouse ID in create: {warehouse_id}")
                raise serializers.ValidationError(f"Invalid warehouse ID: {warehouse_id}")

        return inventory

    def update(self, instance, validated_data):
        locations_data = validated_data.pop("locations", None)
        validated_data.pop("items", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if locations_data is not None:
            try:
                item_warehouses = set(instance.items.values_list('warehouse_id', flat=True))
                provided_warehouses = set()
                for loc in locations_data:
                    warehouse = loc.get("warehouse")
                    if isinstance(warehouse, Warehouse):
                        warehouse_id = warehouse.id
                    else:
                        warehouse_id = int(str(warehouse))
                    provided_warehouses.add(warehouse_id)

                if item_warehouses - provided_warehouses:
                    missing_warehouses = item_warehouses - provided_warehouses
                    logger.error(
                        f"Cannot update inventory {instance.id}: Missing locations for warehouses: {missing_warehouses}"
                    )
                    raise serializers.ValidationError(
                        f"Cannot omit locations for warehouses with items: {missing_warehouses}"
                    )

                # Delete only locations not in provided_warehouses
                existing_locations = instance.locations.all()
                for loc in existing_locations:
                    if loc.warehouse_id not in provided_warehouses:
                        if loc.warehouse_id in item_warehouses:
                            logger.error(
                                f"Cannot delete location for warehouse {loc.warehouse_id} with items for inventory {instance.id}"
                            )
                            raise serializers.ValidationError(
                                f"Cannot remove location for warehouse {loc.warehouse_id} with items."
                            )
                        loc.delete()

                # Create or update locations
                for loc_data in locations_data:
                    warehouse = loc_data.get("warehouse")
                    if isinstance(warehouse, Warehouse):
                        warehouse_id = warehouse.id
                    else:
                        try:
                            warehouse_id = int(str(warehouse))
                        except (ValueError, TypeError):
                            logger.error(f"Invalid warehouse ID in update: {warehouse}")
                            raise serializers.validationError(f"Invalid warehouse ID: {warehouse}")
                    InventoryLocation.objects.update_or_create(
                        inventory=instance,
                        warehouse_id=warehouse_id,
                        defaults={
                            "aisle": loc_data.get("aisle", ""),
                            "shelf": loc_data.get("shelf", ""),
                            "bay": loc_data.get("bay", ""),
                        }
                    )
            except ValueError as e:
                logger.error(f"Error processing locations for inventory {instance.id}: {str(e)}")
                raise serializers.validationError(f"Invalid data in warehouse: {str(e)}")

        # Ensure locations exist for all item warehouses
        item_warehouses = set(instance.items.values_list('warehouse_id', flat=True))
        existing_location_warehouses = set(instance.locations.values_list('warehouse_id', flat=True))
        for warehouse_id in item_warehouses - existing_location_warehouses:
            logger.info(f"Created missing location for warehouse {warehouse_id} in inventory {instance.id}")
            InventoryLocation.objects.create(
                inventory=instance,
                warehouse_id=warehouse_id,
                aisle="",
                shelf="",
                bay="",
            )

        return instance
    

class TransferSerializer(serializers.ModelSerializer):
    source_content_type = serializers.CharField(write_only=True)
    source_object_id = serializers.IntegerField(write_only=True)
    destination_content_type = serializers.CharField(write_only=True)
    destination_object_id = serializers.IntegerField(write_only=True)
    items_data = serializers.JSONField(write_only=True)
    items = serializers.SerializerMethodField()
    created_by = serializers.StringRelatedField(read_only=True)
    source_name = serializers.SerializerMethodField()
    destination_name = serializers.SerializerMethodField()
    reference_number = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = Transfer
        fields = [
            "id",
            "transfer_type",
            "created_by",
            "created_at",
            "source_content_type",
            "source_object_id",
            "destination_content_type",
            "destination_object_id",
            "items",
            "items_data",
            "source_name",
            "destination_name",
            "reference_number",
        ]
        read_only_fields = ["id", "created_at", "items", "created_by", "source_name", "destination_name"]

    def get_items(self, obj):
        # Return item information including attributes
        return list(obj.items.values('id', 'inventory__name', 'inventory__upc', 'status', 'attributes'))
    
    def get_source_name(self, obj):
        model = obj.source_content_type.model

        if model == 'warehouse':
            try:
                return Warehouse.objects.get(id=obj.source_object_id).name
            except Warehouse.DoesNotExist:
                return "Unknown Warehouse"

        elif model == 'vendor':
            try:
                return Vendor.objects.get(id=obj.source_object_id).name
            except Vendor.DoesNotExist:
                return "Unknown Vendor"

        elif model == 'account':
            try:
                return User.objects.get(id=obj.source_object_id).username
            except User.DoesNotExist:
                return "Unknown User"

        elif model == 'storeprofile':
            try:
                store_profile = StoreProfile.objects.get(id=obj.source_object_id)
                return store_profile.store_name or f"Store {store_profile.id}"
            except StoreProfile.DoesNotExist:
                return f"Store {obj.source_object_id} (Not Found)"
            except Exception as e:
                return f"Store {obj.source_object_id} (Error: {str(e)})"

        return "Unknown"


    def get_destination_name(self, obj):
        if obj.destination_content_type.model == 'warehouse':
            try:
                return Warehouse.objects.get(id=obj.destination_object_id).name
            except Warehouse.DoesNotExist:
                return f"Warehouse {obj.destination_object_id} (Not Found)"
            except Exception as e:
                return f"Warehouse {obj.destination_object_id} (Error: {str(e)})"
        elif obj.destination_content_type.model == 'account':
            try:
                return User.objects.get(id=obj.destination_object_id).username
            except User.DoesNotExist:
                return f"User {obj.destination_object_id} (Not Found)"
            except Exception as e:
                return f"User {obj.destination_object_id} (Error: {str(e)})"
        elif obj.destination_content_type.model == 'storeprofile':
            try:
                store_profile = StoreProfile.objects.get(id=obj.destination_object_id)
                return store_profile.store_name or f"Store {store_profile.id}"
            except StoreProfile.DoesNotExist:
                return f"Store {obj.destination_object_id} (Not Found)"
            except Exception as e:
                return f"Store {obj.destination_object_id} (Error: {str(e)})"
        return "Unknown"

    def validate_source_content_type(self, value):
        valid_types = {
            "VENDOR_TO_WAREHOUSE": "vendor",
            "WAREHOUSE_TO_WAREHOUSE": "warehouse",
            "WAREHOUSE_TO_CUSTOMER": "warehouse",
            "WAREHOUSE_TO_STORE": "warehouse",
            "CUSTOMER_TO_WAREHOUSE": "account",
            "STORE_TO_WAREHOUSE": "storeprofile"
        }
        
        transfer_type = self.initial_data.get('transfer_type')
        expected_type = valid_types.get(transfer_type)
        
        if not expected_type:
            raise ValidationError("Invalid transfer type")
        
        # Handle both "store" and "storeprofile" for backward compatibility
        if expected_type == "storeprofile" and value.lower() == "store":
            value = "storeprofile"
            
        if value.lower() != expected_type:
            raise ValidationError(
                f"For {transfer_type}, source must be {expected_type}, not {value}"
            )
            
        try:
            return ContentType.objects.get(model=value.lower())
        except ContentType.DoesNotExist:
            raise ValidationError(f"Content type {value} does not exist")

    def validate_destination_content_type(self, value):
        valid_types = {
            "VENDOR_TO_WAREHOUSE": "warehouse",
            "WAREHOUSE_TO_WAREHOUSE": "warehouse",
            "WAREHOUSE_TO_CUSTOMER": "account",
            "WAREHOUSE_TO_STORE": "storeprofile",
            "CUSTOMER_TO_WAREHOUSE": "warehouse",
            "STORE_TO_WAREHOUSE": "warehouse"
        }
        
        transfer_type = self.initial_data.get('transfer_type')
        expected_type = valid_types.get(transfer_type)
        
        if not expected_type:
            raise ValidationError("Invalid transfer type")
        
        # Handle both "store" and "storeprofile" for backward compatibility
        if expected_type == "storeprofile" and value.lower() == "store":
            value = "storeprofile"
            
        if value.lower() != expected_type:
            raise ValidationError(
                f"For {transfer_type}, destination must be {expected_type}, not {value}"
            )
            
        try:
            return ContentType.objects.get(model=value.lower())
        except ContentType.DoesNotExist:
            raise ValidationError(f"Content type {value} does not exist")

    def validate_items_data(self, value):
        if not isinstance(value, list):
            raise ValidationError("items_data must be a list")
        return value

    def validate(self, data):
        # Ensure source and destination are not the same for WAREHOUSE_TO_WAREHOUSE
        if data.get("transfer_type") == "WAREHOUSE_TO_WAREHOUSE":
            source_type = data.get("source_content_type")
            source_id = data.get("source_object_id")
            dest_type = data.get("destination_content_type")
            dest_id = data.get("destination_object_id")

            if source_type == dest_type and source_id == dest_id:
                raise serializers.ValidationError(
                    "Source and destination cannot be the same for Warehouse to Warehouse transfers."
                )
        
        # Validate reference_number for VENDOR_TO_WAREHOUSE
        if data.get("transfer_type") == "VENDOR_TO_WAREHOUSE" and not data.get("reference_number"):
            raise serializers.ValidationError(
                {"reference_number": "Reference number is required for Vendor to Warehouse transfers."}
            )

        items_data = data.get("items_data")
        if not items_data or not isinstance(items_data, list) or len(items_data) == 0:
            raise ValidationError("items_data must be a non-empty list")

        transfer_type = data.get("transfer_type")
        source_content_type = data.get("source_content_type")
        destination_content_type = data.get("destination_content_type")
        source_object_id = data.get("source_object_id")
        destination_object_id = data.get("destination_object_id")

        # Validate source object exists
        try:
            source_model = source_content_type.model_class()
            source_model.objects.get(id=source_object_id)
        except source_model.DoesNotExist:
            raise ValidationError(
                f"No {source_content_type.model} found with ID {source_object_id}"
            )

        # Validate destination object exists
        try:
            destination_model = destination_content_type.model_class()
            destination_model.objects.get(id=destination_object_id)
        except destination_model.DoesNotExist:
            raise ValidationError(
                f"No {destination_content_type.model} found with ID {destination_object_id}"
            )

        # Validate items_data structure based on transfer type
        for index, item_data in enumerate(items_data):
            quantity = item_data.get("quantity", 1)
            attributes = item_data.get("attributes", [])
            item_ids = item_data.get("item_ids", [])

            if transfer_type == "WAREHOUSE_TO_CUSTOMER":
                # For WAREHOUSE_TO_CUSTOMER, only item_ids and quantity are required
                if not item_ids:
                    raise ValidationError(
                        f"Item IDs are required for item {index + 1} in {transfer_type} transfer"
                    )
                if len(item_ids) != quantity:
                    raise ValidationError(
                        f"For item {index + 1}, number of item IDs ({len(item_ids)}) "
                        f"must match quantity ({quantity})"
                    )
                # Validate each item_id exists and is in the source warehouse
                for item_id in item_ids:
                    try:
                        item = InventoryItem.objects.get(id=item_id)
                        if item.warehouse_id != source_object_id:
                            raise ValidationError(
                                f"Item {item_id} is not in source warehouse {source_object_id}"
                            )
                    except InventoryItem.DoesNotExist:
                        raise ValidationError(f"Item ID {item_id} does not exist")

            elif transfer_type in ["CUSTOMER_TO_WAREHOUSE"]:
                # CUSTOMER_TO_WAREHOUSE requires item_ids
                if not item_ids:
                    raise ValidationError(
                        f"Item IDs are required for item {index + 1} in {transfer_type} transfer"
                    )
                if len(item_ids) != quantity:
                    raise ValidationError(
                        f"For item {index + 1}, number of item IDs ({len(item_ids)}) "
                        f"must match quantity ({quantity})"
                    )
                # Validate item_ids exist
                for item_id in item_ids:
                    try:
                        InventoryItem.objects.get(id=item_id)
                    except InventoryItem.DoesNotExist:
                        raise ValidationError(f"Item ID {item_id} does not exist")

            elif transfer_type == "VENDOR_TO_WAREHOUSE":
                # VENDOR_TO_WAREHOUSE requires inventory_id
                inventory_id = item_data.get("inventory_id")
                if inventory_id is None:
                    raise ValidationError(f"Inventory ID is required for item {index + 1}")
                try:
                    inventory = Inventory.objects.get(id=inventory_id)
                except Inventory.DoesNotExist:
                    raise ValidationError(f"Inventory ID {inventory_id} does not exist")
                
                if inventory.serial_number_required:
                    if len(attributes) != quantity:
                        raise ValidationError(
                            f"For {inventory.name}, number of attribute sets ({len(attributes)}) "
                            f"must match quantity ({quantity})"
                        )
                    for attr in attributes:
                        required_attrs = ['serial_number', 'mac_address', 'ip_address', 'service_tag', 'service_number']
                        if not all(attr.get(key) for key in required_attrs):
                            raise ValidationError(
                                f"Missing required attributes for {inventory.name}"
                            )

            elif transfer_type == "WAREHOUSE_TO_STORE":
                # WAREHOUSE_TO_STORE requires either inventory_id or item_ids
                inventory_id = item_data.get("inventory_id")
                item_ids = item_data.get("item_ids", [])
                
                if not item_ids:
                    # If no item_ids provided, inventory_id is required
                    if inventory_id is None:
                        raise ValidationError(f"Inventory ID is required for item {index + 1}")
                    try:
                        inventory = Inventory.objects.get(id=inventory_id)
                    except Inventory.DoesNotExist:
                        raise ValidationError(f"Inventory ID {inventory_id} does not exist")
                else:
                    # If item_ids provided, validate them and get inventory_id from first item
                    if len(item_ids) != quantity:
                        raise ValidationError(
                            f"For item {index + 1}, number of item IDs ({len(item_ids)}) "
                            f"must match quantity ({quantity})"
                        )
                    
                    # Validate all items exist and are in the source warehouse
                    items = []
                    for item_id in item_ids:
                        try:
                            item = InventoryItem.objects.get(id=item_id)
                            if item.warehouse_id != source_object_id:
                                raise ValidationError(
                                    f"Item {item_id} is not in source warehouse {source_object_id}"
                                )
                            items.append(item)
                        except InventoryItem.DoesNotExist:
                            raise ValidationError(f"Item ID {item_id} does not exist")
                    
                    # Get inventory_id from the first item
                    if items:
                        inventory_id = items[0].inventory_id
                        inventory = items[0].inventory
                        
                        # Ensure all items belong to the same inventory
                        for item in items[1:]:
                            if item.inventory_id != inventory_id:
                                raise ValidationError(
                                    f"All items must belong to the same inventory. Item {item.id} belongs to inventory {item.inventory.name}, but expected {inventory.name}"
                                )
                        
                        # Add the derived inventory_id to the item_data so the model can use it
                        item_data['inventory_id'] = inventory_id
                    else:
                        raise ValidationError(f"No valid items found for item {index + 1}")

            elif transfer_type == "WAREHOUSE_TO_WAREHOUSE":
                # WAREHOUSE_TO_WAREHOUSE requires inventory_id, item_ids optional
                inventory_id = item_data.get("inventory_id")
                if inventory_id is None:
                    raise ValidationError(f"Inventory ID is required for item {index + 1}")
                try:
                    inventory = Inventory.objects.get(id=inventory_id)
                except Inventory.DoesNotExist:
                    raise ValidationError(f"Inventory ID {inventory_id} does not exist")
                
                if item_ids:  # If item_ids provided, validate them
                    if len(item_ids) != quantity:
                        raise ValidationError(
                            f"For item {index + 1} ({inventory.name}), number of item IDs ({len(item_ids)}) "
                            f"must match quantity ({quantity})"
                        )
                    for item_id in item_ids:
                        try:
                            item = InventoryItem.objects.get(id=item_id)
                            if item.inventory_id != inventory.id:
                                raise ValidationError(
                                    f"Item {item_id} does not belong to inventory {inventory.name}"
                                )
                            if item.warehouse_id != source_object_id:
                                raise ValidationError(
                                    f"Item {item_id} is not in source warehouse {source_object_id}"
                                )
                        except InventoryItem.DoesNotExist:
                            raise ValidationError(f"Item ID {item_id} does not exist")

        return data

    def create(self, validated_data):
        from django.db import transaction
        items_data = validated_data.pop("items_data")
        source_content_type = validated_data.pop("source_content_type")
        destination_content_type = validated_data.pop("destination_content_type")
        source_object_id = validated_data.pop("source_object_id")
        destination_object_id = validated_data.pop("destination_object_id")
        user = self.context["request"].user

        with transaction.atomic():
            transfer = Transfer.objects.create(
                source_content_type=source_content_type,
                source_object_id=source_object_id,
                destination_content_type=destination_content_type,
                destination_object_id=destination_object_id,
                **validated_data
            )
            transfer.process_transfer(items_data)
            return transfer     

    def update(self, instance, validated_data):
        items_data = validated_data.pop("items_data", None)
        source_content_type = validated_data.pop("source_content_type", instance.source_content_type)
        destination_content_type = validated_data.pop("destination_content_type", instance.destination_content_type)
        source_object_id = validated_data.pop("source_object_id", instance.source_object_id)
        destination_object_id = validated_data.pop("destination_object_id", instance.destination_object_id)

        with transaction.atomic():
            # Update transfer fields
            instance.transfer_type = validated_data.get("transfer_type", instance.transfer_type)
            instance.source_content_type = source_content_type
            instance.source_object_id = source_object_id
            instance.destination_content_type = destination_content_type
            instance.destination_object_id = destination_object_id
            instance.save()

            # Revert previous items to their original state
            if items_data is not None:
                # Get current items and reset their state
                current_items = instance.items.all()
                for item in current_items:
                    # Reset item to source (undo previous transfer)
                    if instance.transfer_type in ["WAREHOUSE_TO_WAREHOUSE", "WAREHOUSE_TO_CUSTOMER"]:
                        item.warehouse_id = instance.source_object_id
                        item.status = "available"
                    elif instance.transfer_type == "CUSTOMER_TO_WAREHOUSE":
                        item.status = "consumed"  # Assuming customer retains ownership
                    elif instance.transfer_type == "VENDOR_TO_WAREHOUSE":
                        item.delete()  # Items from vendor are new, so remove them
                    item.save()

                # Clear existing items
                instance.items.clear()

                # Process new items_data
                instance.process_transfer(items_data)

        return instance    


class RepairSerializer(serializers.ModelSerializer):
    inventory_items = serializers.PrimaryKeyRelatedField(
        queryset=InventoryItem.objects.all(),
        many=True,
        help_text="The inventory items associated with the repair"
    )
    vendor = serializers.PrimaryKeyRelatedField(
        queryset=Vendor.objects.all(),
        allow_null=True,
        required=False,
        help_text="The vendor assigned to the repair, if any"
    )
    created_by = AccountSerializer(read_only=True)
    approved_by = AccountSerializer(read_only=True)
    inventory_items_details = serializers.SerializerMethodField()
    vendor_details = serializers.SerializerMethodField()

    class Meta:
        model = Repair
        fields = [
            "id",
            "inventory_items",
            "inventory_items_details",
            "vendor",
            "vendor_details",
            "status",
            "information",
            "created_by",
            "approved_by",
            "created_at",
            "updated_at",
            "approved_at",
        ]
        read_only_fields = ["id", "created_by", "approved_by", "created_at", "updated_at", "approved_at", "attachments"]

    def get_inventory_items_details(self, obj):
        from .serializers import InventoryItemSerializer
        return InventoryItemSerializer(obj.inventory_items.all(), many=True).data

    def get_vendor_details(self, obj):
        from .serializers import VendorSerializer
        if obj.vendor:
            return VendorSerializer(obj.vendor).data
        return None

    def validate_inventory_items(self, value):
        # Ensure all inventory items are not consumed
        for item in value:
            if item.status == "consumed":
                raise serializers.ValidationError(f"Cannot create repair for consumed item ID {item.id}.")
        return value

    def validate_information(self, value):
        # Ensure information is a valid JSON object
        if not isinstance(value, dict):
            raise serializers.ValidationError("Information must be a valid JSON object.")
        # Validate expected keys
        expected_keys = {"notes", "tracking_number", "reference_number"}
        for key in value:
            if key not in expected_keys:
                raise serializers.ValidationError(f"Invalid key in information: {key}")
            if not isinstance(value[key], str):
                raise serializers.ValidationError(f"Value for {key} must be a string")
        # Ensure all expected keys are present
        for key in expected_keys:
            if key not in value:
                value[key] = ""
        return value

    def create(self, validated_data):
        validated_data["created_by"] = self.context["request"].user
        inventory_items = validated_data.pop("inventory_items", [])
        with transaction.atomic():
            repair = super().create(validated_data)
            repair.inventory_items.set(inventory_items)
            # Update inventory items' status
            for item in inventory_items:
                item.status = "in_repair"
                item.save()
            return repair

    def update(self, instance, validated_data):
        inventory_items = validated_data.pop("inventory_items", None)
        new_status = validated_data.get("status", instance.status)
        with transaction.atomic():
            # Check for consumed items if moving to PENDING or APPROVED
            if new_status in ["PENDING", "APPROVED"]:
                for item in instance.inventory_items.all():
                    if item.status == "consumed":
                        raise serializers.ValidationError(
                            f"Cannot change status to {new_status} because item ID {item.id} is already consumed."
                        )

            # Update repair fields
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            instance.save()

            # Update inventory items if provided
            if inventory_items is not None:
                # Reset status of removed items to available
                current_items = set(instance.inventory_items.all())
                new_items = set(inventory_items)
                for item in current_items - new_items:
                    item.status = "available"
                    item.save()
                # Set new items
                instance.inventory_items.set(inventory_items)
                # Update status of included items
                for item in inventory_items:
                    item.status = "in_repair"
                    item.save()
            else:
                # If no inventory_items provided, use current items
                inventory_items = instance.inventory_items.all()

            # Update status of all linked items based on repair status
            for item in instance.inventory_items.all():
                if new_status == "REPAIRED":
                    item.status = "available"
                # elif new_status in ["PENDING", "APPROVED"]:
                #     item.status = "in_repair"
                item.save()
                logger.info(f"Item {item.id} set to {item.status} for repair {instance.id} with status {new_status}")

            return instance



class ReconciliationReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReconciliationReport
        fields = ["id", "reconciliation", "warehouse", "items", "created_at"]
        read_only_fields = ["id", "reconciliation", "warehouse", "created_at"]

class ReconciliationSerializer(serializers.ModelSerializer):
    created_by = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role="Warehouse Manager"),
        default=serializers.CurrentUserDefault()
    )
    warehouse_name = serializers.CharField(source="warehouse.name", read_only=True)
    created_by_name = serializers.CharField(source="created_by.username", read_only=True)	
    report = ReconciliationReportSerializer(read_only=True)

    class Meta:
        model = Reconciliation
        fields = [
            "id",
            "warehouse",
            "warehouse_name",
            "created_by",
            "created_by_name",
            "status",
            "created_at",
            "updated_at",
            "submitted_at",
            "approved_at",
            "approved_by",
            "report",
        ]
        read_only_fields = ["id", "created_by", "created_at", "updated_at", "submitted_at", "approved_at", "approved_by"]

    def validate_status(self, value):
        if self.instance and value != self.instance.status:
            if value == "APPROVED" and self.context["request"].user.role != "Admin":
                raise serializers.ValidationError("Only Admins can approve reconciliations.")
            if value == "SUBMITTED" and self.context["request"].user.role != "Warehouse Manager":
                raise serializers.ValidationError("Only Warehouse Managers can submit reconciliations.")
        return value

class ReconciliationScanSerializer(serializers.Serializer):
    upc = serializers.CharField(max_length=550)
    actual_quantity = serializers.IntegerField(min_value=0)
    warehouse_id = serializers.IntegerField(write_only=True)
    extra_items_attributes = serializers.ListField(
        child=serializers.JSONField(),
        required=False,
        write_only=True,
        help_text="List of all attributes (serial number, MAC address, etc.) for extra items found during reconciliation"
    )
    missing_items = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        write_only=True,
        help_text="List of item IDs that are missing"
    )

    def validate(self, data):
        try:
            inventory = Inventory.objects.get(upc=data['upc'])
            warehouse = Warehouse.objects.get(id=data['warehouse_id'])
            
            # Check if inventory exists in this specific warehouse's location
            inventory_location = InventoryLocation.objects.filter(
                inventory=inventory,
                warehouse=warehouse
            ).exists()
            
            if not inventory_location:
                raise serializers.ValidationError(
                    f"Inventory with UPC {data['upc']} not found in warehouse {warehouse.name}."
                )

            # Validate extra items attributes if provided
            extra_items_attributes = data.get('extra_items_attributes', [])
            actual_quantity = data['actual_quantity']
            available_items = InventoryItem.objects.filter(
                inventory=inventory,
                warehouse=warehouse,
                status="available"
            ).count()

            if actual_quantity > available_items:
                extra_count = actual_quantity - available_items
                if len(extra_items_attributes) != extra_count:
                    raise serializers.ValidationError(
                        f"You must provide attributes for all {extra_count} extra items of {inventory.name}."
                    )
                # Get required attributes from inventory configuration
                required_attrs = inventory.required_attributes if hasattr(inventory, 'required_attributes') else []
                
                # Validate each extra item's attributes
                for attrs in extra_items_attributes:
                    # Check for required attributes if any are configured
                    if required_attrs:
                        missing_attrs = [attr for attr in required_attrs if not attrs.get(attr)]
                        if missing_attrs:
                            raise serializers.ValidationError(
                                f"Missing required attributes for extra item: {', '.join(missing_attrs)}"
                            )

            # Validate missing items if provided
            missing_items = data.get('missing_items', [])
            if available_items > actual_quantity:
                missing_count = available_items - actual_quantity
                if inventory.serial_number_required and len(missing_items) != missing_count:
                    raise serializers.ValidationError(
                        f"For serialized inventory {inventory.name}, you must specify which {missing_count} items are missing."
                    )
                # Validate each missing item ID
                for item_id in missing_items:
                    try:
                        item = InventoryItem.objects.get(
                            id=item_id,
                            inventory=inventory,
                            warehouse=warehouse,
                            status="available"
                        )
                    except InventoryItem.DoesNotExist:
                        raise serializers.ValidationError(f"Invalid missing item ID: {item_id}")
            
            # Store these for later use
            self.inventory = inventory
            self.warehouse = warehouse
            
            return data
        except Inventory.DoesNotExist:
            raise serializers.ValidationError(f"Inventory with UPC {data['upc']} does not exist.")
        except Warehouse.DoesNotExist:
            raise serializers.ValidationError(f"Warehouse with ID {data['warehouse_id']} does not exist.")

    def update_report(self, reconciliation):
        upc = self.validated_data["upc"]
        actual_quantity = self.validated_data["actual_quantity"]
        extra_items_attributes = self.validated_data.get("extra_items_attributes", [])
        missing_items = self.validated_data.get("missing_items", [])
        
        # Use the validated inventory and warehouse from validate()
        inventory = self.inventory
        warehouse = self.warehouse

        # Get available items in this warehouse
        available_items = InventoryItem.objects.filter(
            inventory=inventory,
            warehouse=warehouse,
            status="available"
        )
        
        expected_quantity = available_items.count()
        
        # Get attributes for all items, including those marked as missing
        all_items = available_items
        if missing_items:
            all_items = available_items.filter(id__in=missing_items)
        
        attributes = [
            {
                "id": item.id,
                "attributes": item.attributes or {},
                "status": item.status,
                "is_missing": item.id in missing_items if missing_items else False
            }
            for item in all_items
        ]

        # Add attributes for extra items if any
        if extra_items_attributes:
            for attrs in extra_items_attributes:
                attributes.append({
                    "id": None,  # New item, no ID yet
                    "attributes": attrs,
                    "status": "pending",
                    "is_extra": True
                })

        discrepancy_type = (
            "MATCH" if expected_quantity == actual_quantity else
            "MISSING" if expected_quantity > actual_quantity else
            "EXTRA"
        )

        with transaction.atomic():
            report, created = ReconciliationReport.objects.get_or_create(
                reconciliation=reconciliation,
                warehouse=warehouse,
                defaults={"items": []}
            )
            
            # Check if UPC already scanned
            for item in report.items:
                if item["upc"] == upc:
                    raise serializers.ValidationError(f"UPC {upc} already scanned in this reconciliation.")

            report.items.append({
                "upc": upc,
                "name": inventory.name,
                "expected_quantity": expected_quantity,
                "actual_quantity": actual_quantity,
                "discrepancy_type": discrepancy_type,
                "attributes": attributes,
                "action": "NONE",
                "serial_number_required": inventory.serial_number_required
            })
            report.save()
            logger.info(f"Scanned UPC {upc} for reconciliation {reconciliation.id}")
            return report
        

# ======================================================================
class VendorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendor
        fields = "__all__"


class WarehouseManagerDetailedSerializer(serializers.ModelSerializer):
    manager = AccountSerializer()

    class Meta:
        model = WarehouseManager
        fields = ["id", "manager"]


class WarehouseDetailSerializer(WarehouseSerializer):
    inventory_status_summary = serializers.SerializerMethodField()
    warehouse_managers = WarehouseManagerDetailedSerializer(many=True, read_only=True)

    class Meta(WarehouseSerializer.Meta):
        fields = WarehouseSerializer.Meta.fields + ["inventory_status_summary"]

    def get_inventory_status_summary(self, obj):
        try:
            summary = (
                InventoryItem.objects.filter(warehouse=obj)
                .values("status")
                .annotate(total_quantity=Sum(1))
                .filter(status__in=["available", "in_use", "in_repair"])
            )

            result = {
                "available": 0,
                "in_use": 0,
                "in_repair": 0,
            }
            for entry in summary:
                result[entry["status"]] = entry["total_quantity"] or 0

            return result
        except Exception as e:
            return {"error": "Failed to retrieve inventory status summary"}


class VendingCustomerLocationSerializer(serializers.ModelSerializer):
    assigned_to_user = AccountSerializer(source="assigned_to", read_only=True)

    class Meta:
        model = VendingCustomerLocation
        fields = [
            "id",
            "name",
            "location",
            "status",
            "created_at",
            "assigned_to",
            "assigned_to_user",
        ]
        read_only_fields = ["id", "created_at", "assigned_to_user"]


class ReadingSimpleSerializer(serializers.ModelSerializer):
    created_by = AccountSerializer()

    class Meta:
        model = Reading
        fields = [
            "id",
            "vending_location",
            "reading_date",
            "updated_at",
            "notes",
            "profit_amount",
            "created_by",
        ]
        read_only_fields = ["reading_date", "updated_at"]


class ReadingWithAttachmentsSerializer(serializers.ModelSerializer):
    attachments = AttachmentSerializer(many=True, required=False, read_only=True)
    created_by = AccountSerializer(read_only=True)

    class Meta:
        model = Reading
        fields = [
            "id",
            "vending_location",
            "reading_date",
            "updated_at",
            "notes",
            "attachments",
            "created_by",
            "profit_amount",
        ]
        read_only_fields = ["reading_date", "updated_at", "created_by"]

    def create(self, validated_data):
        reading_date = validated_data.get("reading_date", timezone.now())
        created_by = self.context["request"].user
        reading = Reading.objects.create(
            reading_date=reading_date, created_by=created_by, **validated_data
        )
        return reading

    def update(self, instance, validated_data):
        validated_data["created_by"] = self.context["request"].user
        return super().update(instance, validated_data)


# Vehicles  

class VehicleSerializer(serializers.ModelSerializer):
    attachments = AttachmentSerializer(many=True, read_only=True)
    class Meta:
        model = Vehicle
        fields = ['id', 'name', 'vin', 'make', 'model', 'year', 'status', 'current_mileage', 'created_at', 'updated_at', 'attachments']

class VehicleUsageSerializer(serializers.ModelSerializer):
    pickup_attachments = serializers.SerializerMethodField()
    return_attachments = serializers.SerializerMethodField()
    user = serializers.StringRelatedField()
    vehicle = serializers.PrimaryKeyRelatedField(queryset=Vehicle.objects.all(), required=False)
    vehicle_details = VehicleSerializer(source='vehicle', read_only=True)
    secondary_vehicles = serializers.PrimaryKeyRelatedField(
        queryset=Vehicle.objects.all(),  # Allow all vehicles for validation
        many=True,
        required=False,
        help_text="Additional vehicles to take along with the primary vehicle"
    )
    secondary_vehicles_details = serializers.SerializerMethodField()
    primary_usage_details = serializers.SerializerMethodField()
    secondary_vehicle_usages = serializers.SerializerMethodField()
    # Write-only field to accept mileages for secondary vehicles when returning the primary vehicle
    secondary_vehicle_mileages = serializers.JSONField(write_only=True, required=False, help_text="Dictionary mapping secondary vehicle IDs to their return mileages")
    pickup_mileage = serializers.IntegerField(required=False)
    owner = serializers.SerializerMethodField()

    class Meta:
        model = VehicleUsage
        fields = [
            'id', 'vehicle', 'vehicle_details', 'secondary_vehicles', 'secondary_vehicles_details', 
            'is_secondary_usage', 'primary_usage', 'primary_usage_details', 'secondary_vehicle_usages',
            'secondary_vehicle_mileages',
            'user', 'pickup_time', 'return_time', 'pickup_mileage',
            'return_mileage', 'pickup_notes', 'return_notes', 'pickup_attachments',
            'return_attachments', 'created_at', 'updated_at', 'owner'
        ]

    def get_owner(self, obj):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            return obj.user == request.user
        return False

    def get_secondary_vehicles_details(self, obj):
        """Return detailed information about secondary vehicles"""
        return VehicleSerializer(obj.secondary_vehicles.all(), many=True).data
    
    def get_primary_usage_details(self, obj):
        """Get primary vehicle details if this is a secondary vehicle usage"""
        if obj.is_secondary_usage and obj.primary_usage:
            return {
                'id': obj.primary_usage.id,
                'vehicle_name': obj.primary_usage.vehicle.name,
                'vehicle_vin': obj.primary_usage.vehicle.vin,
                'user': obj.primary_usage.user.username,
                'pickup_time': obj.primary_usage.pickup_time,
                'return_time': obj.primary_usage.return_time
            }
        return None
    
    def get_secondary_vehicle_usages(self, obj):
        """Get secondary vehicle usage details for primary vehicle usages"""
        if not obj.is_secondary_usage:
            secondary_usages = obj.secondary_vehicle_usages.all()
            return [
                {
                    'id': usage.id,
                    'vehicle': usage.vehicle.id,
                    'vehicle_name': usage.vehicle.name,
                    'vehicle_vin': usage.vehicle.vin,
                    'pickup_time': usage.pickup_time,
                    'return_time': usage.return_time,
                    'pickup_mileage': usage.pickup_mileage,
                    'return_mileage': usage.return_mileage,
                    'is_returned': bool(usage.return_time)
                }
                for usage in secondary_usages
            ]
        return []

    def get_pickup_attachments(self, obj):
        # Filter attachments explicitly for pickup_usage
        attachments = obj.attachments.filter(attachment_type='pickup')
        return AttachmentSerializer(attachments, many=True).data

    def get_return_attachments(self, obj):
        # Filter attachments explicitly for return_usage
        attachments = obj.attachments.filter(attachment_type='return')
        return AttachmentSerializer(attachments, many=True).data

    def validate(self, data):
        # Ensure vehicle is not in_use or in_maintenance during creation
        if self.instance is None:  # Creation
            vehicle = None
            request = self.context.get('request')
            if request:
                vehicle_id = request.query_params.get('vehicle_id') or request.data.get('vehicle')
                if vehicle_id:
                    try:
                        vehicle = Vehicle.objects.get(id=vehicle_id)
                    except Vehicle.DoesNotExist:
                        raise serializers.ValidationError({"vehicle": "Vehicle not found."})
            
            if not vehicle:
                raise serializers.ValidationError({"vehicle": "Vehicle is required."})

            if vehicle.status in ['in_use', 'in_maintenance', 'retired']:
                raise serializers.ValidationError(f"Cannot create usage for a vehicle that is {vehicle.status.replace('_', ' ')}.")
            
            # Validate secondary vehicles with comprehensive error handling
            secondary_vehicles = data.get('secondary_vehicles', [])
            if secondary_vehicles:
                # Normalize secondary vehicle IDs
                secondary_vehicle_ids = []
                if isinstance(secondary_vehicles[0], int):
                    secondary_vehicle_ids = secondary_vehicles
                else:
                    secondary_vehicle_ids = [v.id for v in secondary_vehicles]
                
                # Remove duplicates
                secondary_vehicle_ids = list(set(secondary_vehicle_ids))
                
                # Check if any secondary vehicle is the same as primary vehicle
                if vehicle and vehicle.id in secondary_vehicle_ids:
                    raise serializers.ValidationError({
                        "secondary_vehicles": "Secondary vehicles cannot include the primary vehicle."
                    })
                
                # Fetch all secondary vehicles in one query with detailed error reporting
                try:
                    # First, check if all vehicles exist
                    existing_vehicles = Vehicle.objects.filter(id__in=secondary_vehicle_ids)
                    existing_ids = set(existing_vehicles.values_list('id', flat=True))
                    non_existent_ids = set(secondary_vehicle_ids) - existing_ids
                    
                    if non_existent_ids:
                        raise serializers.ValidationError({
                            "secondary_vehicles": f"Vehicles with IDs {list(non_existent_ids)} do not exist in the database."
                        })
                    
                    # Then check if they are available
                    available_vehicles = existing_vehicles.filter(status='available')
                    available_ids = set(available_vehicles.values_list('id', flat=True))
                    unavailable_ids = existing_ids - available_ids
                    
                    if unavailable_ids:
                        # Get the status of unavailable vehicles for better error message
                        unavailable_vehicles = existing_vehicles.filter(id__in=unavailable_ids)
                        status_details = []
                        for v in unavailable_vehicles:
                            if v.status == 'in_use':
                                # Check if it's being used as a secondary vehicle
                                secondary_usages = VehicleUsage.objects.filter(secondary_vehicles=v)
                                if secondary_usages.exists():
                                    status_details.append(f"ID {v.id} (in_use as secondary vehicle)")
                                else:
                                    status_details.append(f"ID {v.id} (in_use)")
                            else:
                                status_details.append(f"ID {v.id} ({v.status})")
                        
                        raise serializers.ValidationError({
                            "secondary_vehicles": f"Vehicles {', '.join(status_details)} are not available for selection."
                        })
                    
                    # Replace the IDs with actual objects for the create method
                    data['secondary_vehicles'] = list(available_vehicles)
                    
                except serializers.ValidationError:
                    # Re-raise validation errors
                    raise
                except Exception as e:
                    raise serializers.ValidationError({
                        "secondary_vehicles": f"Error validating secondary vehicles: {str(e)}"
                    })
        
        # Validate secondary vehicles for updates (when returning vehicles)
        if self.instance and data.get('secondary_vehicles') is not None:
            secondary_vehicles = data.get('secondary_vehicles', [])
            if secondary_vehicles:
                # Normalize secondary vehicle IDs
                secondary_vehicle_ids = []
                if isinstance(secondary_vehicles[0], int):
                    secondary_vehicle_ids = secondary_vehicles
                else:
                    secondary_vehicle_ids = [v.id for v in secondary_vehicles]
                
                # Remove duplicates
                secondary_vehicle_ids = list(set(secondary_vehicle_ids))
                
                # Check if any secondary vehicle is the same as primary vehicle
                if self.instance.vehicle and self.instance.vehicle.id in secondary_vehicle_ids:
                    raise serializers.ValidationError({
                        "secondary_vehicles": "Secondary vehicles cannot include the primary vehicle."
                    })
                
                # For updates, just validate that vehicles exist (they might already be in use)
                try:
                    existing_vehicles = Vehicle.objects.filter(id__in=secondary_vehicle_ids)
                    existing_ids = set(existing_vehicles.values_list('id', flat=True))
                    non_existent_ids = set(secondary_vehicle_ids) - existing_ids
                    
                    if non_existent_ids:
                        raise serializers.ValidationError({
                            "secondary_vehicles": f"Vehicles with IDs {list(non_existent_ids)} do not exist in the database."
                        })
                    
                except Exception as e:
                    raise serializers.ValidationError({
                        "secondary_vehicles": f"Error validating secondary vehicles: {str(e)}"
                    })
        
        # Ensure return_mileage is greater than or equal to pickup_mileage during update
        if self.instance and data.get('return_mileage') is not None:
            pickup_mileage = data.get('pickup_mileage', self.instance.pickup_mileage)
            if data.get('return_mileage') < pickup_mileage:
                raise serializers.ValidationError("Return mileage cannot be less than pickup mileage.")
        
        # Validate pickup attachments for creation
        if self.instance is None:
            request = self.context.get('request')
            if request:
                pickup_attachments = request.FILES.getlist('pickup_attachments', [])
                if not pickup_attachments:
                    raise serializers.ValidationError("At least one pickup attachment is required.")
        
        # Validate return attachments for update with return_time
        # if self.instance and data.get('return_time'):
        #     request = self.context.get('request')
        #     if request:
        #         return_attachments = request.FILES.getlist('return_attachments', [])
        #         if not return_attachments:
        #             raise serializers.ValidationError("At least one return attachment is required when returning the vehicle.")
        
        return data

    def create(self, validated_data):
        # Extract secondary_vehicles before creating the instance
        secondary_vehicles = validated_data.pop('secondary_vehicles', [])
        
        # The pickup_mileage should already be set in the viewset
        if 'pickup_mileage' not in validated_data:
            validated_data['pickup_mileage'] = validated_data['vehicle'].current_mileage
        
        # User should already be set in the viewset
        if 'user' not in validated_data:
            validated_data['user'] = self.context['request'].user
        
        # Create the primary vehicle usage
        vehicle_usage = VehicleUsage.objects.create(**validated_data)
        
        # Add secondary vehicles to the primary usage
        if secondary_vehicles:
            vehicle_usage.secondary_vehicles.set(secondary_vehicles)
            
            # Create individual usage records for each secondary vehicle
            for secondary_vehicle in secondary_vehicles:
                # Create a separate usage record for the secondary vehicle
                secondary_usage = VehicleUsage.objects.create(
                    vehicle=secondary_vehicle,
                    user=vehicle_usage.user,
                    pickup_time=vehicle_usage.pickup_time,
                    pickup_mileage=secondary_vehicle.current_mileage,
                    pickup_notes=f"Secondary vehicle for {vehicle_usage.vehicle.name} usage",
                    is_secondary_usage=True,
                    primary_usage=vehicle_usage
                )
                
                # Update secondary vehicle status to in_use
                secondary_vehicle.status = "in_use"
                secondary_vehicle.save()
        
        # Handle pickup attachments
        request = self.context.get('request')
        if request:
            pickup_files = request.FILES.getlist('pickup_attachments', [])
            for file in pickup_files:
                vehicle_usage.attachments.create(file=file, attachment_type='pickup')
        
        return vehicle_usage

    def update(self, instance, validated_data):
        # Handle secondary vehicles update with proper validation
        if 'secondary_vehicles' in validated_data:
            secondary_vehicles = validated_data.pop('secondary_vehicles')
            
            # Validate secondary vehicles for updates
            if secondary_vehicles:
                # Normalize secondary vehicle IDs
                secondary_vehicle_ids = []
                if isinstance(secondary_vehicles[0], int):
                    secondary_vehicle_ids = secondary_vehicles
                else:
                    secondary_vehicle_ids = [v.id for v in secondary_vehicles]
                
                # Remove duplicates
                secondary_vehicle_ids = list(set(secondary_vehicle_ids))
                
                # Check if any secondary vehicle is the same as primary vehicle
                if instance.vehicle and instance.vehicle.id in secondary_vehicle_ids:
                    raise serializers.ValidationError({
                        "secondary_vehicles": "Secondary vehicles cannot include the primary vehicle."
                    })
                
                # Validate that all secondary vehicles exist and are available
                try:
                    # First, check if all vehicles exist
                    existing_vehicles = Vehicle.objects.filter(id__in=secondary_vehicle_ids)
                    existing_ids = set(existing_vehicles.values_list('id', flat=True))
                    non_existent_ids = set(secondary_vehicle_ids) - existing_ids
                    
                    if non_existent_ids:
                        raise serializers.ValidationError({
                            "secondary_vehicles": f"Vehicles with IDs {list(non_existent_ids)} do not exist in the database."
                        })
                    
                    # For updates, we don't need to check if they're available since they might already be in use
                    # Just make sure they exist
                    validated_secondary_vehicles = list(existing_vehicles)
                    
                    # Set the validated secondary vehicles
                    instance.secondary_vehicles.set(validated_secondary_vehicles)
                    
                except serializers.ValidationError:
                    # Re-raise validation errors
                    raise
                except Exception as e:
                    raise serializers.ValidationError({
                        "secondary_vehicles": f"Error validating secondary vehicles: {str(e)}"
                    })
            else:
                # Clear secondary vehicles if empty list is provided
                instance.secondary_vehicles.clear()
        
        # Handle secondary vehicle return mileages when returning primary vehicle
        secondary_vehicle_mileages = validated_data.pop('secondary_vehicle_mileages', {})
        
        # Parse JSON string if it's a string (from FormData)
        if isinstance(secondary_vehicle_mileages, str):
            try:
                import json
                secondary_vehicle_mileages = json.loads(secondary_vehicle_mileages)
                print(f"DEBUG: Parsed secondary_vehicle_mileages: {secondary_vehicle_mileages}")
            except (json.JSONDecodeError, TypeError):
                secondary_vehicle_mileages = {}
                print(f"DEBUG: Failed to parse secondary_vehicle_mileages")
        else:
            print(f"DEBUG: secondary_vehicle_mileages type: {type(secondary_vehicle_mileages)}, value: {secondary_vehicle_mileages}")
        
        # Update the instance
        instance = super().update(instance, validated_data)
        
        # Handle return attachments if provided
        if validated_data.get('return_time'):
            request = self.context.get('request')
            if request:
                return_files = request.FILES.getlist('return_attachments', [])
                for file in return_files:
                    instance.attachments.create(file=file, attachment_type='return')
        
        # Handle secondary vehicle returns when primary vehicle is returned
        if validated_data.get('return_time') and not instance.is_secondary_usage:
            # Debug: Check what secondary vehicles are associated
            print(f"DEBUG: Primary usage ID: {instance.id}")
            print(f"DEBUG: Secondary vehicles (ManyToMany): {list(instance.secondary_vehicles.values_list('id', 'name'))}")
            
            # Get all non-returned secondary vehicle usages
            non_returned_secondary_usages = instance.secondary_vehicle_usages.filter(return_time__isnull=True)
            print(f"DEBUG: Found {non_returned_secondary_usages.count()} non-returned secondary usages")
            print(f"DEBUG: All secondary vehicle usages: {list(instance.secondary_vehicle_usages.values_list('vehicle__id', 'vehicle__name', 'return_time'))}")
            
            # If no secondary vehicle usages found, try to find them by vehicle IDs
            if non_returned_secondary_usages.count() == 0:
                secondary_vehicle_ids = list(instance.secondary_vehicles.values_list('id', flat=True))
                print(f"DEBUG: No secondary usages found, looking for vehicles: {secondary_vehicle_ids}")
                
                # Look for secondary vehicle usages that might not be properly linked
                non_returned_secondary_usages = VehicleUsage.objects.filter(
                    vehicle_id__in=secondary_vehicle_ids,
                    is_secondary_usage=True,
                    return_time__isnull=True
                )
                print(f"DEBUG: Found {non_returned_secondary_usages.count()} secondary usages by vehicle IDs")
                
                # If still no usages found, create them now (fallback)
                if non_returned_secondary_usages.count() == 0:
                    print(f"DEBUG: Creating missing secondary vehicle usages")
                    for vehicle_id in secondary_vehicle_ids:
                        try:
                            vehicle = Vehicle.objects.get(id=vehicle_id)
                            secondary_usage = VehicleUsage.objects.create(
                                vehicle=vehicle,
                                user=instance.user,
                                pickup_time=instance.pickup_time,
                                pickup_mileage=vehicle.current_mileage,
                                pickup_notes=f"Secondary vehicle for {instance.vehicle.name} usage (created during return)",
                                is_secondary_usage=True,
                                primary_usage=instance
                            )
                            print(f"DEBUG: Created secondary usage for vehicle {vehicle_id}")
                        except Vehicle.DoesNotExist:
                            print(f"DEBUG: Vehicle {vehicle_id} does not exist")
                    
                    # Refresh the queryset
                    non_returned_secondary_usages = instance.secondary_vehicle_usages.filter(return_time__isnull=True)
                    print(f"DEBUG: After creation, found {non_returned_secondary_usages.count()} secondary usages")
            
            for secondary_usage in non_returned_secondary_usages:
                secondary_vehicle_id = secondary_usage.vehicle.id
                print(f"DEBUG: Checking secondary vehicle ID: {secondary_vehicle_id}")
                print(f"DEBUG: Available keys in secondary_vehicle_mileages: {list(secondary_vehicle_mileages.keys())}")
                
                # Check if mileage was provided for this secondary vehicle
                if str(secondary_vehicle_id) in secondary_vehicle_mileages:
                    return_mileage = secondary_vehicle_mileages[str(secondary_vehicle_id)]
                    
                    # Convert to integer if it's a string
                    if isinstance(return_mileage, str):
                        try:
                            return_mileage = int(return_mileage)
                        except (ValueError, TypeError):
                            raise serializers.ValidationError({
                                f"secondary_vehicle_mileages.{secondary_vehicle_id}": 
                                f"Invalid mileage value for {secondary_usage.vehicle.name}"
                            })
                    
                    # Validate mileage
                    if return_mileage < secondary_usage.pickup_mileage:
                        raise serializers.ValidationError({
                            f"secondary_vehicle_mileages.{secondary_vehicle_id}": 
                            f"Return mileage for {secondary_usage.vehicle.name} cannot be less than pickup mileage ({secondary_usage.pickup_mileage})"
                        })
                    
                    # Update secondary vehicle usage
                    secondary_usage.return_time = validated_data['return_time']
                    secondary_usage.return_mileage = return_mileage
                    secondary_usage.return_notes = f"Auto-returned with primary vehicle {instance.vehicle.name}"
                    secondary_usage.save()
                    
                    # Update secondary vehicle status and mileage
                    secondary_usage.vehicle.current_mileage = return_mileage
                    secondary_usage.vehicle.status = "available"
                    secondary_usage.vehicle.save()
                else:
                    # If no mileage provided for a non-returned secondary vehicle, raise error
                    raise serializers.ValidationError({
                        "secondary_vehicle_mileages": f"Mileage is required for secondary vehicle {secondary_usage.vehicle.name} (ID: {secondary_vehicle_id})"
                    })
        
        return instance





class ShiftSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField()
    class Meta:
        model = Shift
        fields = ['id', 'user', 'start_time', 'end_time', 'duration']
        read_only_fields = ['id', 'user', 'duration']


class ShiftUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shift
        fields = ['id', 'start_time', 'end_time', 'duration']
        read_only_fields = ['id', 'duration']
    
    def validate(self, data):
        """Validate that end_time is after start_time if both are provided"""
        start_time = data.get('start_time')
        end_time = data.get('end_time')
        
        if start_time and end_time and end_time <= start_time:
            raise serializers.ValidationError({
                "end_time": "End time must be after start time."
            })
        
        return data


class TutorialSerializer(serializers.ModelSerializer):
    created_by_details = AccountSerializer(source='created_by', read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
    attachments = serializers.SerializerMethodField()
    owner = serializers.SerializerMethodField()

    class Meta:
        model = Tutorial
        fields = [
            'id',
            'title',
            'description',
            'content',
            'attachments',
            'created_by',
            'created_by_details',
            'created_at',
            'updated_at',
            'owner'
        ]
        read_only_fields = ['created_by']

    def create(self, validated_data):
        # Set the created_by user from the request context
        if 'created_by' not in validated_data:
            validated_data['created_by'] = self.context['request'].user
        
        # Create the tutorial instance
        tutorial = Tutorial.objects.create(**validated_data)
        
        # Handle attachments if any
        request = self.context.get('request')
        if request:
            # Check for files with key 'files' (as sent from frontend)
            attachment_files = request.FILES.getlist('files', [])
            if not attachment_files:
                # Fallback to 'attachments' key
                attachment_files = request.FILES.getlist('attachments', [])
            
            # Get the content type for Tutorial
            from django.contrib.contenttypes.models import ContentType
            tutorial_ct = ContentType.objects.get_for_model(Tutorial)
            
            # Create attachment objects properly
            for file in attachment_files:
                Attachment.objects.create(
                    file=file,
                    content_type=tutorial_ct,
                    object_id=tutorial.id
                )
        
        return tutorial
    
    def get_attachments(self, obj):
        attachments = getattr(obj, "_prefetched_attachments", None)
        if attachments is None:
            tutorial_ct = ContentType.objects.get_for_model(Tutorial)
            attachments = Attachment.objects.filter(content_type=tutorial_ct, object_id=obj.id)
        return AttachmentSerializer(attachments, many=True).data

    def get_owner(self, obj):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            return obj.created_by_id == request.user.id
        return False

class GroupSerializer(serializers.ModelSerializer):
    users = AccountSerializer(many=True, read_only=True)
    user_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False
    )

    class Meta:
        model = Group
        fields = ['id', 'name', 'description', 'users', 'user_ids', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']

    def create(self, validated_data):
        user_ids = validated_data.pop('user_ids', [])
        group = Group.objects.create(**validated_data)
        if user_ids:
            users = Account.objects.filter(id__in=user_ids)
            group.users.set(users)
        return group

    def update(self, instance, validated_data):
        user_ids = validated_data.pop('user_ids', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        if user_ids is not None:
            users = Account.objects.filter(id__in=user_ids)
            instance.users.set(users)
        return instance

class VehicleMaintenanceSerializer(serializers.ModelSerializer):
    maintenance_type_display = serializers.CharField(source='get_maintenance_type_display', read_only=True)
    vehicle_details = VehicleSerializer(source='vehicle', read_only=True)
    attachments = AttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = VehicleMaintenance
        fields = [
            'id', 'vehicle', 'vehicle_details', 'maintenance_type', 'maintenance_type_display',
            'description', 'cost', 'service_provider', 'start_date', 'end_date',
            'mileage_at_maintenance', 'next_maintenance_date', 'next_maintenance_mileage',
            'created_at', 'updated_at', 'attachments'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def validate(self, data):
        # Ensure end_date is after start_date if provided
        if 'end_date' in data and data['end_date'] and data['start_date'] > data['end_date']:
            raise serializers.ValidationError({
                "end_date": "End date must be after start date."
            })
        
        # Validate next_maintenance_date is in the future if provided
        if 'next_maintenance_date' in data and data['next_maintenance_date']:
            if data['next_maintenance_date'] < timezone.now().date():
                raise serializers.ValidationError({
                    "next_maintenance_date": "Next maintenance date must be in the future."
                })

        return data

class CashDrawerSerializer(serializers.ModelSerializer):
    user = AccountSerializer(read_only=True)
    entries = serializers.SerializerMethodField()
    
    class Meta:
        model = CashDrawer
        fields = [
            'id', 'user', 'status', 'opening_amount', 'current_amount',
            'opened_at', 'closed_at', 'notes', 'entries'
        ]
        read_only_fields = ['id', 'user', 'opened_at', 'closed_at', 'entries']
    
    def validate_opening_amount(self, value):
        """Validate that opening amount is not negative"""
        if value < 0:
            raise serializers.ValidationError("Opening amount cannot be negative.")
        return value
    
    def get_entries(self, obj):
        entries = obj.entries.all()[:10]  # Get last 10 entries
        return CashEntrySerializer(entries, many=True).data


class CashEntrySerializer(serializers.ModelSerializer):
    created_by = AccountSerializer(read_only=True)
    store = serializers.SerializerMethodField()
    store_name = serializers.CharField(source="store.store_name", read_only=True)
    customer_name = serializers.CharField(source="store.customer.username", read_only=True)
    invoice_number = serializers.CharField(source="invoice.invoice_number", read_only=True)
    invoice_total = serializers.DecimalField(source="invoice.total_amount", max_digits=21, decimal_places=2, read_only=True)
    attachments = serializers.SerializerMethodField()
    
    class Meta:
        model = CashEntry
        fields = '__all__'
    
    def get_store(self, obj):
        if obj.store:
            return {
                'id': obj.store.id,
                'store_name': obj.store.store_name,
                'customer_name': obj.store.customer.username if obj.store.customer else None
            }
        return None
    
    def get_attachments(self, obj):
        attachments = getattr(obj, "_prefetched_attachments", None)
        if attachments is None:
            cash_entry_ct = ContentType.objects.get_for_model(CashEntry)
            attachments = Attachment.objects.filter(content_type=cash_entry_ct, object_id=obj.id)
        return AttachmentSerializer(attachments, many=True).data


class VaultSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vault
        fields = '__all__'


class VaultEntrySerializer(serializers.ModelSerializer):
    created_by = AccountSerializer(read_only=True)
    
    class Meta:
        model = VaultEntry
        fields = '__all__'

class InvoiceChargeTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceChargeType
        fields = [
            "id",
            "name",
            "charge_type",
            "value",
            "is_compulsory",
            "is_active",
            "description",
            "created_at",
            "updated_at",
        ]


class InvoiceChargeSerializer(serializers.ModelSerializer):
    charge_type_name = serializers.CharField(source="charge_type.name", read_only=True)
    charge_type_type = serializers.CharField(source="charge_type.charge_type", read_only=True)
    
    class Meta:
        model = InvoiceCharge
        fields = [
            "id",
            "invoice",
            "charge_type",
            "charge_type_name",
            "charge_type_type",
            "amount",
            "created_at",
        ]


class InvoiceItemSerializer(serializers.ModelSerializer):
    inventory_name = serializers.CharField(source="inventory_item.inventory.name", read_only=True)
    inventory_upc = serializers.CharField(source="inventory_item.inventory.upc", read_only=True)
    inventory_description = serializers.CharField(source="inventory_item.inventory.description", read_only=True)
    item_attributes = serializers.JSONField(source="inventory_item.attributes", read_only=True)
    
    class Meta:
        model = InvoiceItem
        fields = [
            "id",
            "invoice",
            "inventory_item",
            "inventory_name",
            "inventory_upc",
            "inventory_description",
            "item_attributes",
            "quantity",
            "unit_price",
            "total_price",
            "description",
            "created_at",
        ]


class InvoiceSerializer(serializers.ModelSerializer):
    store_name = serializers.CharField(source="store.store_name", read_only=True)
    customer_name = serializers.CharField(source="store.customer.username", read_only=True)
    customer_email = serializers.CharField(source="store.customer.email", read_only=True)
    created_by_name = serializers.CharField(source="created_by.username", read_only=True)
    transfer_reference = serializers.CharField(source="transfer.reference_number", read_only=True)
    items = InvoiceItemSerializer(many=True, read_only=True)
    charges = InvoiceChargeSerializer(many=True, read_only=True)
    items_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Invoice
        fields = [
            "id",
            "invoice_number",
            "store",
            "store_name",
            "customer_name",
            "customer_email",
            "transfer",
            "transfer_reference",
            "status",
            "issue_date",
            "due_date",
            "subtotal",
            "total_charges",
            "total_amount",
            "notes",
            "created_by",
            "created_by_name",
            "created_at",
            "updated_at",
            "items",
            "charges",
            "items_count",
        ]
        read_only_fields = [
            "invoice_number",
            "subtotal",
            "total_charges",
            "total_amount",
            "created_at",
            "updated_at",
        ]
    
    def get_items_count(self, obj):
        return obj.items.count()


class InvoiceCreateSerializer(serializers.ModelSerializer):
    items_data = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        required=False,
        default=[],
        help_text="List of items to add to the invoice"
    )

    charges_data = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        required=False,
        default=[],
        help_text="List of additional charges to apply"
    )
    
    class Meta:
        model = Invoice
        fields = [
            "id",
            "invoice_number",
            "store",
            "transfer",
            "status",
            "issue_date",
            "due_date",
            "notes",
            "created_by",
            "items_data",
            "charges_data",
            "subtotal",
            "total_charges",
            "total_amount",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "invoice_number",
            "subtotal",
            "total_charges",
            "total_amount",
            "created_at",
            "updated_at",
            "created_by",
        ]
    
    def create(self, validated_data):
        logger = logging.getLogger(__name__)
        logger.info(f"InvoiceCreateSerializer.create called with validated_data: {validated_data}")
        items_data = validated_data.pop('items_data', [])
        charges_data = validated_data.pop('charges_data', [])
        try:
            invoice = Invoice.objects.create(**validated_data)
            logger.info(f"Invoice created with id={invoice.id}, transfer={getattr(invoice, 'transfer', None)}")
        except Exception as e:
            logger.error(f"Error creating Invoice: {e}")
            raise
        # Add items to the invoice
        for item_data in items_data:
            inventory_item_id = item_data.get('inventory_item_id')
            quantity = item_data.get('quantity', 1)
            unit_price = item_data.get('unit_price')
            description = item_data.get('description', '')
            try:
                inventory_item = InventoryItem.objects.get(id=inventory_item_id)
                if not unit_price:
                    unit_price = Decimal(inventory_item.inventory.unit_price)
                
                InvoiceItem.objects.create(
                    invoice=invoice,
                    inventory_item=inventory_item,
                    quantity=quantity,
                    unit_price=unit_price,
                    description=description
                )
                logger.info(f"InvoiceItem created for invoice_id={invoice.id}, inventory_item_id={inventory_item_id}")
            except InventoryItem.DoesNotExist:
                logger.error(f"Inventory item {inventory_item_id} does not exist")
                raise serializers.ValidationError(f"Inventory item {inventory_item_id} does not exist")
            except Exception as e:
                logger.error(f"Error creating InvoiceItem: {e}")
                raise
        # Add charges to the invoice
        for charge_data in charges_data:
            charge_type_id = charge_data.get('charge_type_id')
            amount = charge_data.get('amount')
            try:
                charge_type = InvoiceChargeType.objects.get(id=charge_type_id)
                if not amount:
                    amount = charge_type.value
                    if charge_type.charge_type == "PERCENTAGE":
                        amount = (invoice.subtotal * charge_type.value) / 100
                InvoiceCharge.objects.create(
                    invoice=invoice,
                    charge_type=charge_type,
                    amount=amount
                )
            except InvoiceChargeType.DoesNotExist:
                logger.error(f"Charge type {charge_type_id} does not exist")
                raise serializers.ValidationError(f"Charge type {charge_type_id} does not exist")
            except Exception as e:
                logger.error(f"Error creating InvoiceCharge: {e}")
                raise
        try:
            # Calculate the base amount for compulsory charges (subtotal + existing charges)
            invoice.calculate_totals()
            base_amount_for_compulsory = invoice.subtotal + invoice.total_charges
            invoice.apply_compulsory_charges(base_amount=base_amount_for_compulsory)
            logger.info(f"Compulsory charges applied for invoice_id={invoice.id}")
        except Exception as e:
            logger.error(f"Error applying compulsory charges: {e}")
            raise
        return invoice

# ----------------------------- Platform Config -----------------------------
class PlatformConfigSerializer(serializers.ModelSerializer):
    tracking_emails = serializers.ListField(child=serializers.EmailField(), required=False)
    maintenance_emails = serializers.ListField(child=serializers.EmailField(), required=False)
    email_host = serializers.CharField(required=False)
    email_port = serializers.IntegerField(required=False)
    email_host_user = serializers.CharField(required=False)
    email_host_password = serializers.CharField(required=False)
    default_from_email = serializers.EmailField(required=False)

    class Meta:
        model = PlatformConfig
        fields = [
            'id',
            'tracking_emails',
            'maintenance_emails',
            'email_host',
            'email_port',
            'email_host_user',
            'email_host_password',
            'default_from_email',
            'updated_at',
        ]
        read_only_fields = ['id', 'updated_at']

    def validate(self, attrs):
        # Deduplicate and normalize
        for key in ['tracking_emails', 'maintenance_emails']:
            if key in attrs and attrs[key] is not None:
                normalized = sorted({e.strip().lower() for e in attrs[key] if e and e.strip()})
                attrs[key] = normalized
        return attrs


class PreferredSoftwareOptionsSerializer(serializers.ModelSerializer):
    options = serializers.ListField(child=serializers.CharField(), required=False)

    class Meta:
        model = PreferredSoftwareOptions
        fields = [
            'id',
            'options',
            'updated_at',
        ]
        read_only_fields = ['id', 'updated_at']

class InvoiceUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invoice
        fields = [
            "id",
            "status",
            "due_date",
            "notes",
            "subtotal",
            "total_charges",
            "total_amount",
            "updated_at",
        ]
        read_only_fields = [
            "subtotal",
            "total_charges",
            "total_amount",
            "updated_at",
        ]
    
    def update(self, instance, validated_data):
        # Check if status is being changed to PENDING
        new_status = validated_data.get('status', instance.status)
        status_changed_to_pending = (
            instance.status != 'PENDING' and 
            new_status == 'PENDING'
        )
        
        # Update the instance
        updated_instance = super().update(instance, validated_data)
        
        # Send email notification if status changed to PENDING
        if status_changed_to_pending:
            try:
                from commonapp.tasks import send_invoice_email
                send_invoice_email.delay(updated_instance.id)
                logger = logging.getLogger(__name__)
                logger.info(f"Invoice email task queued for invoice_id={updated_instance.id} (status changed to PENDING)")
            except Exception as e:
                logger = logging.getLogger(__name__)
                logger.error(f"Error queuing invoice email for invoice_id={updated_instance.id}: {e}")
                # Don't raise the exception - email failure shouldn't prevent status update
        
        return updated_instance

class LocationPermissionSerializer(serializers.ModelSerializer):
    assigned_by_user = AccountSerializer(source="assigned_by", read_only=True)
    location_details = VendingCustomerLocationSerializer(source="location", read_only=True)
    user_details = AccountSerializer(source="user", read_only=True)

    class Meta:
        model = LocationPermission
        fields = [
            "id",
            "user",
            "user_details",
            "location",
            "location_details",
            "assigned_by",
            "assigned_by_user",
            "assigned_at",
        ]
        read_only_fields = ["id", "assigned_at", "assigned_by", "assigned_by_user", "user_details", "location_details"]

class PartnerCustomerLinkSerializer(serializers.ModelSerializer):
    partner_details = AccountSerializer(source='partner', read_only=True)
    vending_customer_details = AccountSerializer(source='vending_customer', read_only=True)
    created_by_details = AccountSerializer(source='created_by', read_only=True)
    store_details = StoreProfileSerializer(source='store', read_only=True)

    class Meta:
        model = PartnerCustomerLink
        fields = [
            'id',
            'partner',
            'partner_details',
            'vending_customer',
            'vending_customer_details',
            'store',
            'store_details',
            'created_at',
            'created_by',
            'created_by_details',
            'is_active'
        ]
        read_only_fields = ['id', 'created_at', 'created_by', 'created_by_details']


# ---------------------------------------------------------------------------
# Lightweight serializer for list views – avoids serializing all item details
# ---------------------------------------------------------------------------


class InventorySimpleListSerializer(InventorySimpleSerializer):
    """A trimmed-down version of InventorySimpleSerializer used when the
    frontend only needs basic fields for table listings. It excludes the heavy
    `items` and `locations` relations to speed up serialization."""

    class Meta(InventorySimpleSerializer.Meta):
        # Re-use all original fields except the heavy ones
        fields = [
            f
            for f in InventorySimpleSerializer.Meta.fields
            if f not in ("items", "locations")
        ]

class PriceMatrixSerializer(serializers.ModelSerializer):
    class Meta:
        model = PriceMatrix
        fields = [
            "id",
            "name",
            "min_amount",
            "max_amount",
            "tax_percentage",
            "is_active",
            "description",
            "created_at",
            "updated_at",
        ]
    
    def validate(self, data):
        min_amount = data.get('min_amount')
        max_amount = data.get('max_amount')
        
        if min_amount and max_amount and min_amount >= max_amount:
            raise serializers.ValidationError("Minimum amount must be less than maximum amount")
        
        return data


class PriceMatrixCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PriceMatrix
        fields = [
            "name",
            "min_amount",
            "max_amount",
            "tax_percentage",
            "is_active",
            "description",
        ]
    
    def validate(self, data):
        min_amount = data.get('min_amount')
        max_amount = data.get('max_amount')
        
        if min_amount and max_amount and min_amount >= max_amount:
            raise serializers.ValidationError("Minimum amount must be less than maximum amount")
        
        return data