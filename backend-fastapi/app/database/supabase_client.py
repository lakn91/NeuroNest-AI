"""
Supabase Client
Provides a client for interacting with Supabase
"""

import os
from typing import Optional
from supabase import create_client, Client
from app.config import settings

# Supabase client instance
_supabase_client: Optional[Client] = None


def get_supabase_client() -> Client:
    """
    Get a Supabase client instance
    
    Returns:
        Supabase client
    """
    global _supabase_client
    
    if _supabase_client is None:
        # Get Supabase URL and key from environment variables or settings
        supabase_url = os.environ.get("SUPABASE_URL") or settings.supabase_url
        supabase_key = os.environ.get("SUPABASE_KEY") or settings.supabase_key
        
        if not supabase_url or not supabase_key:
            raise ValueError("Supabase URL and key must be provided")
        
        # Create client
        _supabase_client = create_client(supabase_url, supabase_key)
    
    return _supabase_client