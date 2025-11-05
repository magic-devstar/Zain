from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Count
from collections import defaultdict
from custom_user.models import Account, StoreProfile


class Command(BaseCommand):
    help = 'Clean up duplicate user accounts by deleting those with fewer store profiles'

    def _emails_are_similar(self, email1, email2):
        """Check if two emails are very similar (likely typos)"""
        if email1 == email2:
            return False
        
        # Split into local and domain parts
        try:
            local1, domain1 = email1.split('@')
            local2, domain2 = email2.split('@')
        except ValueError:
            return False
        
        # Check if domains are very similar (common typos)
        domain_similar = (
            domain1 == domain2 or
            domain1.replace('o', '0') == domain2.replace('o', '0') or  # gmail vs gm0il
            domain1.replace('0', 'o') == domain2.replace('0', 'o') or  # gm0il vs gmail
            domain1.replace('l', '1') == domain2.replace('l', '1') or  # gmai1 vs gmail
            domain1.replace('1', 'l') == domain2.replace('1', 'l') or  # gmai1 vs gmail
            domain1.replace('i', '1') == domain2.replace('i', '1') or  # gma1l vs gmail
            domain1.replace('1', 'i') == domain2.replace('1', 'i')    # gma1l vs gmail
        )
        
        # Check if local parts are very similar
        local_similar = (
            local1 == local2 or
            local1.replace('.', '') == local2.replace('.', '') or  # john.doe vs johndoe
            local1.replace('_', '') == local2.replace('_', '') or  # john_doe vs johndoe
            local1.replace('-', '') == local2.replace('-', '')     # john-doe vs johndoe
        )
        
        return domain_similar and local_similar

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force deletion without confirmation',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        force = options['force']
        
        self.stdout.write(
            self.style.SUCCESS('Starting duplicate account cleanup...')
        )
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING('DRY RUN MODE - No accounts will be deleted')
            )
        
        # Get all accounts with their store profile count
        accounts_with_store_count = Account.objects.annotate(
            store_count=Count('store_profiles')
        ).values('id', 'email', 'username', 'role', 'store_count')
        
        # Debug: Show all accounts found
        self.stdout.write(f'Total accounts found: {len(accounts_with_store_count)}')
        self.stdout.write('All accounts:')
        for acc in accounts_with_store_count:
            self.stdout.write(f'  ID {acc["id"]}: {acc["email"]} - {acc["username"]} ({acc["store_count"]} stores)')
        
        # Group accounts by email (case-insensitive)
        email_groups = defaultdict(list)
        for account in accounts_with_store_count:
            # Normalize email to lowercase for comparison
            normalized_email = account['email'].lower().strip()
            email_groups[normalized_email].append(account)
        
        # Debug: Show email groups
        self.stdout.write(f'\nEmail groups found: {len(email_groups)}')
        for email, accounts in email_groups.items():
            self.stdout.write(f'  {email}: {len(accounts)} accounts')
            for acc in accounts:
                self.stdout.write(f'    - ID {acc["id"]}: {acc["username"]} (original: {acc["email"]})')
        
        # Find duplicate emails
        duplicate_emails = {
            email: accounts for email, accounts in email_groups.items() 
            if len(accounts) > 1
        }
        
        # Also check for similar usernames that might be duplicates
        username_groups = defaultdict(list)
        for account in accounts_with_store_count:
            # Normalize username for comparison (remove extra spaces, lowercase)
            normalized_username = account['username'].lower().strip()
            username_groups[normalized_username].append(account)
        
        duplicate_usernames = {
            username: accounts for username, accounts in username_groups.items() 
            if len(accounts) > 1
        }
        
        # Show potential duplicates by username
        if duplicate_usernames:
            self.stdout.write(f'\nPotential duplicates by username: {len(duplicate_usernames)}')
            for username, accounts in duplicate_usernames.items():
                self.stdout.write(f'  Username: {username}')
                for acc in accounts:
                    self.stdout.write(f'    - ID {acc["id"]}: {acc["email"]} ({acc["store_count"]} stores)')
        
        # Show potential duplicates by email
        if duplicate_emails:
            self.stdout.write(f'\nDuplicate emails found: {len(duplicate_emails)}')
        else:
            self.stdout.write(f'\nNo duplicate emails found.')
            
        # Check for accounts with very similar emails (typos)
        all_emails = list(email_groups.keys())
        similar_emails = []
        
        for i, email1 in enumerate(all_emails):
            for j, email2 in enumerate(all_emails[i+1:], i+1):
                # Check if emails are very similar (likely typos)
                if self._emails_are_similar(email1, email2):
                    similar_emails.append((email1, email2))
        
        if similar_emails:
            self.stdout.write(f'\nSimilar emails (possible typos): {len(similar_emails)}')
            for email1, email2 in similar_emails:
                self.stdout.write(f'  {email1} ~ {email2}')
                # Show accounts with these emails
                for email in [email1, email2]:
                    if email in email_groups:
                        for acc in email_groups[email]:
                            self.stdout.write(f'    - ID {acc["id"]}: {acc["username"]} ({acc["store_count"]} stores)')
        
        if not duplicate_emails and not duplicate_usernames and not similar_emails:
            self.stdout.write(
                self.style.SUCCESS('No duplicates found by email, username, or similar emails.')
            )
            return
        
        # Process duplicates for deletion
        total_to_delete = 0
        accounts_to_delete = []
        
        # Process email duplicates
        if duplicate_emails:
            self.stdout.write(f'\nProcessing {len(duplicate_emails)} duplicate email groups:')
            for email, accounts in duplicate_emails.items():
                self.stdout.write(f'\nEmail: {email}')
                self.stdout.write('Accounts:')
                
                # Sort by store count (descending) and then by date_joined (ascending)
                sorted_accounts = sorted(
                    accounts, 
                    key=lambda x: (x['store_count'], x['id']), 
                    reverse=True
                )
                
                # Keep the account with the most store profiles (first after sorting)
                account_to_keep = sorted_accounts[0]
                accounts_to_remove = sorted_accounts[1:]
                
                self.stdout.write(f'  KEEP: ID {account_to_keep["id"]} - {account_to_keep["username"]} '
                                f'({account_to_keep["store_count"]} stores) - {account_to_keep["role"]}')
                
                for account in accounts_to_remove:
                    self.stdout.write(f'  DELETE: ID {account["id"]} - {account["username"]} '
                                    f'({account["store_count"]} stores) - {account["role"]}')
                    accounts_to_delete.append(account)
                    total_to_delete += 1
        
        # Process username duplicates
        if duplicate_usernames:
            self.stdout.write(f'\nProcessing {len(duplicate_usernames)} duplicate username groups:')
            for username, accounts in duplicate_usernames.items():
                self.stdout.write(f'\nUsername: {username}')
                self.stdout.write('Accounts:')
                
                # Sort by store count (descending) and then by date_joined (ascending)
                sorted_accounts = sorted(
                    accounts, 
                    key=lambda x: (x['store_count'], x['id']), 
                    reverse=True
                )
                
                # Keep the account with the most store profiles (first after sorting)
                account_to_keep = sorted_accounts[0]
                accounts_to_remove = sorted_accounts[1:]
                
                self.stdout.write(f'  KEEP: ID {account_to_keep["id"]} - {account_to_keep["username"]} '
                                f'({account_to_keep["store_count"]} stores) - {account_to_keep["email"]}')
                
                for account in accounts_to_remove:
                    self.stdout.write(f'  DELETE: ID {account["id"]} - {account["username"]} '
                                    f'({account["store_count"]} stores) - {account["email"]}')
                    accounts_to_delete.append(account)
                    total_to_delete += 1
        
        # Process similar emails (typos)
        if similar_emails:
            self.stdout.write(f'\nProcessing {len(similar_emails)} similar email groups (possible typos):')
            processed_emails = set()
            
            for email1, email2 in similar_emails:
                if email1 in processed_emails or email2 in processed_emails:
                    continue
                    
                # Get all accounts with these similar emails
                similar_accounts = []
                for email in [email1, email2]:
                    if email in email_groups:
                        similar_accounts.extend(email_groups[email])
                
                if len(similar_accounts) > 1:
                    self.stdout.write(f'\nSimilar emails: {email1} ~ {email2}')
                    self.stdout.write('Accounts:')
                    
                    # Sort by store count (descending) and then by date_joined (ascending)
                    sorted_accounts = sorted(
                        similar_accounts, 
                        key=lambda x: (x['store_count'], x['id']), 
                        reverse=True
                    )
                    
                    # Keep the account with the most store profiles (first after sorting)
                    account_to_keep = sorted_accounts[0]
                    accounts_to_remove = sorted_accounts[1:]
                    
                    self.stdout.write(f'  KEEP: ID {account_to_keep["id"]} - {account_to_keep["username"]} '
                                    f'({account_to_keep["store_count"]} stores) - {account_to_keep["email"]}')
                    
                    for account in accounts_to_remove:
                        self.stdout.write(f'  DELETE: ID {account["id"]} - {account["username"]} '
                                        f'({account["store_count"]} stores) - {account["email"]}')
                        accounts_to_delete.append(account)
                        total_to_delete += 1
                    
                    processed_emails.add(email1)
                    processed_emails.add(email2)
        
        if not accounts_to_delete:
            self.stdout.write(
                self.style.SUCCESS('No accounts to delete.')
            )
            return
        
        self.stdout.write(f'\nTotal accounts to delete: {total_to_delete}')
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING('DRY RUN COMPLETE - No accounts were deleted')
            )
            return
        
        # Confirm deletion unless forced
        if not force:
            confirm = input('\nAre you sure you want to delete these accounts? (yes/no): ')
            if confirm.lower() not in ['yes', 'y']:
                self.stdout.write(
                    self.style.WARNING('Operation cancelled.')
                )
                return
        
        # Perform deletion
        try:
            with transaction.atomic():
                deleted_count = 0
                for account_data in accounts_to_delete:
                    try:
                        account = Account.objects.get(id=account_data['id'])
                        account.delete()
                        deleted_count += 1
                        self.stdout.write(
                            f'Deleted account ID {account_data["id"]} - {account_data["username"]}'
                        )
                    except Account.DoesNotExist:
                        self.stdout.write(
                            self.style.WARNING(
                                f'Account ID {account_data["id"]} no longer exists'
                            )
                        )
                    except Exception as e:
                        self.stdout.write(
                            self.style.ERROR(
                                f'Error deleting account ID {account_data["id"]}: {str(e)}'
                            )
                        )
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Successfully deleted {deleted_count} duplicate accounts'
                    )
                )
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error during deletion: {str(e)}')
            )
            self.stdout.write(
                self.style.WARNING('No accounts were deleted due to errors.')
            )
