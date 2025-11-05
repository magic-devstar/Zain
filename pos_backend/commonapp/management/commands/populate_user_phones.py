from django.core.management.base import BaseCommand
from django.db import transaction
from custom_user.models import Account
from commonapp.models import StoreProfile


class Command(BaseCommand):
    help = 'Populate user phone numbers from linked store profiles owner_phone field'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be done without making changes',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force the operation without confirmation',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        force = options['force']

        self.stdout.write(
            self.style.SUCCESS('Starting user phone number population process...')
        )

        # Get all users without phone numbers
        users_without_phones = Account.objects.filter(
            phone_number__isnull=True
        ).exclude(phone_number='')

        self.stdout.write(f'Found {users_without_phones.count()} users without phone numbers')

        if not users_without_phones.exists():
            self.stdout.write(
                self.style.WARNING('No users found without phone numbers. Exiting.')
            )
            return

        # Get users with store profiles that have owner_phone
        users_to_update = []
        users_no_phone_available = []

        for user in users_without_phones:
            # Get store profiles for this user
            store_profiles = StoreProfile.objects.filter(customer=user)
            
            if not store_profiles.exists():
                users_no_phone_available.append({
                    'user': user,
                    'reason': 'No store profiles linked'
                })
                continue

            # Find store profile with owner_phone
            store_with_phone = store_profiles.filter(
                owner_phone__isnull=False
            ).exclude(owner_phone='').first()

            if store_with_phone:
                users_to_update.append({
                    'user': user,
                    'store_profile': store_with_phone,
                    'phone': store_with_phone.owner_phone
                })
            else:
                users_no_phone_available.append({
                    'user': user,
                    'reason': 'No store profiles with owner_phone'
                })

        # Display summary
        self.stdout.write(f'\nUsers that can be updated: {len(users_to_update)}')
        self.stdout.write(f'Users with no phone available: {len(users_no_phone_available)}')

        if users_to_update:
            self.stdout.write('\nUsers to be updated:')
            for item in users_to_update:
                user = item['user']
                store = item['store_profile']
                phone = item['phone']
                self.stdout.write(
                    f'  - {user.username} ({user.email}): {phone} '
                    f'[from store: {store.store_name}]'
                )

        if users_no_phone_available:
            self.stdout.write('\nUsers with no phone available:')
            for item in users_no_phone_available:
                user = item['user']
                reason = item['reason']
                self.stdout.write(f'  - {user.username} ({user.email}): {reason}')

        if not users_to_update:
            self.stdout.write(
                self.style.WARNING('\nNo users can be updated. Exiting.')
            )
            return

        if dry_run:
            self.stdout.write(
                self.style.SUCCESS('\nDRY RUN: No changes made. Use --force to apply changes.')
            )
            return

        # Confirm before proceeding
        if not force:
            self.stdout.write('\n' + '='*50)
            self.stdout.write('WARNING: This will update user phone numbers!')
            self.stdout.write('='*50)
            
            confirm = input('\nDo you want to proceed? (yes/no): ')
            if confirm.lower() not in ['yes', 'y']:
                self.stdout.write(
                    self.style.WARNING('Operation cancelled by user.')
                )
                return

        # Perform the updates
        updated_count = 0
        errors = []

        with transaction.atomic():
            for item in users_to_update:
                try:
                    user = item['user']
                    phone = item['phone']
                    store = item['store_profile']
                    
                    # Update user phone
                    user.phone_number = phone
                    user.save(update_fields=['phone_number'])
                    
                    updated_count += 1
                    
                    if not dry_run:
                        self.stdout.write(
                            f'✓ Updated {user.username}: {phone} [from store: {store.store_name}]'
                        )
                        
                except Exception as e:
                    error_msg = f'Error updating {item["user"].username}: {str(e)}'
                    errors.append(error_msg)
                    self.stdout.write(
                        self.style.ERROR(f'✗ {error_msg}')
                    )

        # Final summary
        self.stdout.write('\n' + '='*50)
        self.stdout.write('OPERATION COMPLETED')
        self.stdout.write('='*50)
        self.stdout.write(f'Users updated: {updated_count}')
        self.stdout.write(f'Errors: {len(errors)}')
        
        if errors:
            self.stdout.write('\nErrors encountered:')
            for error in errors:
                self.stdout.write(f'  - {error}')

        if updated_count > 0:
            self.stdout.write(
                self.style.SUCCESS(f'\nSuccessfully updated {updated_count} user phone numbers!')
            )
        else:
            self.stdout.write(
                self.style.WARNING('\nNo users were updated.')
            )
