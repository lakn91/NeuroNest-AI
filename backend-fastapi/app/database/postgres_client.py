"""
PostgreSQL database client for NeuroNest-AI.
"""

import os
import logging
from typing import Any, Dict, List, Optional, Tuple, Union
import asyncpg
from asyncpg.pool import Pool
from contextlib import asynccontextmanager

from app.config import settings

logger = logging.getLogger(__name__)

class PostgresClient:
    """
    PostgreSQL client for database operations.
    """
    
    _instance = None
    _pool: Optional[Pool] = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(PostgresClient, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    async def initialize(self):
        """Initialize the PostgreSQL connection pool."""
        if self._initialized:
            return
        
        try:
            self._pool = await asyncpg.create_pool(
                host=settings.postgres_host,
                port=settings.postgres_port,
                user=settings.postgres_user,
                password=settings.postgres_password,
                database=settings.postgres_db,
                min_size=5,
                max_size=20
            )
            self._initialized = True
            logger.info("PostgreSQL connection pool initialized")
        except Exception as e:
            logger.error(f"Failed to initialize PostgreSQL connection pool: {e}")
            raise
    
    async def close(self):
        """Close the PostgreSQL connection pool."""
        if self._pool:
            await self._pool.close()
            self._pool = None
            self._initialized = False
            logger.info("PostgreSQL connection pool closed")
    
    @asynccontextmanager
    async def connection(self):
        """Get a connection from the pool."""
        if not self._pool:
            await self.initialize()
        
        async with self._pool.acquire() as conn:
            yield conn
    
    async def execute(self, query: str, *args) -> str:
        """Execute a query and return the status."""
        async with self.connection() as conn:
            return await conn.execute(query, *args)
    
    async def fetch(self, query: str, *args) -> List[Dict[str, Any]]:
        """Execute a query and return all results as dictionaries."""
        async with self.connection() as conn:
            rows = await conn.fetch(query, *args)
            return [dict(row) for row in rows]
    
    async def fetchrow(self, query: str, *args) -> Optional[Dict[str, Any]]:
        """Execute a query and return the first result as a dictionary."""
        async with self.connection() as conn:
            row = await conn.fetchrow(query, *args)
            return dict(row) if row else None
    
    async def fetchval(self, query: str, *args) -> Any:
        """Execute a query and return a single value."""
        async with self.connection() as conn:
            return await conn.fetchval(query, *args)
    
    async def insert(self, table: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Insert data into a table and return the inserted row."""
        columns = list(data.keys())
        values = list(data.values())
        
        placeholders = [f"${i+1}" for i in range(len(values))]
        
        query = f"""
        INSERT INTO {table} ({', '.join(columns)})
        VALUES ({', '.join(placeholders)})
        RETURNING *
        """
        
        return await self.fetchrow(query, *values)
    
    async def update(self, table: str, id_column: str, id_value: Any, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update data in a table and return the updated row."""
        columns = list(data.keys())
        values = list(data.values())
        
        set_clause = ", ".join([f"{col} = ${i+1}" for i, col in enumerate(columns)])
        
        query = f"""
        UPDATE {table}
        SET {set_clause}
        WHERE {id_column} = ${len(values) + 1}
        RETURNING *
        """
        
        return await self.fetchrow(query, *values, id_value)
    
    async def delete(self, table: str, id_column: str, id_value: Any) -> Optional[Dict[str, Any]]:
        """Delete a row from a table and return the deleted row."""
        query = f"""
        DELETE FROM {table}
        WHERE {id_column} = $1
        RETURNING *
        """
        
        return await self.fetchrow(query, id_value)
    
    async def get_by_id(self, table: str, id_column: str, id_value: Any) -> Optional[Dict[str, Any]]:
        """Get a row by ID."""
        query = f"""
        SELECT * FROM {table}
        WHERE {id_column} = $1
        """
        
        return await self.fetchrow(query, id_value)
    
    async def list_all(self, table: str, limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
        """List all rows from a table with pagination."""
        query = f"""
        SELECT * FROM {table}
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
        """
        
        return await self.fetch(query, limit, offset)
    
    async def list_by_user(self, table: str, user_id: str, limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
        """List all rows from a table for a specific user with pagination."""
        query = f"""
        SELECT * FROM {table}
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
        """
        
        return await self.fetch(query, user_id, limit, offset)
    
    async def count(self, table: str, where_clause: Optional[str] = None, *args) -> int:
        """Count rows in a table."""
        query = f"SELECT COUNT(*) FROM {table}"
        
        if where_clause:
            query += f" WHERE {where_clause}"
        
        return await self.fetchval(query, *args)
    
    async def exists(self, table: str, id_column: str, id_value: Any) -> bool:
        """Check if a row exists."""
        query = f"""
        SELECT EXISTS(
            SELECT 1 FROM {table}
            WHERE {id_column} = $1
        )
        """
        
        return await self.fetchval(query, id_value)
    
    async def transaction(self):
        """Start a transaction."""
        if not self._pool:
            await self.initialize()
        
        return self._pool.transaction()

# Create a singleton instance
postgres_client = PostgresClient()

async def get_postgres_client() -> PostgresClient:
    """Get the PostgreSQL client instance."""
    if not postgres_client._initialized:
        await postgres_client.initialize()
    return postgres_client