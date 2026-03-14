from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


class UserBase(BaseModel):
    username: str
    email: EmailStr


class UserCreate(UserBase):
    # bcrypt has a 72-byte password input limit; enforce to avoid runtime errors
    password: str = Field(..., min_length=8, max_length=72)

class UserLogin(BaseModel):
    email: EmailStr
    # Allow login passwords up to bcrypt limit
    password: str = Field(..., max_length=72)

class UserResponse(UserBase):
    id: int
    is_admin: bool
    created_at: datetime
    profile_picture: Optional[str] = None
    coins: int

    class Config:
        from_attributes = True

class UserUpdate(UserBase):
    email: Optional[EmailStr] = None
    username: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenData(BaseModel):
    user_id: Optional[int] = None

class ProfilePictureUpdate(BaseModel):
    profile_picture: str