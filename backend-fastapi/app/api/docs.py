"""
API Documentation
"""

from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html
from fastapi import APIRouter, Request, FastAPI
from fastapi.responses import HTMLResponse
from fastapi.openapi.utils import get_openapi
from app.core.config import settings

router = APIRouter()

def custom_openapi(app: FastAPI):
    """
    Generate custom OpenAPI schema
    
    Args:
        app: FastAPI application
        
    Returns:
        OpenAPI schema
    """
    if app.openapi_schema:
        return app.openapi_schema
    
    openapi_schema = get_openapi(
        title=f"{settings.PROJECT_NAME} API",
        version=settings.VERSION,
        description="""
        # NeuroNest-AI API Documentation
        
        This API provides access to the NeuroNest-AI platform, which includes:
        
        * **Agent Orchestration**: Coordinate multiple AI agents to solve complex tasks
        * **Runtime Environments**: Execute code in secure, isolated environments
        * **Document Indexing**: Search and retrieve information from documents
        * **Memory Management**: Store and retrieve agent memories
        * **Code Analysis**: Analyze and improve code
        * **Project Management**: Create and manage projects
        * **User Authentication**: Secure user authentication and authorization
        
        ## Authentication
        
        Most endpoints require authentication. To authenticate, include an `Authorization` header with a valid JWT token:
        
        ```
        Authorization: Bearer {token}
        ```
        
        You can obtain a token by calling the `/auth/login` endpoint.
        """,
        routes=app.routes,
    )
    
    # Add security scheme
    openapi_schema["components"] = openapi_schema.get("components", {})
    openapi_schema["components"]["securitySchemes"] = {
        "bearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
        }
    }
    
    # Apply security to all operations except auth endpoints
    for path, path_item in openapi_schema["paths"].items():
        if not path.startswith("/auth/login") and not path.startswith("/auth/register"):
            for operation in path_item.values():
                operation["security"] = operation.get("security", []) + [{"bearerAuth": []}]
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema

@router.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html(request: Request) -> HTMLResponse:
    """
    Custom Swagger UI
    """
    root_path = request.scope.get("root_path", "").rstrip("/")
    openapi_url = root_path + "/openapi.json"
    
    return get_swagger_ui_html(
        openapi_url=openapi_url,
        title=f"{settings.PROJECT_NAME} - API Documentation",
        swagger_js_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js",
        swagger_css_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css",
        swagger_favicon_url="https://fastapi.tiangolo.com/img/favicon.png",
        swagger_ui_parameters={
            "docExpansion": "none",
            "defaultModelsExpandDepth": 0,
            "persistAuthorization": True,
            "displayRequestDuration": True,
            "filter": True,
            "syntaxHighlight.theme": "monokai"
        }
    )

@router.get("/redoc", include_in_schema=False)
async def redoc_html(request: Request) -> HTMLResponse:
    """
    ReDoc UI
    """
    root_path = request.scope.get("root_path", "").rstrip("/")
    openapi_url = root_path + "/openapi.json"
    
    return get_redoc_html(
        openapi_url=openapi_url,
        title=f"{settings.PROJECT_NAME} - API Documentation",
        redoc_js_url="https://cdn.jsdelivr.net/npm/redoc@next/bundles/redoc.standalone.js",
        redoc_favicon_url="https://fastapi.tiangolo.com/img/favicon.png",
        with_google_fonts=True
    )

@router.get("/api", response_class=HTMLResponse, include_in_schema=False)
async def api_home():
    """
    API Documentation Home
    """
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>NeuroNest-AI API Documentation</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                margin: 0;
                padding: 0;
                background-color: #f5f5f5;
                color: #333;
            }
            .container {
                max-width: 800px;
                margin: 0 auto;
                padding: 40px 20px;
            }
            h1 {
                color: #2c3e50;
                border-bottom: 2px solid #3498db;
                padding-bottom: 10px;
            }
            .card {
                background-color: white;
                border-radius: 8px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                padding: 20px;
                margin-bottom: 20px;
            }
            .doc-link {
                display: block;
                margin: 20px 0;
                padding: 15px 20px;
                background-color: #3498db;
                color: white;
                text-decoration: none;
                border-radius: 4px;
                font-weight: bold;
                text-align: center;
                transition: background-color 0.3s;
            }
            .doc-link:hover {
                background-color: #2980b9;
            }
            .features {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                gap: 15px;
                margin-top: 30px;
            }
            .feature {
                background-color: #ecf0f1;
                padding: 15px;
                border-radius: 4px;
                text-align: center;
            }
            .feature h3 {
                margin-top: 0;
                color: #2c3e50;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>NeuroNest-AI API Documentation</h1>
            
            <div class="card">
                <p>Welcome to the NeuroNest-AI API documentation. This API provides access to the NeuroNest-AI platform, which includes agent orchestration, runtime environments, document indexing, and more.</p>
                
                <a href="/docs" class="doc-link">Interactive API Documentation (Swagger UI)</a>
                <a href="/redoc" class="doc-link">Reference Documentation (ReDoc)</a>
            </div>
            
            <div class="card">
                <h2>Key Features</h2>
                <div class="features">
                    <div class="feature">
                        <h3>Agent Orchestration</h3>
                        <p>Coordinate multiple AI agents to solve complex tasks</p>
                    </div>
                    <div class="feature">
                        <h3>Runtime Environments</h3>
                        <p>Execute code in secure, isolated environments</p>
                    </div>
                    <div class="feature">
                        <h3>Document Indexing</h3>
                        <p>Search and retrieve information from documents</p>
                    </div>
                    <div class="feature">
                        <h3>Memory Management</h3>
                        <p>Store and retrieve agent memories</p>
                    </div>
                    <div class="feature">
                        <h3>Code Analysis</h3>
                        <p>Analyze and improve code</p>
                    </div>
                    <div class="feature">
                        <h3>Project Management</h3>
                        <p>Create and manage projects</p>
                    </div>
                </div>
            </div>
        </div>
    </body>
    </html>
    """