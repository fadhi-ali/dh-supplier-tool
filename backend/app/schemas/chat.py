from uuid import UUID

from pydantic import BaseModel


class ChatRequest(BaseModel):
    supplier_id: UUID
    message: str
    current_step: int


class ChatResponse(BaseModel):
    message: str
