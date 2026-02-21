from fastapi import APIRouter, Depends, HTTPException, Query

from app.auth.jwt import get_current_user
from app.services.weather import get_current_weather

router = APIRouter()


@router.get("/weather")
async def weather(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    user: dict = Depends(get_current_user),
):
    try:
        data = await get_current_weather(lat, lon)
        return data
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
