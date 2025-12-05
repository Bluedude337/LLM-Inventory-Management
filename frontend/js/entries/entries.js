/* ============================================
   ENTRIES MODULE — entries.js (AUTH READY)
============================================ */

let ENTRIES_DATA = [];
let FILTERS = {};

/* ===============================
   PAGE LOADER
=============================== */
async function loadEntriesPage() {
    fetch("js/entries/entries.html")
        .then(r => r.text())
        .then(html => {
            document.getElementById("contentArea").innerHTML = html;
            loadEntries();
        });
}

/* ===============================
   LOAD ENTRIES FROM BACKEND
=============================== */
async function loadEntries() {
    const container = document.getElementById("entriesContainer");

    try {
        const data = await apiGET("/api/entries/");
        if (!data) throw new Error("No response");

        ENTRIES_DATA = data.entries || [];

        resetFilters();
        renderTable();

    } catch (err) {
        console.error(err);
        container.innerHTML = `<div style="color:red;">Failed to load entries.</div>`;
    }
}

/* ===============================
   RESET FILTER STATE
=============================== */
function resetFilters() {
    FILTERS = {
        text: { id: "", received_at: "" },
        dropdown: {
            po_number: "",
            supplier_name: "",
            product_code: "",
            description: ""
        }
    };
}

/* ===============================
   FILTER ENGINE
=============================== */
function applyAllFilters() {
    let result = [...ENTRIES_DATA];

    // TEXT FILTERS
    Object.entries(FILTERS.text).forEach(([field, value]) => {
        if (value.trim()) {
            result = result.filter(row =>
                String(row[field] || "").toLowerCase().includes(value.toLowerCase())
            );
        }
    });

    // DROPDOWNS
    Object.entries(FILTERS.dropdown).forEach(([field, value]) => {
        if (value) {
            result = result.filter(row => String(row[field]) === String(value));
        }
    });

    return result;
}

/* ===============================
   TABLE RENDERING
=============================== */
function renderTable() {
    const data = applyAllFilters();
    const container = document.getElementById("entriesContainer");

    const supplierList = [...new Set(ENTRIES_DATA.map(e => e.supplier_name || e.supplier_cnpj))];
    const productList = [...new Set(ENTRIES_DATA.map(e => e.product_code))];
    const descList = [...new Set(ENTRIES_DATA.map(e => e.description))];
    const poList = [...new Set(ENTRIES_DATA.map(e => e.po_number))];

    container.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>ID<br><input class="filter-input" data-field="id"
                        value="${FILTERS.text.id}" oninput="onTextFilterChange(event)"></th>

                    <th>Date<br><input class="filter-input" data-field="received_at"
                        value="${FILTERS.text.received_at}" oninput="onTextFilterChange(event)"></th>

                    <th>PO<br>${buildDropdown("po_number", poList)}</th>
                    <th>Supplier<br>${buildDropdown("supplier_name", supplierList)}</th>
                    <th>Product<br>${buildDropdown("product_code", productList)}</th>
                    <th>Description<br>${buildDropdown("description", descList)}</th>

                    <th>Unit</th>
                    <th>Qty</th>
                    <th>Unit Cost</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>${data.map(rowHTML).join("")}</tbody>
        </table>
    `;
}

/* ===============================
   DROPDOWN
=============================== */
function buildDropdown(field, items) {
    return `
        <select class="filter-dropdown"
                onchange="onDropdownChange('${field}', this.value)">
            <option value="">All</option>
            ${items.map(v => `
                <option value="${v}" ${FILTERS.dropdown[field] == v ? "selected" : ""}>
                    ${v}
                </option>
            `).join("")}
        </select>
    `;
}

/* ===============================
   FILTER HANDLERS
=============================== */
function onTextFilterChange(e) {
    const field = e.target.dataset.field;
    FILTERS.text[field] = e.target.value;
    renderTable();
}

function onDropdownChange(field, value) {
    FILTERS.dropdown[field] = value;
    renderTable();
}

/* ===============================
   ROW TEMPLATE
=============================== */
function rowHTML(e) {
    return `
        <tr>
            <td>${e.id}</td>
            <td>${formatDateBR(e.received_at)}</td>
            <td>${e.po_number}</td>
            <td>${e.supplier_name || e.supplier_cnpj}</td>
            <td>${e.product_code}</td>
            <td>${e.description}</td>
            <td>${e.unit}</td>
            <td>${e.qty}</td>
            <td>R$ ${Number(e.unit_cost).toFixed(2)}</td>
            <td>R$ ${Number(e.line_total).toFixed(2)}</td>
        </tr>
    `;
}

/* ===============================
   DATE FORMAT
=============================== */
function formatDateBR(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleString("pt-BR", {
        day:"2-digit", month:"2-digit", year:"numeric",
        hour:"2-digit", minute:"2-digit"
    });
}

/* ===============================
   EXPORT
=============================== */
function exportEntriesToExcel() {
    window.open("/api/entries/export", "_blank");
}
