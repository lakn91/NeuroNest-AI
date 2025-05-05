"""
Tests for database connections.
"""

import pytest
import asyncio
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

@pytest.mark.asyncio
async def test_postgres_connection():
    """Test PostgreSQL connection."""
    try:
        from app.database.postgres_client import postgres_client
        
        # Initialize connection
        await postgres_client.initialize()
        
        # Test query
        result = await postgres_client.fetchval("SELECT 1")
        
        assert result == 1
        
        # Close connection
        await postgres_client.close()
    except ImportError:
        pytest.skip("PostgreSQL client not available")
    except Exception as e:
        if os.environ.get("USE_POSTGRES", "").lower() == "true":
            pytest.fail(f"Failed to connect to PostgreSQL: {e}")
        else:
            pytest.skip("PostgreSQL is not enabled")

@pytest.mark.asyncio
async def test_redis_connection():
    """Test Redis connection."""
    try:
        from app.database.redis_client import redis_client
        
        # Initialize connection
        await redis_client.initialize()
        
        # Test set and get
        await redis_client.set("test:key", "test:value")
        result = await redis_client.get("test:key")
        
        assert result == "test:value"
        
        # Clean up
        await redis_client.delete("test:key")
        
        # Close connection
        await redis_client.close()
    except ImportError:
        pytest.skip("Redis client not available")
    except Exception as e:
        if os.environ.get("USE_REDIS", "").lower() == "true":
            pytest.fail(f"Failed to connect to Redis: {e}")
        else:
            pytest.skip("Redis is not enabled")

@pytest.mark.asyncio
async def test_sqlite_connection():
    """Test SQLite connection."""
    try:
        from app.database.sqlite_client import sqlite_client
        
        # Get connection
        conn = sqlite_client.get_connection()
        
        # Test query
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        result = cursor.fetchone()[0]
        
        assert result == 1
    except ImportError:
        pytest.skip("SQLite client not available")
    except Exception as e:
        pytest.fail(f"Failed to connect to SQLite: {e}")

@pytest.mark.asyncio
async def test_supabase_connection():
    """Test Supabase connection."""
    try:
        from app.database.supabase_client import get_supabase_client
        
        # Get client
        supabase = get_supabase_client()
        
        # Test query
        if os.environ.get("USE_SUPABASE", "").lower() == "true":
            response = supabase.table("users").select("count", count="exact").execute()
            assert not hasattr(response, 'error') or not response.error
        else:
            pytest.skip("Supabase is not enabled")
    except ImportError:
        pytest.skip("Supabase client not available")
    except Exception as e:
        if os.environ.get("USE_SUPABASE", "").lower() == "true":
            pytest.fail(f"Failed to connect to Supabase: {e}")
        else:
            pytest.skip("Supabase is not enabled")

@pytest.mark.asyncio
async def test_database_initialization():
    """Test database initialization."""
    try:
        from app.database.init_db import init_db
        
        # Initialize database
        await init_db()
    except ImportError:
        pytest.skip("Database initialization not available")
    except Exception as e:
        pytest.fail(f"Failed to initialize database: {e}")