from passlib.context import CryptContext
from backend.core.database import get_connection

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_user(username: str, password: str):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO users (username, password_hash)
        VALUES (?, ?)
    """, (username, hash_password(password)))

    conn.commit()
    conn.close()

def get_user(username: str):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT id, username, password_hash FROM users WHERE username = ?", (username,))
    row = cur.fetchone()
    conn.close()

    return row