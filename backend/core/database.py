import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "inventory.db")

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def initialize_database():
    conn = get_connection()
    cur = conn.cursor()

    # Create users table
    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Create products table
    cur.execute("""
        CREATE TABLE IF NOT EXISTS products (
            code TEXT PRIMARY KEY,
            category TEXT NOT NULL,
            subcategory TEXT,
            description TEXT NOT NULL,
            unit TEXT NOT NULL,
            stock INTEGER NOT NULL DEFAULT 0
        )
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS suppliers (
      cnpj TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT,
      neighborhood TEXT,
      city TEXT,
      state TEXT,
      cep TEXT,
      seller TEXT,
      cellphone TEXT,
      pix TEXT
    )
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS purchase_orders (
        po_number INTEGER PRIMARY KEY AUTOINCREMENT,
        po_code TEXT UNIQUE,

        -- Supplier
        supplier_cnpj TEXT NOT NULL,
        supplier_name TEXT,
        supplier_address TEXT,
        supplier_neighborhood TEXT,
        supplier_city TEXT,
        supplier_state TEXT,
        supplier_cep TEXT,
        supplier_pix TEXT,
        supplier_contact TEXT,

        -- Buyer
        buyer_cnpj TEXT,
        buyer_name TEXT,
        buyer_address TEXT,
        buyer_neighborhood TEXT,
        buyer_city TEXT,
        buyer_state TEXT,
        buyer_cep TEXT,
        buyer_pix TEXT,
        buyer_contact TEXT,

        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'OPEN',
        notes TEXT
    )
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS po_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      po_number INTEGER NOT NULL,
      item_code TEXT,
      description TEXT,
      unit TEXT,
      qty INTEGER,
      unit_price REAL,
      line_total REAL,
      FOREIGN KEY (po_number) REFERENCES purchase_orders(po_number)
    )
    """)


    conn.commit()
    conn.close()