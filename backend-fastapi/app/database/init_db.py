"""
Database initialization script for NeuroNest-AI.

This script initializes the database connection and creates tables if they don't exist.
"""

import asyncio
import logging
from typing import Optional

from app.config import settings
from app.core.logger import get_logger

logger = get_logger(__name__)

async def init_postgres():
    """Initialize PostgreSQL database."""
    try:
        from app.database.postgres_client import postgres_client
        
        # Test connection
        await postgres_client.initialize()
        
        # Check if tables exist
        result = await postgres_client.fetchval(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')"
        )
        
        if not result:
            logger.warning("Tables don't exist in PostgreSQL database. Please run the initialization script.")
        else:
            logger.info("PostgreSQL database initialized successfully.")
        
        return True
    except Exception as e:
        logger.error(f"Failed to initialize PostgreSQL database: {e}")
        return False

async def init_redis():
    """Initialize Redis connection."""
    try:
        from app.database.redis_client import redis_client
        
        # Test connection
        await redis_client.initialize()
        
        # Set a test key
        await redis_client.set("test:connection", "success", 60)
        
        # Get the test key
        result = await redis_client.get("test:connection")
        
        if result != "success":
            logger.warning("Failed to set and get test key in Redis.")
            return False
        
        logger.info("Redis initialized successfully.")
        return True
    except Exception as e:
        logger.error(f"Failed to initialize Redis: {e}")
        return False

async def init_sqlite():
    """Initialize SQLite database."""
    try:
        from app.database.sqlite_client import sqlite_client
        
        # Test connection
        conn = sqlite_client.get_connection()
        
        # Check if tables exist
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
        result = cursor.fetchone()
        
        if not result:
            logger.warning("Tables don't exist in SQLite database. Please run the initialization script.")
        else:
            logger.info("SQLite database initialized successfully.")
        
        return True
    except Exception as e:
        logger.error(f"Failed to initialize SQLite database: {e}")
        return False

async def init_supabase():
    """Initialize Supabase connection."""
    if not settings.use_supabase:
        logger.info("Supabase is disabled. Skipping initialization.")
        return False
    
    try:
        from app.database.supabase_client import get_supabase_client
        
        # Test connection
        supabase = get_supabase_client()
        
        # Check if connection works
        response = supabase.table("users").select("count", count="exact").execute()
        
        if hasattr(response, 'error') and response.error:
            logger.error(f"Failed to connect to Supabase: {response.error}")
            return False
        
        logger.info("Supabase initialized successfully.")
        return True
    except Exception as e:
        logger.error(f"Failed to initialize Supabase: {e}")
        return False

async def init_db():
    """Initialize database connections."""
    logger.info("Initializing database connections...")
    
    # Initialize PostgreSQL if enabled
    if settings.use_postgres:
        postgres_success = await init_postgres()
        if not postgres_success:
            logger.warning("Failed to initialize PostgreSQL. Falling back to SQLite.")
            sqlite_success = await init_sqlite()
            if not sqlite_success:
                logger.error("Failed to initialize SQLite. Database functionality may be limited.")
    else:
        # Initialize SQLite
        sqlite_success = await init_sqlite()
        if not sqlite_success:
            logger.error("Failed to initialize SQLite. Database functionality may be limited.")
    
    # Initialize Redis if enabled
    if settings.use_redis:
        redis_success = await init_redis()
        if not redis_success:
            logger.warning("Failed to initialize Redis. Caching functionality will be disabled.")
    
    # Initialize Supabase if enabled
    if settings.use_supabase:
        supabase_success = await init_supabase()
        if not supabase_success:
            logger.warning("Failed to initialize Supabase. Supabase functionality will be disabled.")
    
    logger.info("Database initialization completed.")

if __name__ == "__main__":
    """Run database initialization when script is executed directly."""
    asyncio.run(init_db())