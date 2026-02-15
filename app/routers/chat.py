from typing import Literal

from fastapi import APIRouter, HTTPException
from openai import AsyncOpenAI
from pydantic import BaseModel, Field

from app.config import get_settings

router = APIRouter(prefix="/api", tags=["chat"])


class Message(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str = Field(min_length=1)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1)
    history: list[Message] = Field(default_factory=list)


class ChatResponse(BaseModel):
    reply: str


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    settings = get_settings()

    if not settings.openai_api_key:
        raise HTTPException(status_code=503, detail="OPENAI_API_KEY 未配置")

    client = AsyncOpenAI(api_key=settings.openai_api_key, base_url=settings.openai_base_url)
    messages = [*request.history, Message(role="user", content=request.message)]

    try:
        completion = await client.chat.completions.create(
            model=settings.model_name,
            messages=[item.model_dump() for item in messages],
            max_tokens=settings.max_tokens,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"上游调用失败: {exc}") from exc

    answer = completion.choices[0].message.content if completion.choices else ""
    if not answer:
        raise HTTPException(status_code=502, detail="上游空返回")

    return ChatResponse(reply=answer)
