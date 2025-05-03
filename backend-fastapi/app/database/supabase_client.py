"""
Supabase Client
Provides a client for interacting with Supabase
"""

import os
import uuid
import logging
from typing import Optional, Dict, List, Any
from supabase import create_client, Client
from app.core.config import settings
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logger = logging.getLogger(__name__)

# Supabase client instance
_supabase_client: Optional[Client] = None


class MockSupabaseClient:
    """Mock Supabase client for development/testing"""
    
    def __init__(self):
        self.storage = MockStorage()
        self.table_data = {}
        
    def table(self, name):
        if name not in self.table_data:
            self.table_data[name] = []
        return MockTable(self.table_data[name])
        
    def from_(self, name):
        return self.table(name)
        
class MockTable:
    def __init__(self, data):
        self.data = data
        
    def insert(self, record):
        record_id = str(uuid.uuid4())
        record["id"] = record_id
        self.data.append(record)
        return MockResponse({"data": record})
        
    def select(self, *args):
        return self
        
    def eq(self, field, value):
        filtered = [item for item in self.data if item.get(field) == value]
        return MockResponse({"data": filtered})
        
    def execute(self):
        return MockResponse({"data": self.data})
        
class MockStorage:
    def from_upload_file(self, *args, **kwargs):
        return {"Key": f"mock-file-{uuid.uuid4()}.txt"}
        
class MockResponse:
    def __init__(self, data):
        self.data = data


def get_supabase_client():
    """
    Get a Supabase client instance
    
    Returns:
        Supabase client or mock client
    """
    global _supabase_client
    
    if _supabase_client is None:
        try:
            # Get Supabase URL and key from environment variables or settings
            supabase_url = os.environ.get("SUPABASE_URL") or getattr(settings, "SUPABASE_URL", None)
            supabase_key = os.environ.get("SUPABASE_KEY") or getattr(settings, "SUPABASE_KEY", None)
            
            if not supabase_url or not supabase_key:
                logger.error("Supabase URL and key must be provided")
                logger.warning("Using mock Supabase client")
                return MockSupabaseClient()
            
            # Create client
            _supabase_client = create_client(supabase_url, supabase_key)
            logger.info("Supabase client initialized successfully")
        except Exception as e:
            logger.error(f"Error initializing Supabase client: {e}")
            logger.warning("Using mock Supabase client")
            return MockSupabaseClient()
    
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