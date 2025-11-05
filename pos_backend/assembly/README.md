# Assembly Ticket System

This Django app provides assembly ticket functionality for managing internal assembly tasks. Assembly tickets are different from regular tickets as they are not linked to customers and don't require signatures or payment.

## Features

- **Assembly Ticket Management**: Create, edit, and track assembly tickets
- **Item Usage Tracking**: Mark items as used, defective, or unused during assembly
- **Assembled Item Creation**: Automatically create new inventory items when assembly is completed
- **Status Management**: Track ticket status (OPEN, IN PROGRESS, PARTIALLY CLOSED, PENDING APPROVAL, CLOSED)
- **Notes System**: Add technician and manager notes to tickets

## Models

### AssemblyTicket
- Basic ticket information (title, description, deadline)
- Assignment tracking (assigned_to, assigned_by)
- Item management (items, item_usages, defective_items)
- Assembled item information (assembled_item_name, assembled_item_attributes)
- Status tracking and timestamps

### AssemblyNotes
- Notes associated with assembly tickets
- Different note types (Technician, Manager)
- User tracking for note creation

## API Endpoints

### Assembly Tickets
- `GET /assembly/api/assembly-tickets/` - List assembly tickets
- `POST /assembly/api/assembly-tickets/` - Create new assembly ticket
- `GET /assembly/api/assembly-tickets/{id}/` - Get assembly ticket details
- `PUT /assembly/api/assembly-tickets/{id}/` - Update assembly ticket
- `DELETE /assembly/api/assembly-tickets/{id}/` - Delete assembly ticket
- `POST /assembly/api/assembly-tickets/{id}/change_status/` - Change ticket status

### Assembly Notes
- `GET /assembly/api/assembly-notes/` - List assembly notes
- `POST /assembly/api/assembly-notes/` - Create new assembly note
- `GET /assembly/api/assembly-notes/{id}/` - Get assembly note details
- `PUT /assembly/api/assembly-notes/{id}/` - Update assembly note
- `DELETE /assembly/api/assembly-notes/{id}/` - Delete assembly note

## Assembly Process

1. **Create Assembly Ticket**: Admin/Manager creates an assembly ticket with title, description, and assigned technicians
2. **Add Items**: Select inventory items to be used in the assembly
3. **Track Usage**: Technicians mark items as used, defective, or leave them unused
4. **Complete Assembly**: When ticket is closed:
   - Used items are marked as "consumed"
   - Defective items are marked as "in_repair"
   - Unused items are returned to "available" status
   - If assembled item name is provided, a new inventory item is created

## Assembled Item Creation

When an assembly ticket is closed and an assembled item name is provided:

1. A new `Inventory` record is created with:
   - Name: The assembled item name
   - UPC: Auto-generated with format `ASSEMBLED_{ticket_id}_{timestamp}`
   - Serial number requirement: Based on whether attributes are provided
   - Price: Set to 0.00 (internal item)

2. A new `InventoryItem` record is created with:
   - Status: "available"
   - Warehouse: Same as the first item used in assembly
   - Attributes: Any provided attributes (serial_number, mac_address, etc.)

## Frontend Integration

The frontend includes:
- Assembly ticket list page
- Assembly ticket details page
- Assembly ticket form popup
- Integration with existing navigation and layout

## Permissions

- **Admin/Manager**: Can create, edit, delete, and view all assembly tickets
- **Technician**: Can view assigned tickets and update item usage
- **Warehouse Manager**: Can view all assembly tickets

## Usage Examples

### Creating an Assembly Ticket
```javascript
const ticketData = {
    title: "Assemble Network Switch",
    description: "Assemble Cisco switch with power supply and cables",
    assigned_to: [1, 2], // User IDs
    ticket_items: [10, 11, 12], // Inventory item IDs
    assembled_item_name: "Cisco Switch Assembly",
    assembled_item_attributes: {
        serial_number: "CS001",
        mac_address: "00:11:22:33:44:55",
        ip_address: "192.168.1.100"
    }
};
```

### Updating Item Usage
```javascript
const updateData = {
    item_usages: {
        "10": true,  // Item 10 is used
        "11": false, // Item 11 is not used
        "12": true   // Item 12 is used
    },
    defective_items: {
        "10": false, // Item 10 is not defective
        "11": true,  // Item 11 is defective
        "12": false  // Item 12 is not defective
    }
};
```

## Database Migrations

Run the following commands to set up the database:

```bash
python manage.py makemigrations assembly
python manage.py migrate
```

## Configuration

Add the assembly app to your Django settings:

```python
INSTALLED_APPS = [
    # ... other apps
    'assembly',
]
```

Add the assembly URLs to your main URL configuration:

```python
urlpatterns = [
    # ... other URLs
    path("assembly/api/", include("assembly.urls")),
]
``` 