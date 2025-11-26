from backend.core.database import get_connection

conn = get_connection()
cur = conn.cursor()

cur.execute("SELECT id, username FROM users")
rows = cur.fetchall()

print(rows)