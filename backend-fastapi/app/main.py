from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
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
from app.api.routes import agents, auth, projects, execution, files, settings

# Create FastAPI app
app = FastAPI(
    title="NeuroNest-AI API",
    description="Backend API for NeuroNest-AI, a multi-purpose intelligent agent platform",
    version="1.0.0",
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

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(agents.router, prefix="/api/agents", tags=["Agents"])
app.include_router(projects.router, prefix="/api/projects", tags=["Projects"])
app.include_router(execution.router, prefix="/api/execution", tags=["Execution"])
app.include_router(files.router, prefix="/api/files", tags=["Files"])
app.include_router(settings.router, prefix="/api/settings", tags=["Settings"])

# Mount static files for project outputs
os.makedirs("./static/projects", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "version": app.version}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)