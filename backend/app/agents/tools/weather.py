from typing import Annotated

from agent_framework import tool

from app.services.weather import (
    get_current_weather,
    get_weather_by_city,
    get_forecast,
    geocode_city,
)


@tool(approval_mode="never_require")
async def get_current_weather_tool(
    location: Annotated[str, "City name (e.g. 'Rome') or coordinates as 'lat,lon' (e.g. '41.9,12.5')"],
) -> str:
    """Get current weather conditions for a location. Supports city names or lat,lon coordinates."""
    try:
        # Check if coordinates were passed
        if "," in location:
            parts = location.split(",")
            if len(parts) == 2:
                try:
                    lat, lon = float(parts[0].strip()), float(parts[1].strip())
                    data = await get_current_weather(lat, lon)
                except ValueError:
                    data = await get_weather_by_city(location)
            else:
                data = await get_weather_by_city(location)
        else:
            data = await get_weather_by_city(location)
    except ValueError as e:
        return str(e)
    except Exception as e:
        return f"Failed to get weather: {e}"

    return (
        f"Current weather in {data['city']}: {data['description']}, "
        f"temperature {data['temp']} degrees Celsius "
        f"(feels like {data['feels_like']}), "
        f"humidity {data['humidity']}%, "
        f"wind {data['wind_speed']} m/s."
    )


@tool(approval_mode="never_require")
async def get_weather_forecast_tool(
    location: Annotated[str, "City name (e.g. 'Rome') or coordinates as 'lat,lon' (e.g. '41.9,12.5')"],
    days: Annotated[int, "Number of days to forecast (1-5)"] = 3,
) -> str:
    """Get a multi-day weather forecast for a location."""
    days = max(1, min(days, 5))

    try:
        if "," in location:
            parts = location.split(",")
            if len(parts) == 2:
                try:
                    lat, lon = float(parts[0].strip()), float(parts[1].strip())
                except ValueError:
                    geo = await geocode_city(location)
                    lat, lon = geo["lat"], geo["lon"]
            else:
                geo = await geocode_city(location)
                lat, lon = geo["lat"], geo["lon"]
        else:
            geo = await geocode_city(location)
            lat, lon = geo["lat"], geo["lon"]

        forecast = await get_forecast(lat, lon, days=days)
    except ValueError as e:
        return str(e)
    except Exception as e:
        return f"Failed to get forecast: {e}"

    if not forecast:
        return "No forecast data available."

    lines = [f"Weather forecast for the next {len(forecast)} days:"]
    for day in forecast:
        lines.append(
            f"{day['date']}: {day['description']}, "
            f"{day['temp_min']} to {day['temp_max']} degrees, "
            f"humidity {day['humidity']}%, wind {day['wind_speed']} m/s"
        )

    return " ".join(lines)
