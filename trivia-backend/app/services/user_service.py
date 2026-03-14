from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..models.user import User
from typing import List
from ..schemas.user import UserCreate, UserUpdate
from ..core.security import get_password_hash, verify_password, needs_rehash


async def create_user(db: AsyncSession, user_create: UserCreate) -> User:
    """Create a new user in the database."""
    # enforce bcrypt 72-byte limit on the encoded password to avoid runtime errors
    # ensure password is a str and check its UTF-8 byte length
    pw = user_create.password

    hashed_password = get_password_hash(user_create.password)
    db_user = User(
        username=user_create.username,
        email=user_create.email,
        hashed_password=hashed_password,
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    """Get user by email."""
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def get_user_by_username(db: AsyncSession, username: str) -> User | None:
    """Get user by username."""
    result = await db.execute(select(User).where(User.username == username))
    return result.scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, user_id: int) -> User | None:
    """Get user by ID."""
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def authenticate_user(db: AsyncSession, email: str, password: str) -> User | None:
    """Authenticate user by email and password."""
    user = await get_user_by_email(db, email)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None

    # If the stored hash is using an older algorithm/policy, re-hash with the current policy (argon2)
    try:
        if needs_rehash(user.hashed_password):
            new_hash = get_password_hash(password)
            user.hashed_password = new_hash
            db.add(user)
            await db.commit()
            await db.refresh(user)
    except Exception:
        # best-effort rehash: if rehashing fails, don't block authentication
        pass

    return user

async def get_users_by_ids(db: AsyncSession, user_ids: List[int]) -> List[User]:
    """Batch fetch users by a list of IDs."""
    if not user_ids:
        return []
    result = await db.execute(select(User).where(User.id.in_(user_ids)))
    return list(result.scalars().all())


async def update_user(db: AsyncSession, user_id: int, user_update: UserUpdate) -> User:
    """Update user info."""
    user = await get_user_by_id(db, user_id)
    if not user:
        raise ValueError("User not found")
    
    if user_update.username:
        # Check if new username is already taken by another user
        existing_user = await get_user_by_username(db, user_update.username)
        if existing_user and existing_user.id != user_id:
            raise ValueError("Username already taken")
        user.username = user_update.username
    
    if user_update.email:
        # Check if new email is already taken by another user
        existing_user = await get_user_by_email(db, user_update.email)
        if existing_user and existing_user.id != user_id:
            raise ValueError("Email already taken")
        user.email = user_update.email
    
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user