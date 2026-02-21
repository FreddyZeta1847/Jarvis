import logging

import httpx

from app import config

logger = logging.getLogger(__name__)

BASE_URL = "https://api.openweathermap.org"


def _get_api_key() -> str:
    key = config.OPENWEATHERMAP_API_KEY
    if not key:
        raise RuntimeError("OPENWEATHERMAP_API_KEY not configured")
    return key


async def get_current_weather(lat: float, lon: float) -> dict:
    """Get current weather for coordinates. Returns dict with temp, description, icon, city, feels_like."""
    logger.info("Fetching current weather for lat=%.4f, lon=%.4f", lat, lon)
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{BASE_URL}/data/2.5/weather",
            params={
                "lat": lat,
                "lon": lon,
                "appid": _get_api_key(),
                "units": "metric",
                "lang": "en",
            },
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()

    city = data.get("name", "")
    weather = data["weather"][0]
    result = {
        "temp": round(data["main"]["temp"]),
        "feels_like": round(data["main"]["feels_like"]),
        "temp_min": round(data["main"]["temp_min"]),
        "temp_max": round(data["main"]["temp_max"]),
        "humidity": data["main"]["humidity"],
        "description": weather["description"],
        "icon": weather["icon"],
        "city": city,
        "wind_speed": data.get("wind", {}).get("speed", 0),
    }
    logger.info("Current weather for %s: %s, %d°C", city, weather["description"], result["temp"])
    return result


async def get_forecast(lat: float, lon: float, days: int = 5) -> list[dict]:
    """Get multi-day forecast. Returns list of daily summaries."""
    logger.info("Fetching %d-day forecast for lat=%.4f, lon=%.4f", days, lat, lon)
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{BASE_URL}/data/2.5/forecast",
            params={
                "lat": lat,
                "lon": lon,
                "appid": _get_api_key(),
                "units": "metric",
                "lang": "en",
            },
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()

    # Group 3-hour slots by date, pick midday (12:00) or first available per day
    daily: dict[str, dict] = {}
    for item in data["list"]:
        date = item["dt_txt"].split(" ")[0]
        if date not in daily:
            daily[date] = item
        elif "12:00:00" in item["dt_txt"]:
            daily[date] = item

    result = []
    for date, item in list(daily.items())[:days]:
        weather = item["weather"][0]
        result.append({
            "date": date,
            "temp": round(item["main"]["temp"]),
            "temp_min": round(item["main"]["temp_min"]),
            "temp_max": round(item["main"]["temp_max"]),
            "humidity": item["main"]["humidity"],
            "description": weather["description"],
            "icon": weather["icon"],
            "wind_speed": item.get("wind", {}).get("speed", 0),
        })

    logger.info("Forecast returned %d days of data", len(result))
    return result


async def geocode_city(city: str) -> dict:
    """Geocode a city name to lat/lon. Returns dict with lat, lon, name, country."""
    logger.info("Geocoding city: %s", city)
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{BASE_URL}/geo/1.0/direct",
            params={
                "q": city,
                "limit": 1,
                "appid": _get_api_key(),
            },
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()

    if not data:
        logger.warning("City not found: %s", city)
        raise ValueError(f"City not found: {city}")

    result = {
        "lat": data[0]["lat"],
        "lon": data[0]["lon"],
        "name": data[0].get("name", city),
        "country": data[0].get("country", ""),
    }
    logger.info("Geocoded %s → %s (%s), lat=%.4f, lon=%.4f", city, result["name"], result["country"], result["lat"], result["lon"])
    return result


async def get_weather_by_city(city: str) -> dict:
    """Geocode a city name then get current weather."""
    location = await geocode_city(city)
    weather = await get_current_weather(location["lat"], location["lon"])
    weather["city"] = location["name"]
    return weather
