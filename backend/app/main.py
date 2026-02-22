import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    datefmt="%H:%M:%S",
)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import config
from app.api.routes import router as api_router
from app.api.expense_routes import router as expense_router
from app.api.calendar_routes import router as calendar_router
from app.api.weather_routes import router as weather_router
from app.api.folder_routes import router as folder_router
from app.api.gmail_routes import router as gmail_router

logger = logging.getLogger("jarvis")

app = FastAPI(
    title="Jarvis",
    description="Personal AI Voice Assistant",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")
app.include_router(expense_router, prefix="/api")
app.include_router(calendar_router, prefix="/api")
app.include_router(weather_router, prefix="/api")
app.include_router(folder_router, prefix="/api")
app.include_router(gmail_router, prefix="/api")


@app.on_event("startup")
async def startup_log():
    logger.info("=== Jarvis Backend Starting ===")

    # Auth
    logger.info("Auth: %s", "OK" if config.PASSWORD_HASH else "NOT CONFIGURED")

    # Azure OpenAI
    if config.AZURE_OPENAI_ENDPOINT and config.AZURE_OPENAI_KEY:
        logger.info("Azure OpenAI: OK (deployment=%s)", config.AZURE_OPENAI_DEPLOYMENT)
    else:
        logger.warning("Azure OpenAI: NOT CONFIGURED")

    # Azure Speech
    if config.AZURE_SPEECH_KEY:
        logger.info("Azure Speech: OK (region=%s)", config.AZURE_SPEECH_REGION)
    else:
        logger.warning("Azure Speech: NOT CONFIGURED")

    # Cosmos DB
    if config.COSMOS_ENDPOINT and config.COSMOS_KEY:
        logger.info("Cosmos DB: OK (db=%s)", config.COSMOS_DATABASE)
    else:
        logger.warning("Cosmos DB: NOT CONFIGURED")

    # Azure Blob Storage
    if config.AZURE_STORAGE_CONNECTION_STRING:
        logger.info("Azure Blob Storage: OK")
    else:
        logger.warning("Azure Blob Storage: NOT CONFIGURED")

    # Google Calendar
    if config.GOOGLE_CLIENT_ID and config.GOOGLE_REFRESH_TOKEN:
        logger.info("Google Calendar: OK (client=%s...)", config.GOOGLE_CLIENT_ID[:20])
    else:
        logger.warning("Google Calendar: NOT CONFIGURED")

    # Gmail
    if config.GOOGLE_CLIENT_ID and config.GOOGLE_REFRESH_TOKEN:
        logger.info("Gmail: OK (uses same Google OAuth credentials)")
    else:
        logger.warning("Gmail: NOT CONFIGURED")

    # Weather
    if config.OPENWEATHERMAP_API_KEY:
        logger.info("Weather: OK (OpenWeatherMap)")
    else:
        logger.warning("Weather: NOT CONFIGURED")

    logger.info("=== Startup Complete ===")


@app.get("/")
async def root():
    return {"name": "Jarvis", "status": "running"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.get("/guthib")
async def health_check():
    return {"status": "you spelled it wrong"}



if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
