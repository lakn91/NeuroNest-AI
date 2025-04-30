"""
Test Memory Service
"""

import pytest
import os
import shutil
from app.services.memory_service import MemoryService
from app.models.memory import MemoryItem, MemoryQuery

@pytest.fixture
def memory_service():
    """
    Create a memory service for testing
    """
    # Create a temporary directory for the test
    os.makedirs("./test_memory", exist_ok=True)
    
    # Create a memory service
    service = MemoryService(
        persist_directory="./test_memory",
        collection_name="test_collection"
    )
    
    yield service
    
    # Clean up
    shutil.rmtree("./test_memory", ignore_errors=True)

def test_add_memory(memory_service):
    """
    Test adding a memory item
    """
    # Create a memory item
    memory_item = MemoryItem(
        user_id="test_user",
        conversation_id="test_conversation",
        content="This is a test memory",
        metadata={
            "source": "test",
            "importance": 0.8
        }
    )
    
    # Add the memory item
    result = memory_service.add_memory(memory_item)
    
    # Check the result
    assert result is not None
    assert result.id is not None
    assert result.user_id == "test_user"
    assert result.conversation_id == "test_conversation"
    assert result.content == "This is a test memory"
    assert result.metadata["source"] == "test"
    assert result.metadata["importance"] == 0.8

def test_query_memory(memory_service):
    """
    Test querying memory
    """
    # Add some memory items
    memory_service.add_memory(MemoryItem(
        user_id="test_user",
        conversation_id="test_conversation",
        content="This is a test memory about Python",
        metadata={"topic": "python"}
    ))
    
    memory_service.add_memory(MemoryItem(
        user_id="test_user",
        conversation_id="test_conversation",
        content="This is a test memory about JavaScript",
        metadata={"topic": "javascript"}
    ))
    
    memory_service.add_memory(MemoryItem(
        user_id="test_user",
        conversation_id="test_conversation",
        content="This is a test memory about Machine Learning",
        metadata={"topic": "ml"}
    ))
    
    # Query for Python memories
    query = MemoryQuery(
        user_id="test_user",
        conversation_id="test_conversation",
        query="Python programming",
        limit=2
    )
    
    results = memory_service.query_memory(query)
    
    # Check the results
    assert len(results) > 0
    assert any("Python" in result.content for result in results)
    
    # Query for JavaScript memories
    query = MemoryQuery(
        user_id="test_user",
        conversation_id="test_conversation",
        query="JavaScript programming",
        limit=2
    )
    
    results = memory_service.query_memory(query)
    
    # Check the results
    assert len(results) > 0
    assert any("JavaScript" in result.content for result in results)

def test_get_memory_by_id(memory_service):
    """
    Test getting a memory item by ID
    """
    # Add a memory item
    memory_item = MemoryItem(
        user_id="test_user",
        conversation_id="test_conversation",
        content="This is a test memory",
        metadata={"source": "test"}
    )
    
    result = memory_service.add_memory(memory_item)
    
    # Get the memory item by ID
    retrieved = memory_service.get_memory_by_id(result.id)
    
    # Check the result
    assert retrieved is not None
    assert retrieved.id == result.id
    assert retrieved.user_id == "test_user"
    assert retrieved.conversation_id == "test_conversation"
    assert retrieved.content == "This is a test memory"
    assert retrieved.metadata["source"] == "test"

def test_delete_memory(memory_service):
    """
    Test deleting a memory item
    """
    # Add a memory item
    memory_item = MemoryItem(
        user_id="test_user",
        conversation_id="test_conversation",
        content="This is a test memory",
        metadata={"source": "test"}
    )
    
    result = memory_service.add_memory(memory_item)
    
    # Delete the memory item
    memory_service.delete_memory(result.id)
    
    # Try to get the memory item
    retrieved = memory_service.get_memory_by_id(result.id)
    
    # Check the result
    assert retrieved is None