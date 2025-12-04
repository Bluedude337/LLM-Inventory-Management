📁 1. PROJECT STRUCTURE (TOP LEVEL)
LLM Inventory Management/
│
├── backend/
│   ├── core/
│   │   └── database.py
│   ├── data/
│   │   └── inventory.db
│   ├── routers/
│   │   ├── auth.py
│   │   ├── entries.py
│   │   ├── exits.py
│   │   ├── exits_print.py
│   │   ├── pages.py
│   │   ├── po.py
│   │   ├── products.py
│   │   └── suppliers.py
│   ├── services/
│   │   ├── auth_service.py
│   │   ├── exits_service.py
│   │   ├── po_service.py
│   │   └── product_service.py
│   ├── static/
│   │   ├── PURCHASE_ORDER_template/
│   │   ├── landing.html
│   │   ├── logo.png
│   │   └── suppliers.css
│   ├── check_users.py
│   └── main.py
│
├── frontend/
│   ├── assets/
│   │   ├── EXITS-MODEL.png
│   │   ├── logo.png
│   │   └── po_template.png
│   ├── css/
│   │   └── main.css
│   ├── js/
│   │   ├── utils.js
│   │   ├── main.js
│   │   ├── entries/
│   │   │   ├── entries.html
│   │   │   └── entries.js
│   │   ├── exits/
│   │   │   ├── exits.html
│   │   │   └── exits.js
│   │   ├── inventory/
│   │   │   ├── inventory.html
│   │   │   └── inventory.js
│   │   ├── po/
│   │   │   ├── po_create.html
│   │   │   ├── po_create.js
│   │   │   ├── po_list.html
│   │   │   ├── po_list.js
│   │   │   ├── po_view.html
│   │   │   └── po_view.js
│   │   ├── suppliers/
│   │   │   ├── suppliers.html
│   │   │   └── suppliers.js
│   │   └── dashboard.html
│   │
├── requirements.txt
└── text.text

🧩 2. FEATURE-LEVEL RELATION TABLE

This determines EXACTLY where code lives, how features connect, and where updates must go.

🔐 AUTHENTICATION
Layer	File
Frontend	frontend/js/main.js
Router	backend/routers/auth.py
Service	backend/services/auth_service.py
Helpers	backend/check_users.py
DB	backend/data/inventory.db

Rules:

All login/validation logic lives in auth_service.py.

Any new user-related routes go into routers/auth.py.

📦 INVENTORY MODULE
Inventory View
Layer	File
Frontend	inventory/inventory.html, inventory.js
Router	routers/products.py
Service	product_service.py
DB	products table
➕ ENTRIES (ENTRADAS)
Layer	File
Frontend	entries/entries.html, entries.js
Router	routers/entries.py
Service	If needed, reuse or create entries_service.py (currently not present)
DB	entries table
➖ EXITS (SAÍDAS)
Layer	File
Frontend	exits/exits.html, exits.js
Router	routers/exits.py
Service	services/exits_service.py
DB	exits table
Exit Print
Layer	File
Backend Renderer	routers/exits_print.py
Template	static/ models (EXITS-MODEL.png, etc.)
🧾 PURCHASE ORDERS (PO)
Create PO
Layer	File
Frontend	po/po_create.html, po_create.js
Router	routers/po.py
Service	po_service.py
Static	backend/static/PURCHASE_ORDER_template/
List PO
Layer	File
Frontend	po_list.html, po_list.js
Router	routers/po.py
Service	po_service.py
View PO
Layer	File
Frontend	po_view.html, po_view.js
Router	routers/po.py
Service	po_service.py
🧑‍🤝‍🧑 SUPPLIERS
Supplier CRUD
Layer	File
Frontend	suppliers/suppliers.html, suppliers.js
Router	routers/suppliers.py
Service	product_service.py OR future supplier_service.py
DB	suppliers table
🧠 3. SYSTEM CONVENTIONS
Folder Responsibilities
backend/routers/

Defines API endpoints

Handles HTTP request/response

Should NOT contain business logic

backend/services/

Contains business rules

Communicates with database

Returns results to routers

backend/core/

Database connection / session management

backend/static/

HTML/CSS/PDF templates

Served directly or used for document generation

frontend/js/

Page logic

Fetch calls

DOM manipulation

frontend/js/<module>/

Each folder is one isolated feature

Every HTML has one JS pair

🔧 4. DEVELOPMENT RULES (VERY IMPORTANT)

These rules ensure future work stays clean and aligned with the rest of the system.

Rule 1 — Every new feature must include:

frontend/js/<feature>/<feature>.html

frontend/js/<feature>/<feature>.js

backend/routers/<feature>.py

backend/services/<feature>_service.py

Router import in backend/main.py

Rule 2 — No business logic inside routers

Routers must only:

Parse input

Call the correct service function

Return response

Rule 3 — All DB interaction happens inside services
Rule 4 — Frontend must NEVER call the DB directly

All data flows:

HTML/JS → Router → Service → DB → back to JS

Rule 5 — Naming conventions

Routers: plural.py (e.g., suppliers.py, products.py)

Services: <feature>_service.py

JS files: <feature>.js

HTML: <feature>.html

🔄 5. FEATURE CREATION TEMPLATE

When adding any new module:

1. Create frontend
frontend/js/<feature>/<feature>.html
frontend/js/<feature>/<feature>.js

2. Create router
backend/routers/<feature>.py

3. Create service
backend/services/<feature>_service.py

4. Register router in backend/main.py
app.include_router(<feature>_router)

5. Add DB table or extend existing ones
🧬 6. INTERNAL DEPENDENCY GRAPH (SIMPLIFIED)
frontend/js/* → backend/routers/* → backend/services/* → core/database → inventory.db