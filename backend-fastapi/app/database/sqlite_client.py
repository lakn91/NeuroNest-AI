import sqlite3
import json
import logging
import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional, Union
from pathlib import Path

# Setup logging
logger = logging.getLogger(__name__)

class SQLiteClient:
    """
    SQLite client for database operations.
    This is a simpler alternative to Firestore for data storage.
    """
    
    def __init__(self, db_path: str = "./data/neuronest.db"):
        """Initialize the SQLite client"""
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(exist_ok=True)
        self._init_db()
    
    def _init_db(self):
        """Initialize the database with required tables"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Create conversations table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            title TEXT NOT NULL,
            messages TEXT NOT NULL,
            created_at TIMESTAMP NOT NULL,
            updated_at TIMESTAMP NOT NULL
        )
        ''')
        
        # Create projects table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            files TEXT NOT NULL,
            created_at TIMESTAMP NOT NULL,
            updated_at TIMESTAMP NOT NULL
        )
        ''')
        
        # Create memory table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS memory (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            agent_id TEXT NOT NULL,
            key TEXT NOT NULL,
            value TEXT NOT NULL,
            metadata TEXT,
            created_at TIMESTAMP NOT NULL,
            updated_at TIMESTAMP NOT NULL
        )
        ''')
        
        # Create vector_memory table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS vector_memory (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            agent_id TEXT NOT NULL,
            content TEXT NOT NULL,
            embedding TEXT,
            metadata TEXT,
            created_at TIMESTAMP NOT NULL,
            updated_at TIMESTAMP NOT NULL
        )
        ''')
        
        # Create plugins table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS plugins (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            version TEXT NOT NULL,
            author TEXT,
            config TEXT,
            enabled BOOLEAN NOT NULL DEFAULT 1,
            created_at TIMESTAMP NOT NULL,
            updated_at TIMESTAMP NOT NULL
        )
        ''')
        
        conn.commit()
        conn.close()
        logger.info("SQLite database initialized successfully")
    
    def get_document(self, collection: str, document_id: str) -> Optional[Dict[str, Any]]:
        """Get a document from the database"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        try:
            cursor.execute(f"SELECT * FROM {collection} WHERE id = ?", (document_id,))
            row = cursor.fetchone()
            
            if not row:
                return None
            
            # Convert row to dict
            result = dict(row)
            
            # Parse JSON fields
            for field in ['messages', 'files', 'metadata', 'embedding', 'config', 'value']:
                if field in result and result[field]:
                    try:
                        result[field] = json.loads(result[field])
                    except (json.JSONDecodeError, TypeError):
                        pass
            
            return result
        except Exception as e:
            logger.error(f"Error getting document: {e}")
            return None
        finally:
            conn.close()
    
    def add_document(self, collection: str, data: Dict[str, Any]) -> Optional[str]:
        """Add a document to the database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Generate ID if not provided
            if 'id' not in data:
                data['id'] = str(uuid.uuid4())
            
            # Add timestamps if not provided
            now = datetime.utcnow()
            if 'created_at' not in data:
                data['created_at'] = now
            if 'updated_at' not in data:
                data['updated_at'] = now
            
            # Convert datetime objects to strings
            for key, value in data.items():
                if isinstance(value, datetime):
                    data[key] = value.isoformat()
            
            # Convert JSON fields
            for field in ['messages', 'files', 'metadata', 'embedding', 'config', 'value']:
                if field in data and data[field] is not None:
                    if not isinstance(data[field], str):
                        data[field] = json.dumps(data[field])
            
            # Build the SQL query
            fields = ', '.join(data.keys())
            placeholders = ', '.join(['?' for _ in data.keys()])
            values = list(data.values())
            
            cursor.execute(f"INSERT INTO {collection} ({fields}) VALUES ({placeholders})", values)
            conn.commit()
            
            return data['id']
        except Exception as e:
            logger.error(f"Error adding document: {e}")
            conn.rollback()
            return None
        finally:
            conn.close()
    
    def update_document(self, collection: str, document_id: str, data: Dict[str, Any]) -> bool:
        """Update a document in the database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Add updated_at timestamp
            data['updated_at'] = datetime.utcnow().isoformat()
            
            # Convert JSON fields
            for field in ['messages', 'files', 'metadata', 'embedding', 'config', 'value']:
                if field in data and data[field] is not None:
                    if not isinstance(data[field], str):
                        data[field] = json.dumps(data[field])
            
            # Build the SQL query
            set_clause = ', '.join([f"{key} = ?" for key in data.keys()])
            values = list(data.values()) + [document_id]
            
            cursor.execute(f"UPDATE {collection} SET {set_clause} WHERE id = ?", values)
            conn.commit()
            
            return cursor.rowcount > 0
        except Exception as e:
            logger.error(f"Error updating document: {e}")
            conn.rollback()
            return False
        finally:
            conn.close()
    
    def delete_document(self, collection: str, document_id: str) -> bool:
        """Delete a document from the database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute(f"DELETE FROM {collection} WHERE id = ?", (document_id,))
            conn.commit()
            
            return cursor.rowcount > 0
        except Exception as e:
            logger.error(f"Error deleting document: {e}")
            conn.rollback()
            return False
        finally:
            conn.close()
    
    def query_documents(self, collection: str, field: str, operator: str, value: Any) -> List[Dict[str, Any]]:
        """Query documents from the database"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        try:
            # Map operators to SQL
            op_map = {
                "==": "=",
                "<": "<",
                "<=": "<=",
                ">": ">",
                ">=": ">=",
                "!=": "!="
            }
            
            sql_op = op_map.get(operator, "=")
            
            cursor.execute(f"SELECT * FROM {collection} WHERE {field} {sql_op} ?", (value,))
            rows = cursor.fetchall()
            
            results = []
            for row in rows:
                result = dict(row)
                
                # Parse JSON fields
                for field in ['messages', 'files', 'metadata', 'embedding', 'config', 'value']:
                    if field in result and result[field]:
                        try:
                            result[field] = json.loads(result[field])
                        except (json.JSONDecodeError, TypeError):
                            pass
                
                results.append(result)
            
            return results
        except Exception as e:
            logger.error(f"Error querying documents: {e}")
            return []
        finally:
            conn.close()
    
    def get_all_documents(self, collection: str) -> List[Dict[str, Any]]:
        """Get all documents from a collection"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        try:
            cursor.execute(f"SELECT * FROM {collection}")
            rows = cursor.fetchall()
            
            results = []
            for row in rows:
                result = dict(row)
                
                # Parse JSON fields
                for field in ['messages', 'files', 'metadata', 'embedding', 'config', 'value']:
                    if field in result and result[field]:
                        try:
                            result[field] = json.loads(result[field])
                        except (json.JSONDecodeError, TypeError):
                            pass
                
                results.append(result)
            
            return results
        except Exception as e:
            logger.error(f"Error getting all documents: {e}")
            return []
        finally:
            conn.close()

# Create a singleton instance
sqlite_client = SQLiteClient()