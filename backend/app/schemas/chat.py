from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class ChatHistoryMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    supplier_id: UUID
    message: str
    current_step: int
    history: Optional[list[ChatHistoryMessage]] = None


class ChatResponse(BaseModel):
    message: str
