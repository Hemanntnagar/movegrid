import bcrypt

from app.core.security import (
    create_access_token,
    decode_subject,
    hash_password,
    password_needs_rehash,
    verify_password,
)


def test_password_hash_and_token_round_trip():
    password = "safe-password"
    hashed = hash_password(password)
    assert verify_password(password, hashed)
    assert not password_needs_rehash(hashed)
    assert decode_subject(create_access_token("42")) == "42"


def test_legacy_bcrypt_cost_is_verified_and_flagged():
    password = "safe-password"
    legacy = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")
    assert verify_password(password, legacy)
    assert password_needs_rehash(legacy)
