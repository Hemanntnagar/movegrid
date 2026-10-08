import asyncio
from datetime import datetime, timedelta, timezone

import bcrypt
from jose import JWTError, jwt

from app.core.config import settings

# Cost 10 is OWASP-acceptable and ~4× faster than passlib's default 12.
_BCRYPT_ROUNDS = 10


def hash_password(password: str) -> str:
    return bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt(rounds=_BCRYPT_ROUNDS),
    ).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def password_needs_rehash(hashed: str) -> bool:
    """True when an older higher-cost (or non-bcrypt) hash should be upgraded."""
    try:
        parts = hashed.split("$")
        # $2b$12$... → parts[2] is the cost factor
        return int(parts[2]) != _BCRYPT_ROUNDS
    except (IndexError, ValueError):
        return True


async def hash_password_async(password: str) -> str:
    """Run bcrypt off the event loop so login/register stay responsive."""
    return await asyncio.to_thread(hash_password, password)


async def verify_password_async(password: str, hashed: str) -> bool:
    return await asyncio.to_thread(verify_password, password, hashed)


def create_access_token(subject: str) -> str:
    expires = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    return jwt.encode({"sub": subject, "exp": expires}, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_subject(token: str) -> str | None:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm]).get("sub")
    except JWTError:
        return None
