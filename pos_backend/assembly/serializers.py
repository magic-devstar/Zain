from rest_framework import serializers
from django.contrib.contenttypes.models import ContentType
from django.db import transaction
from django.utils import timezone
from django.contrib.auth import get_user_model
from .models import AssemblyTicket, AssemblyNotes
from commonapp.models import InventoryItem, Inventory, Notification, Attachment, InventoryCategory, Repair
from commonapp.serializers import InventoryItemSerializer, AccountSerializer, AttachmentSerializer

User = get_user_model()


class AssemblyNotesSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssemblyNotes
        fields = ["assembly_ticket", "description", "status", "created_by"]
        read_only_fields = ["created_by"]

    def create(self, validated_data):
        validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)


class AssemblyTicketListSerializer(serializers.ModelSerializer):
    assigned_to_users = AccountSerializer(source="assigned_to", many=True, read_only=True)
    assigned_by = serializers.StringRelatedField(read_only=True)
    created_by = serializers.StringRelatedField(read_only=True)
    items_count = serializers.SerializerMethodField()
    used_items_count = serializers.SerializerMethodField()
    defective_items_count = serializers.SerializerMethodField()

    class Meta:
        model = AssemblyTicket
        fields = [
            "id", "title", "description", "deadline", "assigned_to_users", "assigned_by",
            "created_by", "status", "created_at", "assigned_at", "completed_at", "flagged",
            "items_count", "used_items_count", "defective_items_count", "assembled_item_name"
        ]

    def get_items_count(self, obj):
        return obj.items.count()

    def get_used_items_count(self, obj):
        if obj.item_usages:
            return sum(1 for used in obj.item_usages.values() if used)
        return 0

    def get_defective_items_count(self, obj):
        if obj.defective_items:
            return sum(1 for defective in obj.defective_items.values() if defective)
        return 0


class AssemblyTicketSerializer(serializers.ModelSerializer):
    assigned_to = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), many=True, write_only=True, required=False)
    assigned_to_users = AccountSerializer(source="assigned_to", many=True, read_only=True)
    assigned_by = serializers.StringRelatedField(read_only=True)
    created_by = serializers.StringRelatedField(read_only=True)
    items = InventoryItemSerializer(many=True, read_only=True, default=[])
    ticket_items = serializers.JSONField(write_only=True, required=False, allow_null=True, help_text='List of item IDs, e.g., [1, 2, 3]')
    item_usages = serializers.JSONField(required=False, allow_null=True, help_text='Dictionary of used item IDs, e.g., {"1": true, "2": true}')
    defective_items = serializers.JSONField(required=False, allow_null=True, help_text='Dictionary of defective item IDs, e.g., {"1": true, "2": true}')
    assembled_items = serializers.JSONField(required=True)
    attachments = serializers.SerializerMethodField()
    assembly_notes = serializers.CharField(required=False, allow_blank=True)
    technician_notes = serializers.SerializerMethodField()
    manager_notes = serializers.SerializerMethodField()

    class Meta:
        model = AssemblyTicket
        fields = [
            "id", "title", "description", "deadline", "assigned_to", "assigned_by",
            "items", "ticket_items", "item_usages", "defective_items", "created_at", "assigned_at",
            "completed_at", "assigned_to_users", "attachments", "status", "created_by",
            "assembly_notes", "technician_notes", "manager_notes",
            "assembled_items",
            # Deprecated single assembled item fields (write_only)
            "assembled_item_name", "assembled_item_upc", "assembled_item_category", "assembled_item_unit_price",
            "assembled_item_serial_number_required", "assembled_item_attributes",
        ]

    def get_attachments(self, obj):
        attachments = getattr(obj, "_prefetched_attachments", None)
        if attachments is None:
            attachments = Attachment.objects.filter(content_type=ContentType.objects.get_for_model(AssemblyTicket), object_id=obj.id)
        return AttachmentSerializer(attachments, many=True).data

    def get_technician_notes(self, obj):
        technician_note = AssemblyNotes.objects.filter(assembly_ticket=obj, status="Technician").first()
        return technician_note.description if technician_note else None

    def get_manager_notes(self, obj):
        manager_note = AssemblyNotes.objects.filter(assembly_ticket=obj, status="Manager").first()
        return manager_note.description if manager_note else None

    def validate_ticket_items(self, ticket_items_list):
        if not isinstance(ticket_items_list, list):
            raise serializers.ValidationError({"ticket_items": "Must be a list of item IDs."})
        current_ticket_id = self.instance.id if self.instance else None

        for item_id in ticket_items_list:
            try:
                item_id = int(item_id)
            except (ValueError, TypeError):
                raise serializers.ValidationError({"ticket_items": f"Invalid item_id: {item_id}."})

            try:
                item = InventoryItem.objects.get(id=item_id)

                # Check if item is already assigned to another assembly ticket
                if current_ticket_id:
                    other_tickets = item.assembly_tickets.exclude(id=current_ticket_id)
                else:
                    other_tickets = item.assembly_tickets

                if other_tickets.exists():
                    raise serializers.ValidationError({"ticket_items": f"Item {item_id} is already assigned to another assembly ticket."})

                # For new tickets, items must be available
                # For existing tickets, allow items that are in_use (already in this ticket)
                if not current_ticket_id and item.status != "available":
                    raise serializers.ValidationError({"ticket_items": f"Item {item_id} is not available."})

            except InventoryItem.DoesNotExist:
                raise serializers.ValidationError({"ticket_items": f"No item with ID {item_id}."})

        return ticket_items_list

    def validate_item_usages(self, item_usages_dict):
        if not isinstance(item_usages_dict, dict):
            raise serializers.ValidationError({"item_usages": "Must be a dictionary with item IDs as keys and boolean values."})
        for item_id, is_used in item_usages_dict.items():
            try:
                item_id = str(item_id)
                if not isinstance(is_used, bool):
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

    def validate_assembled_items(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError('assembled_items must be a list of dicts.')
        for idx, item in enumerate(value):
            required_keys = ['name', 'upc', 'category', 'unit_price', 'serial_number_required', 'quantity']
            for key in required_keys:
                if key not in item:
                    raise serializers.ValidationError(f'assembled_items[{idx}] missing required key: {key}')
            if item['serial_number_required']:
                attributes_list = item.get('attributes_list', [])
                if not isinstance(attributes_list, list) or len(attributes_list) != item['quantity']:
                    raise serializers.ValidationError(f'assembled_items[{idx}]: Number of attribute dicts must match quantity when serial_number_required is true.')
        return value

    def validate_assembled_item_attributes(self, attributes):
        if attributes is None:
            return attributes

        if not isinstance(attributes, dict):
            raise serializers.ValidationError("Assembled item attributes must be a dictionary.")

        required_fields = ['serial_number', 'mac_address', 'ip_address', 'service_tag', 'service_number']
        for field in required_fields:
            if field not in attributes or not attributes[field]:
                raise serializers.ValidationError(f"Assembled item {field.replace('_', ' ')} is required.")

        return attributes

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
        assembled_items_input = validated_data.pop("assembled_items", [])
        assembly_notes_description = validated_data.pop("assembly_notes", None)

        ticket_items_list = self.validate_ticket_items(ticket_items_input)
        item_usages_dict = self.validate_item_usages(item_usages_input)
        defective_items_dict = self.validate_defective_items(defective_items_input)
        assembled_items_list = self.validate_assembled_items(assembled_items_input)

        with transaction.atomic():
            assembly_ticket = AssemblyTicket.objects.create(
                **validated_data,
                created_by=user,
                assigned_by=user if assigned_to_users else None,
                assigned_at=timezone.now() if assigned_to_users else None,
                item_usages=item_usages_dict,
                defective_items=defective_items_dict,
                assembled_items=assembled_items_list,
                assembly_notes=assembly_notes_description
            )
            if assigned_to_users:
                assembly_ticket.assigned_to.set(assigned_to_users)
                for technician in assigned_to_users:
                    Notification.objects.create(
                        title="New Assembly Ticket Assigned",
                        message=f"A new assembly ticket ID #{assembly_ticket.id}, titled '{assembly_ticket.title}', has been assigned to you by {user.username}.",
                        notification_type="INFO",
                        recipient=technician,
                        link=f"/assembly-tickets/{assembly_ticket.id}"
                    )
            used_items = []
            for item_id in ticket_items_list:
                item = self.deduct_stock(item_id)
                used_items.append(item)
            assembly_ticket.items.set(used_items)

            # Repairs for defective items will be generated automatically when the ticket is CLOSED
            return assembly_ticket

    def update(self, instance, validated_data):
        request = self.context["request"]
        user = request.user
        assigned_to_users = validated_data.pop("assigned_to", None)
        ticket_items_input = validated_data.pop("ticket_items", None)
        item_usages_input = validated_data.pop("item_usages", None)
        defective_items_input = validated_data.pop("defective_items", None)
        assembled_items_input = validated_data.pop("assembled_items", None)
        assembly_notes_description = validated_data.pop("assembly_notes", None)

        if ticket_items_input is not None:
            ticket_items_list = self.validate_ticket_items(ticket_items_input)
        if item_usages_input is not None:
            item_usages_dict = self.validate_item_usages(item_usages_input)
        if defective_items_input is not None:
            defective_items_dict = self.validate_defective_items(defective_items_input)
        if assembled_items_input is not None:
            assembled_items_list = self.validate_assembled_items(assembled_items_input)

        with transaction.atomic():
            for attr, value in validated_data.items():
                setattr(instance, attr, value)

            if item_usages_dict is not None:
                instance.item_usages = item_usages_dict
            # Capture previous defective set before potential change
            old_defective_set = {int(i) for i, v in (instance.defective_items or {}).items() if v}

            if defective_items_dict is not None:
                instance.defective_items = defective_items_dict
            else:
                defective_items_dict = instance.defective_items or {}

            new_defective_set = {int(i) for i, v in defective_items_dict.items() if v}
            added_defective_ids = list(new_defective_set - old_defective_set)

            if assembled_items_input is not None:
                instance.assembled_items = assembled_items_list

            if assembly_notes_description is not None:
                instance.assembly_notes = assembly_notes_description

            if assigned_to_users is not None:
                old_assigned_to = set(instance.assigned_to.all())
                instance.assigned_to.set(assigned_to_users)
                instance.assigned_by = user
                instance.assigned_at = timezone.now()
                for technician in old_assigned_to - set(assigned_to_users):
                    Notification.objects.create(
                        title="Assembly Ticket Unassigned",
                        message=f"You have been unassigned from assembly ticket ID #{instance.id}, titled '{instance.title}'.",
                        notification_type="INFO",
                        recipient=technician,
                        link=f"/assembly-tickets/{instance.id}"
                    )
                for technician in set(assigned_to_users) - old_assigned_to:
                    Notification.objects.create(
                        title="New Assembly Ticket Assigned",
                        message=f"Assembly ticket ID #{instance.id}, titled '{instance.title}', has been assigned to you by {user.username}.",
                        notification_type="INFO",
                        recipient=technician,
                        link=f"/assembly-tickets/{instance.id}"
                    )

            if ticket_items_input is not None:
                # Remove old items and set new ones
                old_items = set(instance.items.all())
                new_items = []
                for item_id in ticket_items_list:
                    item = self.deduct_stock(item_id)
                    new_items.append(item)
                instance.items.set(new_items)

                # Set unused old items back to available
                unused_items = old_items - set(new_items)
                for item in unused_items:
                    item.status = "available"
                    item.save()

            instance.save()

            # Repairs for defective items will be generated automatically when the ticket is CLOSED
            return instance 