from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.openapi.utils import get_openapi
import os
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Import API routers
from app.api.routes import agents, auth, projects, execution, files, settings, speech
from app.api.routes import github, code_analysis, sandbox, langchain_agent, memory, conversation
from app.api.routes import runtime, orchestration, document_index
from app.api import docs

# Create FastAPI app
app = FastAPI(
    title="NeuroNest-AI API",
    description="Backend API for NeuroNest-AI, a multi-purpose intelligent agent platform",
    version="1.0.0",
    docs_url=None,  # Disable default docs
    redoc_url=None,  # Disable default redoc
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred. Please try again later."},
    )

# Include documentation
app.include_router(docs.router, tags=["Documentation"])

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(agents.router, prefix="/api/agents", tags=["Agents"])
app.include_router(projects.router, prefix="/api/projects", tags=["Projects"])
app.include_router(execution.router, prefix="/api/execution", tags=["Execution"])
app.include_router(files.router, prefix="/api/files", tags=["Files"])
app.include_router(settings.router, prefix="/api/settings", tags=["Settings"])

# Include new routers
app.include_router(github.router, prefix="/api/github", tags=["GitHub"])
app.include_router(code_analysis.router, prefix="/api/code", tags=["Code Analysis"])
app.include_router(sandbox.router, prefix="/api/sandbox", tags=["Sandbox"])
app.include_router(langchain_agent.router, prefix="/api/agent", tags=["Agent"])
app.include_router(memory.router, prefix="/api/memory", tags=["Memory"])
app.include_router(conversation.router, prefix="/api/conversation", tags=["Conversation"])
app.include_router(speech.router, prefix="/api/speech", tags=["Speech"])
app.include_router(runtime.router, prefix="/api/runtime", tags=["Runtime"])
app.include_router(orchestration.router, prefix="/api/orchestration", tags=["Orchestration"])
app.include_router(document_index.router, prefix="/api/document-index", tags=["Document Index"])

# Mount static files for project outputs
os.makedirs("./static/projects", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "version": app.version}

# Cleanup on shutdown
@app.on_event("shutdown")
async def shutdown_event():
    """Clean up resources on shutdown"""
    try:
        from app.services.docker_sandbox_service import docker_sandbox_service
        from app.services.github_service import github_service
        from app.services.langchain_agent_service import langchain_agent_service
        from app.services.runtime_service import RuntimeService
        from app.services.orchestration_service import OrchestrationService
        from app.services.document_index_service import DocumentIndexService
        from app.services.memory_service import MemoryService
        
        # Cleanup docker sandbox
        docker_sandbox_service.cleanup()
        logger.info("Docker sandbox service cleaned up")
        
        # Cleanup GitHub service
        github_service.cleanup()
        logger.info("GitHub service cleaned up")
        
        # Cleanup LangChain agent service
        langchain_agent_service.cleanup()
        logger.info("LangChain agent service cleaned up")
        
        # Cleanup runtime service
        runtime_service = RuntimeService()
        await runtime_service.cleanup_all_environments()
        logger.info("Runtime environments cleaned up")
        
        # Cleanup orchestration service
        orchestration_service = OrchestrationService()
        await orchestration_service.cleanup()
        logger.info("Orchestration service cleaned up")
        
        # Cleanup document index service
        document_index_service = DocumentIndexService()
        await document_index_service.close()
        logger.info("Document index service closed")
        
        # Cleanup memory service
        memory_service = MemoryService()
        await memory_service.close()
        logger.info("Memory service closed")
    except Exception as e:
        logger.error(f"Error during cleanup: {e}", exc_info=True)

# Custom OpenAPI schema
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    
    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
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
        
        You can obtain a token by calling the `/api/auth/login` endpoint.
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
        if not path.startswith("/api/auth/login") and not path.startswith("/api/auth/register"):
            for operation in path_item.values():
                operation["security"] = operation.get("security", []) + [{"bearerAuth": []}]
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)