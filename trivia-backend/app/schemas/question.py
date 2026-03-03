from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class QuestionCreate(BaseModel):
    category: str
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_answer: str  # A, B, C, D
    difficulty: str  # easy, medium, hard


class QuestionResponse(QuestionCreate):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class QuestionWithoutAnswer(BaseModel):
    id: int
    category: str
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    difficulty: str

    class Config:
        from_attributes = True
