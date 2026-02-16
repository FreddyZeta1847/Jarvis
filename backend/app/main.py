from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router as api_router
from app.api.expense_routes import router as expense_router

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


@app.get("/")
async def root():
    return {"name": "Jarvis", "status": "running"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.get("/test-db")
async def test_db():
    try:
        from app.database.cosmos import get_expenses_container
        container = await get_expenses_container()
        items = []
        async for item in container.query_items(
            query="SELECT TOP 1 * FROM c", enable_cross_partition_query=True
        ):
            items.append(item)
        return {"status": "ok", "count": len(items)}
    except Exception as e:
        return {"status": "error", "detail": str(e), "type": type(e).__name__}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
