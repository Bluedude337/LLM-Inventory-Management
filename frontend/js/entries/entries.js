/* ============================================
   GLOBAL STATE (DO NOT TOUCH OUTSIDE FUNCTIONS)
   ============================================ */

let ENTRIES_DATA = [];      // Original, untouched
let FILTERS = {};           // Active filters

/* ============================================
   LOAD PAGE
   ============================================ */

async function loadEntriesPage() {
    fetch("js/entries/entries.html")
        .then(r => r.text())
        .then(html => {
            document.getElementById("contentArea").innerHTML = html;
            loadEntries();
        });
}

/* ============================================
   FETCH DATA
   ============================================ */

async function loadEntries() {
    const container = document.getElementById("entriesContainer");

    try {
        const res = await fetch("/api/entries/");
        if (!res.ok) throw new Error("Failed loading entries");

        const data = await res.json();
        ENTRIES_DATA = data.entries || [];

        resetFilters();        // Clean start
        renderTable();         // Draw UI

    } catch (err) {
        console.error(err);
        container.innerHTML = `<div style="color:red;">Failed to load entries.</div>`;
    }
}

/* ============================================
   RESET FILTERS (used when clearing inputs)
   ============================================ */

function resetFilters() {
    FILTERS = {
        text: {
            id: "",
            received_at: ""
        },
        dropdown: {
            po_number: "",
            supplier_name: "",
            product_code: "",
            description: ""
        }
    };
}

/* ============================================
   MAIN FILTER PIPELINE (Core Engine)
   ============================================ */

function applyAllFilters() {
    let result = [...ENTRIES_DATA];

    // TEXT FILTERS
    Object.entries(FILTERS.text).forEach(([field, value]) => {
        if (value.trim() !== "") {
            result = result.filter(row =>
                String(row[field] || "")
                    .toLowerCase()
                    .includes(value.toLowerCase())
            );
        }
    });

    // DROPDOWNS
    Object.entries(FILTERS.dropdown).forEach(([field, value]) => {
        if (value !== "" && value !== null) {
            result = result.filter(row => String(row[field]) === String(value));
        }
    });

    return result;
}

/* ============================================
   RENDER TABLE + HEADER FILTERS
   ============================================ */

function renderTable() {
    const data = applyAllFilters();
    const container = document.getElementById("entriesContainer");

    // Build dropdown options from the **filtered dataset**, not raw
    const supplierList = [...new Set(ENTRIES_DATA.map(e => e.supplier_name || e.supplier_cnpj))];
    const productList = [...new Set(ENTRIES_DATA.map(e => e.product_code))];
    const descList = [...new Set(ENTRIES_DATA.map(e => e.description))];
    const poList = [...new Set(ENTRIES_DATA.map(e => e.po_number))];

    container.innerHTML = `
        <table>
            <thead>
                <tr>

                    <th>
                        ID<br>
                        <input class="filter-input"
                               data-field="id"
                               value="${FILTERS.text.id}"
                               oninput="onTextFilterChange(event)">
                    </th>

                    <th>
                        Date<br>
                        <input class="filter-input"
                               data-field="received_at"
                               value="${FILTERS.text.received_at}"
                               oninput="onTextFilterChange(event)">
                    </th>

                    <th>
                        PO Number<br>
                        ${buildDropdown("po_number", poList)}
                    </th>

                    <th>
                        Supplier<br>
                        ${buildDropdown("supplier_name", supplierList)}
                    </th>

                    <th>
                        Product<br>
                        ${buildDropdown("product_code", productList)}
                    </th>

                    <th>
                        Description<br>
                        ${buildDropdown("description", descList)}
                    </th>

                    <th>Unit</th>
                    <th>Qty</th>
                    <th>Unit Cost</th>
                    <th>Total</th>
                </tr>
            </thead>

            <tbody>
                ${data.map(row => rowHTML(row)).join("")}
            </tbody>
        </table>
    `;
}

/* ============================================
   DROPDOWN BUILDER
   ============================================ */

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

/* ============================================
   TEXT FILTER HANDLER
   ============================================ */

function onTextFilterChange(e) {
    const field = e.target.dataset.field;
    FILTERS.text[field] = e.target.value;
    renderTable();
}

/* ============================================
   DROPDOWN FILTER HANDLER
   ============================================ */

function onDropdownChange(field, value) {
    FILTERS.dropdown[field] = value;
    renderTable();
}

/* ============================================
   TABLE ROW TEMPLATE
   ============================================ */

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

/* ============================================
   BRAZILIAN DATE FORMAT
   ============================================ */

function formatDateBR(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

/* ============================================
   EXPORT TO EXCEL
   ============================================ */

function exportEntriesToExcel() {
    window.open("/api/entries/export", "_blank");
}
