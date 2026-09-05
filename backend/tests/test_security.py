from app.core.security import create_access_token, decode_subject, hash_password, verify_password

def test_password_hash_and_token_round_trip():
    password = "safe-password"
    assert verify_password(password, hash_password(password))
    assert decode_subject(create_access_token("42")) == "42"
