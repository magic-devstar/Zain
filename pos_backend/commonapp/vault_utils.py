"""
Utility functions for vault and drawer operations
"""
from .models import Vault, VaultEntry, CashEntry


def transfer_from_vault_to_drawer(opening_amount, user, cash_drawer=None):
    """
    Transfer money from vault to cash drawer when opening a drawer
    
    Args:
        opening_amount (Decimal): Amount to transfer from vault to drawer
        user (User): User who is opening the drawer
        cash_drawer (CashDrawer, optional): Cash drawer instance (if already created)
    
    Returns:
        tuple: (vault_entry, cash_entry) - Created entries
    """
    if opening_amount <= 0:
        return None, None
    
    # Get or create the main vault
    vault, created = Vault.objects.get_or_create(id=1)
    
    # Capture vault amount BEFORE the transaction
    vault_amount_before = vault.total_amount
    
    # Subtract amount from vault (allows negative amounts)
    vault.subtract_amount(opening_amount)
    
    # Create vault entry for withdrawal with vault amount at time of creation
    vault_entry = VaultEntry.objects.create(
        vault=vault,
        entry_type="withdrawal",
        amount=opening_amount,
        vault_amount_at_time=vault_amount_before,  # Vault amount before this transaction
        description=f"Cash drawer opening - {user.username}",
        created_by=user
    )
    
    # Create cash entry if cash drawer is provided
    cash_entry = None
    if cash_drawer:
        cash_entry = CashEntry.objects.create(
            cash_drawer=cash_drawer,
            entry_type="opening",
            amount=opening_amount,
            description="Cash drawer opened with initial amount",
            created_by=user
        )
    
    return vault_entry, cash_entry

