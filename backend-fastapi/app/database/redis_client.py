"""
Redis client for caching in NeuroNest-AI.
"""

import json
import logging
from typing import Any, Dict, List, Optional, Union
import redis.asyncio as redis
from contextlib import asynccontextmanager

from app.config import settings

logger = logging.getLogger(__name__)

class RedisClient:
    """
    Redis client for caching operations.
    """
    
    _instance = None
    _client = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(RedisClient, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    async def initialize(self):
        """Initialize the Redis client."""
        if self._initialized:
            return
        
        try:
            self._client = redis.Redis(
                host=settings.redis_host,
                port=settings.redis_port,
                password=settings.redis_password,
                db=settings.redis_db,
                decode_responses=True
            )
            # Test connection
            await self._client.ping()
            self._initialized = True
            logger.info("Redis client initialized")
        except Exception as e:
            logger.error(f"Failed to initialize Redis client: {e}")
            raise
    
    async def close(self):
        """Close the Redis client."""
        if self._client:
            await self._client.close()
            self._client = None
            self._initialized = False
            logger.info("Redis client closed")
    
    async def get(self, key: str) -> Optional[str]:
        """Get a value from Redis."""
        if not self._client:
            await self.initialize()
        
        return await self._client.get(key)
    
    async def set(self, key: str, value: str, expire: Optional[int] = None) -> bool:
        """Set a value in Redis with optional expiration in seconds."""
        if not self._client:
            await self.initialize()
        
        return await self._client.set(key, value, ex=expire)
    
    async def delete(self, key: str) -> int:
        """Delete a key from Redis."""
        if not self._client:
            await self.initialize()
        
        return await self._client.delete(key)
    
    async def exists(self, key: str) -> bool:
        """Check if a key exists in Redis."""
        if not self._client:
            await self.initialize()
        
        return await self._client.exists(key)
    
    async def expire(self, key: str, seconds: int) -> bool:
        """Set expiration time for a key."""
        if not self._client:
            await self.initialize()
        
        return await self._client.expire(key, seconds)
    
    async def ttl(self, key: str) -> int:
        """Get the remaining time to live for a key."""
        if not self._client:
            await self.initialize()
        
        return await self._client.ttl(key)
    
    async def get_json(self, key: str) -> Optional[Any]:
        """Get a JSON value from Redis."""
        value = await self.get(key)
        if value:
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                logger.error(f"Failed to decode JSON for key {key}")
                return None
        return None
    
    async def set_json(self, key: str, value: Any, expire: Optional[int] = None) -> bool:
        """Set a JSON value in Redis with optional expiration in seconds."""
        try:
            json_value = json.dumps(value)
            return await self.set(key, json_value, expire)
        except (TypeError, json.JSONEncodeError):
            logger.error(f"Failed to encode JSON for key {key}")
            return False
    
    async def hash_get(self, name: str, key: str) -> Optional[str]:
        """Get a value from a Redis hash."""
        if not self._client:
            await self.initialize()
        
        return await self._client.hget(name, key)
    
    async def hash_set(self, name: str, key: str, value: str) -> int:
        """Set a value in a Redis hash."""
        if not self._client:
            await self.initialize()
        
        return await self._client.hset(name, key, value)
    
    async def hash_get_all(self, name: str) -> Dict[str, str]:
        """Get all values from a Redis hash."""
        if not self._client:
            await self.initialize()
        
        return await self._client.hgetall(name)
    
    async def hash_delete(self, name: str, key: str) -> int:
        """Delete a key from a Redis hash."""
        if not self._client:
            await self.initialize()
        
        return await self._client.hdel(name, key)
    
    async def list_push(self, name: str, value: str) -> int:
        """Push a value to a Redis list."""
        if not self._client:
            await self.initialize()
        
        return await self._client.rpush(name, value)
    
    async def list_range(self, name: str, start: int = 0, end: int = -1) -> List[str]:
        """Get a range of values from a Redis list."""
        if not self._client:
            await self.initialize()
        
        return await self._client.lrange(name, start, end)
    
    async def list_length(self, name: str) -> int:
        """Get the length of a Redis list."""
        if not self._client:
            await self.initialize()
        
        return await self._client.llen(name)
    
    async def flush_db(self) -> bool:
        """Flush the current database."""
        if not self._client:
            await self.initialize()
        
        return await self._client.flushdb()

# Create a singleton instance
redis_client = RedisClient()

async def get_redis_client() -> RedisClient:
    """Get the Redis client instance."""
    if not redis_client._initialized:
        await redis_client.initialize()
    return redis_client