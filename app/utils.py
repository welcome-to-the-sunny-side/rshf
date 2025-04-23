import hashlib, os, base64

def hash_password(password: str) -> str:
    salt = os.urandom(16)
    h = hashlib.sha256(salt + password.encode()).digest()
    return base64.b64encode(salt + h).decode()

def verify_password(password: str, hashed: str) -> bool:
    data = base64.b64decode(hashed.encode())
    salt, true_hash = data[:16], data[16:]
    test_hash = hashlib.sha256(salt + password.encode()).digest()
    return test_hash == true_hash
