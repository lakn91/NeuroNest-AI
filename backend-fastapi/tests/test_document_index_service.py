"""
Test Document Index Service
"""

import pytest
import os
import shutil
from app.services.document_index_service import DocumentIndexService

@pytest.fixture
def document_index_service():
    """
    Create a document index service for testing
    """
    # Create a temporary directory for the test
    os.makedirs("./test_document_index", exist_ok=True)
    
    # Create a document index service
    service = DocumentIndexService(
        persist_directory="./test_document_index"
    )
    
    yield service
    
    # Clean up
    shutil.rmtree("./test_document_index", ignore_errors=True)

def test_create_index(document_index_service):
    """
    Test creating an index
    """
    # Create an index
    index_id = document_index_service.create_index(
        name="Test Index",
        description="Test index for unit tests",
        user_id="test_user"
    )
    
    # Check the result
    assert index_id is not None
    
    # Get the index info
    index_info = document_index_service.get_index_info(index_id)
    
    # Check the index info
    assert index_info is not None
    assert index_info["name"] == "Test Index"
    assert index_info["description"] == "Test index for unit tests"
    assert index_info["user_id"] == "test_user"

def test_add_documents(document_index_service):
    """
    Test adding documents to an index
    """
    # Create an index
    index_id = document_index_service.create_index(
        name="Test Index",
        description="Test index for unit tests",
        user_id="test_user"
    )
    
    # Add documents
    documents = [
        {
            "text": "This is a test document about Python programming.",
            "metadata": {"source": "test", "topic": "python"}
        },
        {
            "text": "This is a test document about JavaScript programming.",
            "metadata": {"source": "test", "topic": "javascript"}
        }
    ]
    
    count = document_index_service.add_documents(index_id, documents)
    
    # Check the result
    assert count == 2
    
    # Search the index
    results = document_index_service.search(index_id, "Python programming")
    
    # Check the results
    assert len(results) > 0
    assert any("Python" in result["text"] for result in results)
    
    # Search for JavaScript
    results = document_index_service.search(index_id, "JavaScript programming")
    
    # Check the results
    assert len(results) > 0
    assert any("JavaScript" in result["text"] for result in results)

def test_delete_index(document_index_service):
    """
    Test deleting an index
    """
    # Create an index
    index_id = document_index_service.create_index(
        name="Test Index",
        description="Test index for unit tests",
        user_id="test_user"
    )
    
    # Delete the index
    document_index_service.delete_index(index_id)
    
    # Try to get the index info
    with pytest.raises(ValueError):
        document_index_service.get_index_info(index_id)

def test_list_indices(document_index_service):
    """
    Test listing indices
    """
    # Create indices
    index_id1 = document_index_service.create_index(
        name="Test Index 1",
        description="Test index 1 for unit tests",
        user_id="test_user"
    )
    
    index_id2 = document_index_service.create_index(
        name="Test Index 2",
        description="Test index 2 for unit tests",
        user_id="test_user"
    )
    
    # List indices
    indices = document_index_service.list_indices()
    
    # Check the results
    assert len(indices) >= 2
    assert any(index["id"] == index_id1 for index in indices)
    assert any(index["id"] == index_id2 for index in indices)
    
    # List indices for a specific user
    indices = document_index_service.list_indices(user_id="test_user")
    
    # Check the results
    assert len(indices) >= 2
    assert all(index["user_id"] == "test_user" for index in indices)

def test_add_files(document_index_service, tmp_path):
    """
    Test adding files to an index
    """
    # Create an index
    index_id = document_index_service.create_index(
        name="Test Index",
        description="Test index for unit tests",
        user_id="test_user"
    )
    
    # Create test files
    file1_path = tmp_path / "test1.txt"
    file1_path.write_text("This is a test file about Python programming.")
    
    file2_path = tmp_path / "test2.txt"
    file2_path.write_text("This is a test file about JavaScript programming.")
    
    # Add files
    count = document_index_service.add_files(
        index_id,
        [str(file1_path), str(file2_path)]
    )
    
    # Check the result
    assert count == 2
    
    # Search the index
    results = document_index_service.search(index_id, "Python programming")
    
    # Check the results
    assert len(results) > 0
    assert any("Python" in result["text"] for result in results)
    
    # Search for JavaScript
    results = document_index_service.search(index_id, "JavaScript programming")
    
    # Check the results
    assert len(results) > 0
    assert any("JavaScript" in result["text"] for result in results)