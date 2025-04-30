"""
Supabase Client
Provides a client for interacting with Supabase
"""

import os
import logging
from typing import Optional
from supabase import create_client, Client
from app.core.config import settings
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logger = logging.getLogger(__name__)

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
        try:
            # Get Supabase URL and key from environment variables or settings
            supabase_url = os.environ.get("SUPABASE_URL") or settings.SUPABASE_URL
            supabase_key = os.environ.get("SUPABASE_KEY") or settings.SUPABASE_KEY
            
            if not supabase_url or not supabase_key:
                logger.error("Supabase URL and key must be provided")
                raise ValueError("Supabase URL and key must be provided")
            
            # Create client
            _supabase_client = create_client(supabase_url, supabase_key)
            logger.info("Supabase client initialized successfully")
        except Exception as e:
            logger.error(f"Error initializing Supabase client: {e}")
            raise ValueError(f"Failed to initialize Supabase client: {str(e)}")
    
    return _supabase_client

def close_supabase_client():
    """
    Close the Supabase client connection
    """
    global _supabase_client
    
    if _supabase_client is not None:
        # No explicit close method in supabase-py, but we can reset the client
        _supabase_client = None
        logger.info("Supabase client connection closed")