"""
Document Index Service - Provides document indexing and search using LlamaIndex
"""

import os
import uuid
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
import aiofiles
import json

from app.core.config import settings
from app.database.supabase_client import get_supabase_client

# Import LlamaIndex components
try:
    from llama_index import VectorStoreIndex, SimpleDirectoryReader, Document, ServiceContext
    from llama_index.vector_stores import ChromaVectorStore
    from llama_index.storage.storage_context import StorageContext
    from llama_index.embeddings import OpenAIEmbeddings, HuggingFaceEmbeddings
    from llama_index.node_parser import SimpleNodeParser
    from llama_index.llms import OpenAI
    import chromadb
    from chromadb.config import Settings as ChromaSettings
    
    # Flag to indicate that document indexing is available
    DOCUMENT_INDEX_AVAILABLE = True
except ImportError:
    DOCUMENT_INDEX_AVAILABLE = False
    logging.warning("Document indexing components not available. Using fallback storage.")

logger = logging.getLogger(__name__)

class DocumentIndexService:
    """
    Service for indexing and retrieving documents using LlamaIndex and Chroma
    """
    
    def __init__(self):
        self.logger = logger
        self.supabase = get_supabase_client()
        
        # Set up index paths
        self.index_base_path = settings.VECTOR_DB_PATH
        os.makedirs(self.index_base_path, exist_ok=True)
        
        # In-memory storage for index metadata
        # In a production environment, this would be stored in a database
        self.indices = {}
        
        # Initialize components if available
        if DOCUMENT_INDEX_AVAILABLE:
            self._init_components()
        
        # Load existing indices
        self._load_indices()
    
    def _init_components(self):
        """Initialize LlamaIndex and Chroma components"""
        try:
            # Initialize Chroma client with settings
            self.chroma_client = chromadb.PersistentClient(
                path=os.path.join(self.index_base_path, "chroma_db"),
                settings=ChromaSettings(
                    anonymized_telemetry=False
                )
            )
            
            # Initialize LLM and embedding function
            if settings.OPENAI_API_KEY:
                self.llm = OpenAI(
                    model="gpt-3.5-turbo",
                    temperature=settings.AGENT_TEMPERATURE,
                    api_key=settings.OPENAI_API_KEY
                )
                self.embed_model = OpenAIEmbeddings()
                self.logger.info("Using OpenAI for document indexing")
            else:
                # Use HuggingFace embeddings as fallback
                self.llm = None
                self.embed_model = HuggingFaceEmbeddings(
                    model_name="sentence-transformers/all-mpnet-base-v2"
                )
                self.logger.info("Using HuggingFace embeddings for document indexing")
            
            # Create service context with settings
            self.service_context = ServiceContext.from_defaults(
                llm=self.llm,
                embed_model=self.embed_model,
                chunk_size=settings.LLAMA_INDEX_CHUNK_SIZE,
                chunk_overlap=settings.LLAMA_INDEX_CHUNK_OVERLAP
            )
            
            self.logger.info("Document index components initialized successfully")
        except Exception as e:
            self.logger.error(f"Error initializing document index components: {e}")
            raise
    
    async def create_index(
        self,
        name: str,
        description: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> str:
        """
        Create a new document index
        """
        index_id = str(uuid.uuid4())
        index_path = os.path.join(self.index_base_path, index_id)
        os.makedirs(index_path, exist_ok=True)
        
        # Create a new Chroma collection
        collection = self.chroma_client.create_collection(name=index_id)
        
        # Create index metadata
        index_metadata = {
            "id": index_id,
            "name": name,
            "description": description or "",
            "user_id": user_id,
            "document_count": 0,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        # Store index metadata
        self.indices[index_id] = index_metadata
        await self._save_indices()
        
        return index_id
    
    async def add_documents(
        self,
        index_id: str,
        documents: List[Dict[str, Any]]
    ) -> int:
        """
        Add documents to an index
        """
        if index_id not in self.indices:
            raise ValueError(f"Index {index_id} not found")
        
        # Get the index metadata
        index_metadata = self.indices[index_id]
        
        # Get the Chroma collection
        collection = self.chroma_client.get_collection(name=index_id)
        
        # Create LlamaIndex documents
        llama_docs = []
        for doc in documents:
            llama_doc = Document(
                text=doc["text"],
                metadata=doc.get("metadata", {})
            )
            llama_docs.append(llama_doc)
        
        # Create vector store
        vector_store = ChromaVectorStore(chroma_collection=collection)
        storage_context = StorageContext.from_defaults(vector_store=vector_store)
        
        # Create index
        index = VectorStoreIndex.from_documents(
            llama_docs,
            storage_context=storage_context,
            service_context=self.service_context
        )
        
        # Update index metadata
        index_metadata["document_count"] += len(documents)
        index_metadata["updated_at"] = datetime.now().isoformat()
        await self._save_indices()
        
        return len(documents)
    
    async def add_files(
        self,
        index_id: str,
        file_paths: List[str]
    ) -> int:
        """
        Add files to an index
        """
        if index_id not in self.indices:
            raise ValueError(f"Index {index_id} not found")
        
        # Get the index metadata
        index_metadata = self.indices[index_id]
        
        # Get the Chroma collection
        collection = self.chroma_client.get_collection(name=index_id)
        
        # Load documents from files
        documents = SimpleDirectoryReader(
            input_files=file_paths
        ).load_data()
        
        # Create vector store
        vector_store = ChromaVectorStore(chroma_collection=collection)
        storage_context = StorageContext.from_defaults(vector_store=vector_store)
        
        # Create index
        index = VectorStoreIndex.from_documents(
            documents,
            storage_context=storage_context,
            service_context=self.service_context
        )
        
        # Update index metadata
        index_metadata["document_count"] += len(documents)
        index_metadata["updated_at"] = datetime.now().isoformat()
        await self._save_indices()
        
        return len(documents)
    
    async def search(
        self,
        index_id: str,
        query: str,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Search an index for documents matching a query
        """
        if index_id not in self.indices:
            raise ValueError(f"Index {index_id} not found")
        
        # Get the Chroma collection
        collection = self.chroma_client.get_collection(name=index_id)
        
        # Create vector store
        vector_store = ChromaVectorStore(chroma_collection=collection)
        storage_context = StorageContext.from_defaults(vector_store=vector_store)
        
        # Create index
        index = VectorStoreIndex.from_vector_store(
            vector_store,
            service_context=self.service_context
        )
        
        # Create query engine
        query_engine = index.as_query_engine(similarity_top_k=limit)
        
        # Execute query
        response = query_engine.query(query)
        
        # Format results
        results = []
        for node in response.source_nodes:
            results.append({
                "text": node.text,
                "metadata": node.metadata,
                "score": node.score
            })
        
        return results
    
    async def delete_index(self, index_id: str) -> None:
        """
        Delete an index
        """
        if index_id not in self.indices:
            raise ValueError(f"Index {index_id} not found")
        
        # Delete the Chroma collection
        self.chroma_client.delete_collection(name=index_id)
        
        # Delete index metadata
        del self.indices[index_id]
        await self._save_indices()
    
    async def get_index_info(self, index_id: str) -> Dict[str, Any]:
        """
        Get information about an index
        """
        if index_id not in self.indices:
            raise ValueError(f"Index {index_id} not found")
        
        return self.indices[index_id]
    
    async def list_indices(self, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        List all indices, optionally filtered by user_id
        """
        if user_id:
            return [index for index in self.indices.values() if index["user_id"] == user_id]
        else:
            return list(self.indices.values())
    
    async def _save_indices(self) -> None:
        """
        Save index metadata to disk
        """
        indices_file = os.path.join(self.index_base_path, "indices.json")
        async with aiofiles.open(indices_file, "w") as f:
            await f.write(json.dumps(self.indices))
    
    def _load_indices(self) -> None:
        """
        Load index metadata from disk
        """
        indices_file = os.path.join(self.index_base_path, "indices.json")
        if os.path.exists(indices_file):
            try:
                with open(indices_file, "r") as f:
                    self.indices = json.loads(f.read())
            except Exception as e:
                self.logger.error(f"Error loading indices: {str(e)}", exc_info=True)
                self.indices = {}
    
    async def close(self):
        """
        Close the document index
        """
        try:
            # No explicit close method for Chroma client in chromadb
            # But we can reset the client
            if DOCUMENT_INDEX_AVAILABLE:
                self.chroma_client = None
                self.embed_model = None
                self.service_context = None
            self.logger.info("Document index service connections closed")
        except Exception as e:
            self.logger.error(f"Error closing document index service connections: {e}")