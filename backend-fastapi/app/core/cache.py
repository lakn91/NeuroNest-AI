"""
Cache module for NeuroNest-AI.
"""

import json
import logging
import hashlib
import inspect
import functools
from typing import Any, Callable, Dict, List, Optional, Type, TypeVar, Union, cast
from datetime import datetime, timedelta

from app.database.redis_client import get_redis_client
from app.config import settings

logger = logging.getLogger(__name__)

T = TypeVar('T')

class Cache:
    """
    Cache utility for storing and retrieving data using Redis.
    """
    
    @staticmethod
    def _generate_key(prefix: str, *args, **kwargs) -> str:
        """Generate a cache key based on function arguments."""
        key_parts = [prefix]
        
        # Add positional arguments
        for arg in args:
            if isinstance(arg, (str, int, float, bool)):
                key_parts.append(str(arg))
            elif arg is None:
                key_parts.append("None")
            else:
                # For complex objects, use their hash
                try:
                    key_parts.append(hashlib.md5(str(arg).encode()).hexdigest())
                except:
                    key_parts.append(hashlib.md5(str(id(arg)).encode()).hexdigest())
        
        # Add keyword arguments, sorted by key
        for key, value in sorted(kwargs.items()):
            if isinstance(value, (str, int, float, bool)):
                key_parts.append(f"{key}:{value}")
            elif value is None:
                key_parts.append(f"{key}:None")
            else:
                # For complex objects, use their hash
                try:
                    key_parts.append(f"{key}:{hashlib.md5(str(value).encode()).hexdigest()}")
                except:
                    key_parts.append(f"{key}:{hashlib.md5(str(id(value)).encode()).hexdigest()}")
        
        return ":".join(key_parts)
    
    @staticmethod
    async def get(key: str) -> Optional[Any]:
        """Get a value from the cache."""
        if not settings.use_redis:
            return None
        
        redis_client = await get_redis_client()
        value = await redis_client.get_json(key)
        
        if value:
            logger.debug(f"Cache hit for key: {key}")
            return value
        
        logger.debug(f"Cache miss for key: {key}")
        return None
    
    @staticmethod
    async def set(key: str, value: Any, expire: Optional[int] = None) -> bool:
        """Set a value in the cache with optional expiration in seconds."""
        if not settings.use_redis:
            return False
        
        redis_client = await get_redis_client()
        result = await redis_client.set_json(key, value, expire)
        
        if result:
            logger.debug(f"Cached value for key: {key}, TTL: {expire or 'None'}")
        else:
            logger.warning(f"Failed to cache value for key: {key}")
        
        return result
    
    @staticmethod
    async def delete(key: str) -> bool:
        """Delete a key from the cache."""
        if not settings.use_redis:
            return False
        
        redis_client = await get_redis_client()
        result = await redis_client.delete(key)
        
        if result:
            logger.debug(f"Deleted cache key: {key}")
        
        return bool(result)
    
    @staticmethod
    async def exists(key: str) -> bool:
        """Check if a key exists in the cache."""
        if not settings.use_redis:
            return False
        
        redis_client = await get_redis_client()
        return await redis_client.exists(key)
    
    @staticmethod
    async def clear_prefix(prefix: str) -> int:
        """Clear all keys with a specific prefix."""
        if not settings.use_redis:
            return 0
        
        redis_client = await get_redis_client()
        keys = await redis_client._client.keys(f"{prefix}:*")
        
        if not keys:
            return 0
        
        count = await redis_client._client.delete(*keys)
        logger.debug(f"Cleared {count} keys with prefix: {prefix}")
        
        return count

def cached(prefix: str, ttl: Optional[int] = 3600):
    """
    Decorator for caching function results.
    
    Args:
        prefix: The prefix for the cache key.
        ttl: Time to live in seconds. None for no expiration.
    """
    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            if not settings.use_redis:
                return await func(*args, **kwargs)
            
            # Generate cache key
            cache_key = Cache._generate_key(prefix, *args, **kwargs)
            
            # Try to get from cache
            cached_result = await Cache.get(cache_key)
            if cached_result is not None:
                return cached_result
            
            # Call the function
            result = await func(*args, **kwargs)
            
            # Cache the result
            await Cache.set(cache_key, result, ttl)
            
            return result
        return wrapper
    return decorator

def invalidate_cache(prefix: str):
    """
    Decorator for invalidating cache after function execution.
    
    Args:
        prefix: The prefix for the cache keys to invalidate.
    """
    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            result = await func(*args, **kwargs)
            
            if settings.use_redis:
                await Cache.clear_prefix(prefix)
                logger.debug(f"Invalidated cache with prefix: {prefix}")
            
            return result
        return wrapper
    return decorator