"""
Memory Service
Handles agent memory storage and retrieval using Chroma vector database and LangChain
"""

from typing import Dict, List, Optional, Any
from datetime import datetime
import json
import uuid
import os
import logging

from app.database.supabase_client import get_supabase_client

# Import LangChain and Chroma components
try:
    import chromadb
    from langchain.vectorstores import Chroma
    from langchain.embeddings import OpenAIEmbedding
    from langchain.schema import Document
    from langchain.memory import VectorStoreRetrieverMemory
    from langchain.memory import ConversationBufferMemory
    
    # Initialize Chroma client
    CHROMA_PERSIST_DIRECTORY = os.path.join(os.getcwd(), "static", "chroma_db")
    os.makedirs(CHROMA_PERSIST_DIRECTORY, exist_ok=True)
    
    chroma_client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIRECTORY)
    
    # Initialize embedding function
    embedding_function = OpenAIEmbedding()
    
    # Flag to indicate that vector memory is available
    VECTOR_MEMORY_AVAILABLE = True
except ImportError:
    VECTOR_MEMORY_AVAILABLE = False
    logging.warning("Vector memory components not available. Using fallback memory storage.")

class MemoryService:
    def __init__(self):
        """Initialize the memory service"""
        self.supabase = get_supabase_client()
        
        # Initialize vector store if available
        if VECTOR_MEMORY_AVAILABLE:
            self._init_vector_store()
    
    def _init_vector_store(self):
        """Initialize the vector store for semantic memory"""
        # Create default collection if it doesn't exist
        try:
            self.default_collection = chroma_client.get_or_create_collection(
                name="agent_memories"
            )
        except Exception as e:
            logging.error(f"Error initializing vector store: {str(e)}")
            self.default_collection = None
    
    async def create_memory(
        self,
        user_id: str,
        agent_id: str,
        content: str,
        context: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Create a new memory entry
        
        Args:
            user_id: User ID
            agent_id: Agent ID
            content: Memory content
            context: Optional context for the memory
            metadata: Optional metadata for the memory
            
        Returns:
            Created memory entry
        """
        # Generate a unique ID for the memory
        memory_id = str(uuid.uuid4())
        
        # Create timestamp
        now = datetime.utcnow().isoformat()
        
        # Create memory entry
        memory_data = {
            "id": memory_id,
            "user_id": user_id,
            "agent_id": agent_id,
            "content": content,
            "context": context or "",
            "metadata": json.dumps(metadata) if metadata else "{}",
            "created_at": now,
            "updated_at": now
        }
        
        # Store in Supabase
        response = self.supabase.table("agent_memories").insert(memory_data).execute()
        
        if not response.data or len(response.data) == 0:
            raise Exception("Failed to create memory")
        
        memory = response.data[0]
        
        # Store in vector database if available
        if VECTOR_MEMORY_AVAILABLE and self.default_collection:
            try:
                # Prepare metadata
                vector_metadata = {
                    "memory_id": memory_id,
                    "user_id": user_id,
                    "agent_id": agent_id,
                    "context": context or "",
                    "timestamp": now
                }
                
                # Add to vector store
                self.default_collection.add(
                    ids=[memory_id],
                    documents=[content],
                    metadatas=[vector_metadata]
                )
            except Exception as e:
                logging.error(f"Error storing memory in vector database: {str(e)}")
        
        # Parse metadata JSON
        if memory.get("metadata"):
            try:
                memory["metadata"] = json.loads(memory["metadata"])
            except json.JSONDecodeError:
                memory["metadata"] = {}
        
        # Return the created memory
        return memory
    
    async def get_memories(
        self,
        user_id: str,
        agent_id: Optional[str] = None,
        context: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """
        Get memories for a user
        
        Args:
            user_id: User ID
            agent_id: Optional agent ID to filter by
            context: Optional context to filter by
            limit: Maximum number of memories to return
            offset: Offset for pagination
            
        Returns:
            List of memory entries
        """
        query = self.supabase.table("agent_memories").select("*").eq("user_id", user_id)
        
        if agent_id:
            query = query.eq("agent_id", agent_id)
        
        if context:
            query = query.eq("context", context)
        
        query = query.order("created_at", desc=True).limit(limit).offset(offset)
        
        response = query.execute()
        
        if not response.data:
            return []
        
        # Parse metadata JSON
        for memory in response.data:
            if memory.get("metadata"):
                try:
                    memory["metadata"] = json.loads(memory["metadata"])
                except json.JSONDecodeError:
                    memory["metadata"] = {}
        
        return response.data
    
    async def get_memory_by_id(self, memory_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a memory by ID
        
        Args:
            memory_id: Memory ID
            
        Returns:
            Memory entry or None if not found
        """
        response = self.supabase.table("agent_memories").select("*").eq("id", memory_id).execute()
        
        if not response.data or len(response.data) == 0:
            return None
        
        memory = response.data[0]
        
        # Parse metadata JSON
        if memory.get("metadata"):
            try:
                memory["metadata"] = json.loads(memory["metadata"])
            except json.JSONDecodeError:
                memory["metadata"] = {}
        
        return memory
    
    async def update_memory(
        self,
        memory_id: str,
        content: Optional[str] = None,
        context: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Update a memory
        
        Args:
            memory_id: Memory ID
            content: Optional new content
            context: Optional new context
            metadata: Optional new metadata
            
        Returns:
            Updated memory entry or None if not found
        """
        # Get current memory to merge metadata
        current_memory = await self.get_memory_by_id(memory_id)
        
        if not current_memory:
            return None
        
        update_data = {
            "updated_at": datetime.utcnow().isoformat()
        }
        
        if content is not None:
            update_data["content"] = content
        
        if context is not None:
            update_data["context"] = context
        
        if metadata is not None:
            # Merge with existing metadata
            current_metadata = current_memory.get("metadata", {})
            merged_metadata = {**current_metadata, **metadata}
            update_data["metadata"] = json.dumps(merged_metadata)
        
        response = self.supabase.table("agent_memories").update(update_data).eq("id", memory_id).execute()
        
        if not response.data or len(response.data) == 0:
            return None
        
        memory = response.data[0]
        
        # Update in vector database if available
        if VECTOR_MEMORY_AVAILABLE and self.default_collection and content is not None:
            try:
                # Prepare metadata
                vector_metadata = {
                    "memory_id": memory_id,
                    "user_id": current_memory["user_id"],
                    "agent_id": current_memory["agent_id"],
                    "context": context or current_memory["context"],
                    "timestamp": update_data["updated_at"]
                }
                
                # Update in vector store
                self.default_collection.update(
                    ids=[memory_id],
                    documents=[content],
                    metadatas=[vector_metadata]
                )
            except Exception as e:
                logging.error(f"Error updating memory in vector database: {str(e)}")
        
        # Parse metadata JSON
        if memory.get("metadata"):
            try:
                memory["metadata"] = json.loads(memory["metadata"])
            except json.JSONDecodeError:
                memory["metadata"] = {}
        
        return memory
    
    async def delete_memory(self, memory_id: str) -> bool:
        """
        Delete a memory
        
        Args:
            memory_id: Memory ID
            
        Returns:
            True if deleted, False otherwise
        """
        response = self.supabase.table("agent_memories").delete().eq("id", memory_id).execute()
        
        # Delete from vector database if available
        if VECTOR_MEMORY_AVAILABLE and self.default_collection:
            try:
                self.default_collection.delete(ids=[memory_id])
            except Exception as e:
                logging.error(f"Error deleting memory from vector database: {str(e)}")
        
        return response.data is not None and len(response.data) > 0
    
    async def delete_agent_memories(self, user_id: str, agent_id: str) -> bool:
        """
        Delete all memories for an agent
        
        Args:
            user_id: User ID
            agent_id: Agent ID
            
        Returns:
            True if deleted, False otherwise
        """
        # Get all memory IDs for this agent
        memories = await self.get_memories(user_id, agent_id)
        memory_ids = [memory["id"] for memory in memories]
        
        # Delete from Supabase
        response = self.supabase.table("agent_memories").delete().eq("user_id", user_id).eq("agent_id", agent_id).execute()
        
        # Delete from vector database if available
        if VECTOR_MEMORY_AVAILABLE and self.default_collection and memory_ids:
            try:
                self.default_collection.delete(ids=memory_ids)
            except Exception as e:
                logging.error(f"Error deleting agent memories from vector database: {str(e)}")
        
        return response.data is not None
    
    async def search_memories(
        self,
        user_id: str,
        query: str,
        agent_id: Optional[str] = None,
        context: Optional[str] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Search memories by content
        
        Args:
            user_id: User ID
            query: Search query
            agent_id: Optional agent ID to filter by
            context: Optional context to filter by
            limit: Maximum number of memories to return
            
        Returns:
            List of memory entries
        """
        # If vector search is available, use it for semantic search
        if VECTOR_MEMORY_AVAILABLE and self.default_collection:
            try:
                # Prepare filter
                filter_dict = {"user_id": user_id}
                if agent_id:
                    filter_dict["agent_id"] = agent_id
                if context:
                    filter_dict["context"] = context
                
                # Perform vector search
                results = self.default_collection.query(
                    query_texts=[query],
                    n_results=limit,
                    where=filter_dict
                )
                
                # Get memory IDs from results
                if results and results['ids'] and len(results['ids'][0]) > 0:
                    memory_ids = results['ids'][0]
                    
                    # Fetch full memory objects from Supabase
                    memories = []
                    for memory_id in memory_ids:
                        memory = await self.get_memory_by_id(memory_id)
                        if memory:
                            memories.append(memory)
                    
                    return memories
            except Exception as e:
                logging.error(f"Error in vector search: {str(e)}")
                # Fall back to traditional search
        
        # Traditional search using LIKE queries
        search_query = f"%{query}%"
        
        query_builder = self.supabase.table("agent_memories").select("*").eq("user_id", user_id).like("content", search_query)
        
        if agent_id:
            query_builder = query_builder.eq("agent_id", agent_id)
        
        if context:
            query_builder = query_builder.eq("context", context)
        
        response = query_builder.limit(limit).execute()
        
        if not response.data:
            return []
        
        # Parse metadata JSON
        for memory in response.data:
            if memory.get("metadata"):
                try:
                    memory["metadata"] = json.loads(memory["metadata"])
                except json.JSONDecodeError:
                    memory["metadata"] = {}
        
        return response.data
    
    async def get_langchain_memory(
        self,
        user_id: str,
        agent_id: str,
        memory_key: str = "chat_history"
    ):
        """
        Get a LangChain memory object for an agent
        
        Args:
            user_id: User ID
            agent_id: Agent ID
            memory_key: Memory key for the LangChain memory
            
        Returns:
            LangChain memory object
        """
        if not VECTOR_MEMORY_AVAILABLE:
            # Fallback to conversation buffer memory
            return ConversationBufferMemory(memory_key=memory_key)
        
        try:
            # Create a collection for this specific agent
            collection_name = f"agent_{agent_id}_user_{user_id}"
            collection = chroma_client.get_or_create_collection(
                name=collection_name
            )
            
            # Create vector store
            vectorstore = Chroma(
                collection_name=collection_name,
                embedding_function=embedding_function,
                client=chroma_client
            )
            
            # Create retriever
            retriever = vectorstore.as_retriever(
                search_kwargs={"k": 5}
            )
            
            # Create memory
            memory = VectorStoreRetrieverMemory(
                retriever=retriever,
                memory_key=memory_key
            )
            
            return memory
        except Exception as e:
            logging.error(f"Error creating LangChain memory: {str(e)}")
            # Fallback to conversation buffer memory
            return ConversationBufferMemory(memory_key=memory_key)

# Create a singleton instance
memory_service = MemoryService()

# Legacy function wrappers for backward compatibility
async def create_memory(
    user_id: str,
    agent_id: str,
    content: str,
    context: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    return await memory_service.create_memory(user_id, agent_id, content, context, metadata)

async def get_memories(
    user_id: str,
    agent_id: Optional[str] = None,
    context: Optional[str] = None,
    limit: int = 100,
    offset: int = 0
) -> List[Dict[str, Any]]:
    return await memory_service.get_memories(user_id, agent_id, context, limit, offset)

async def get_memory_by_id(memory_id: str) -> Optional[Dict[str, Any]]:
    return await memory_service.get_memory_by_id(memory_id)

async def update_memory(
    memory_id: str,
    content: Optional[str] = None,
    context: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> Optional[Dict[str, Any]]:
    return await memory_service.update_memory(memory_id, content, context, metadata)

async def delete_memory(memory_id: str) -> bool:
    return await memory_service.delete_memory(memory_id)

async def delete_agent_memories(user_id: str, agent_id: str) -> bool:
    return await memory_service.delete_agent_memories(user_id, agent_id)

async def search_memories(
    user_id: str,
    query: str,
    agent_id: Optional[str] = None,
    context: Optional[str] = None,
    limit: int = 10
) -> List[Dict[str, Any]]:
    return await memory_service.search_memories(user_id, query, agent_id, context, limit)

async def get_langchain_memory(
    user_id: str,
    agent_id: str,
    memory_key: str = "chat_history"
):
    return await memory_service.get_langchain_memory(user_id, agent_id, memory_key)