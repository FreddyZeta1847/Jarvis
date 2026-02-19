from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from datetime import timedelta
import httpx

from app import config
from app.auth.password import verify_password
from app.auth.jwt import create_access_token, get_current_user

router = APIRouter()


# ============================================
# REQUEST/RESPONSE MODELS (data validation)
# ============================================

class LoginRequest(BaseModel):
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class MessageRequest(BaseModel):
    message: str


class MessageResponse(BaseModel):
    text: str
    agent: str | None = None


class SpeechTokenResponse(BaseModel):
    token: str
    region: str


# ============================================
# PUBLIC ROUTES (no auth required)
# ============================================

@router.post("/auth/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """
    Login endpoint - returns JWT token if password is correct.

    Flow:
    1. Frontend sends: POST /api/auth/login {password: "xxx"}
    2. We verify password against hash in .env
    3. If correct → create JWT token and return it
    4. Frontend stores token in localStorage
    """
    if not config.PASSWORD_HASH:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password not configured in .env"
        )

    if not verify_password(request.password, config.PASSWORD_HASH):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid password"
        )

    # Create token - frontend will store this and send with every request
    access_token = create_access_token(
        data={"sub": "jarvis_user"},
        expires_delta=timedelta(minutes=config.JWT_EXPIRE_MINUTES)
    )

    return LoginResponse(access_token=access_token)


# ============================================
# PROTECTED ROUTES (auth required)
# ============================================
#
# Notice: Depends(get_current_user) in the function parameters
# This is the MIDDLEWARE - it runs BEFORE the route function:
#   1. Extracts token from "Authorization: Bearer xxx" header
#   2. Verifies the token
#   3. If invalid → returns 401, route function never runs
#   4. If valid → route function runs, 'user' contains token payload
#
# Same as Express.js:
#   router.get('/chat', checkAuth, (req, res) => { ... })
# ============================================

@router.get("/speech-token", response_model=SpeechTokenResponse)
async def get_speech_token(
    user: dict = Depends(get_current_user)
):
    """
    Get Azure Speech token for browser SDK.
    Token is valid for 10 minutes.
    Protected: requires valid JWT token.
    """
    if not config.AZURE_SPEECH_KEY or not config.AZURE_SPEECH_REGION:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Azure Speech not configured"
        )

    # Request token from Azure
    token_url = f"https://{config.AZURE_SPEECH_REGION}.api.cognitive.microsoft.com/sts/v1.0/issueToken"

    async with httpx.AsyncClient() as client:
        response = await client.post(
            token_url,
            headers={
                "Ocp-Apim-Subscription-Key": config.AZURE_SPEECH_KEY,
                "Content-Type": "application/x-www-form-urlencoded"
            }
        )

        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Failed to get speech token from Azure"
            )

        return SpeechTokenResponse(
            token=response.text,
            region=config.AZURE_SPEECH_REGION
        )


@router.post("/chat", response_model=MessageResponse)
async def chat(
    request: MessageRequest,
    user: dict = Depends(get_current_user)
):
    """
    Chat endpoint - send message, get AI response.
    Protected: requires valid JWT token.
    """
    from app.agents.orchestrator import send_message

    try:
        response_text = await send_message(request.message)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

    return MessageResponse(text=response_text, agent="jarvis")


@router.get("/conversations")
async def get_conversations(
    user: dict = Depends(get_current_user)  # ← MIDDLEWARE: verify token first
):
    """
    Get conversation history.
    Protected: requires valid JWT token.
    """
    # TODO: Implement Cosmos DB
    return {"conversations": []}


@router.get("/agents/status")
async def get_agent_status(
    user: dict = Depends(get_current_user)  # ← MIDDLEWARE: verify token first
):
    """
    Get status of all agents.
    Protected: requires valid JWT token.
    """
    return {
        "orchestrator": "ready",
        "agents": [
            {"name": "calendar", "status": "available"},
            {"name": "gmail", "status": "available"},
            {"name": "weather", "status": "available"},
            {"name": "web_search", "status": "available"},
            {"name": "expenses", "status": "available"}
        ]
    }
