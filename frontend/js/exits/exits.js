/* =============================================================
   EXITS MODULE — Final Version with Table Headers + Description
============================================================= */

let EXITS_DATA = [];
let EXITS_FILTERED = [];
let EXIT_ITEM_ROWS = [];
let currentExitId = null;
let ALL_PRODUCTS = [];

/* =============================================================
   LOAD PAGE
============================================================= */
function loadExitsPage() {
    fetch("js/exits/exits.html")
        .then(r => r.text())
        .then(html => {
            document.getElementById("contentArea").innerHTML = html;
            loadExitsTable();
        })
        .catch(err => alert("Failed to load Exits module."));
}

/* =============================================================
   LOAD TABLE
============================================================= */
async function loadExitsTable() {
    try {
        const payload = await apiGET("/api/exits/list");
        EXITS_DATA = payload?.data || [];
        EXITS_FILTERED = [...EXITS_DATA];
        renderExitsTable();
    } catch (err) {
        console.error("Error loading exits:", err);
    }
}

/* =============================================================
   RENDER TABLE
============================================================= */
function renderExitsTable() {
    const tbody = document.getElementById("exitListBody");
    if (!tbody) return;

    if (EXITS_FILTERED.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:12px;">No exits found.</td></tr>`;
        return;
    }

    tbody.innerHTML = EXITS_FILTERED.map(e => `
        <tr>
            <td>${e.id}</td>
            <td>${e.exit_code}</td>
            <td>${formatDateBR(e.created_at)}</td>
            <td>${escapeHtml(e.destination)}</td>
            <td>${escapeHtml(e.created_by)}</td>
            <td><button class="btn ghost" onclick="viewExit(${e.id})">View</button></td>
        </tr>
    `).join("");
}

/* =============================================================
   FILTER TABLE
============================================================= */
function filterExits() {
    const inputs = document.querySelectorAll("thead .flt");
    const [idF, codeF, dateF, destF, createdF] = [...inputs].map(i => i.value.toLowerCase());

    EXITS_FILTERED = EXITS_DATA.filter(e =>
        (idF === "" || String(e.id).includes(idF)) &&
        (codeF === "" || String(e.exit_code).toLowerCase().includes(codeF)) &&
        (dateF === "" || formatDateBR(e.created_at).toLowerCase().includes(dateF)) &&
        (destF === "" || (e.destination || "").toLowerCase().includes(destF)) &&
        (createdF === "" || String(e.created_by).toLowerCase().includes(createdF))
    );

    renderExitsTable();
}

/* =============================================================
   OPEN MODAL
============================================================= */
async function openExitModal(readOnly = false) {
    const modal = document.getElementById("exitModal");
    modal.style.display = "flex";

    const addSection = document.getElementById("addItemSection");

    if (readOnly) {
        addSection.style.display = "none";
        document.getElementById("exitDestination").disabled = true;
        document.getElementById("exitNotes").disabled = true;
        return;
    }

    addSection.style.display = "block";
    EXIT_ITEM_ROWS = [];
    currentExitId = null;

    document.getElementById("exitDestination").disabled = false;
    document.getElementById("exitNotes").disabled = false;

    document.getElementById("exitDestination").value = "";
    document.getElementById("exitNotes").value = "";

    await loadProductsIntoDropdown();
    clearAddItemInputs();
    renderExitItemRows(false);
    renderModalFooter(false);
}

function closeExitModal() {
    document.getElementById("exitModal").style.display = "none";
}

/* =============================================================
   LOAD PRODUCTS (Dropdown shows description)
============================================================= */
async function loadProductsIntoDropdown() {
    try {
        const res = await apiGET("/api/products");
        ALL_PRODUCTS = res.products || [];

        const sel = document.getElementById("exitProductSelect");
        sel.innerHTML = `<option value="">Select product...</option>`;

        ALL_PRODUCTS.forEach(p => {
            sel.innerHTML += `
                <option value="${p.code}" title="${p.code} | Stock: ${p.stock}">
                    ${p.description}
                </option>
            `;
        });

        sel.onchange = updateAddItemFields;
    } catch (err) {
        alert("Unable to load products.");
        console.error(err);
    }
}

/* =============================================================
   UPDATE FIELDS WHEN PRODUCT SELECTED
============================================================= */
function updateAddItemFields() {
    const code = document.getElementById("exitProductSelect").value;
    const p = ALL_PRODUCTS.find(prod => prod.code === code);

    if (!p) return clearAddItemInputs();

    document.getElementById("exitCode").value = p.code;
    document.getElementById("exitStock").value = p.stock;
}

function clearAddItemInputs() {
    document.getElementById("exitProductSelect").value = "";
    document.getElementById("exitCode").value = "";
    document.getElementById("exitStock").value = "";
    document.getElementById("exitQty").value = "";
}

/* =============================================================
   ADD ITEM
============================================================= */
function addExitItem() {
    const code = document.getElementById("exitProductSelect").value;
    const qty = Number(document.getElementById("exitQty").value);

    const p = ALL_PRODUCTS.find(prod => prod.code === code);
    if (!p) return alert("Select a product.");
    if (!qty || qty <= 0) return alert("Enter a valid qty.");
    if (qty > p.stock) return alert("Quantity exceeds stock.");

    EXIT_ITEM_ROWS.push({
        product_code: p.code,
        description: p.description,
        unit: p.unit,
        qty
    });

    clearAddItemInputs();
    renderExitItemRows(false);
}

/* =============================================================
   RENDER ITEMS ADDED
============================================================= */
function renderExitItemRows(readOnly = false) {
    const area = document.getElementById("exitItemsContainer");

    if (!EXIT_ITEM_ROWS.length) {
        area.innerHTML = `<div style="text-align:center; opacity:0.6;">No items added.</div>`;
        return;
    }

    area.innerHTML = EXIT_ITEM_ROWS.map(r => `
        <div style="
            display:grid;
            grid-template-columns: 1fr 120px 90px 90px;
            gap:10px;
            margin-bottom:6px;
        ">
            <input class="modal-input" value="${escapeHtml(r.description)}" disabled>
            <input class="modal-input" value="${r.product_code}" disabled>
            <input class="modal-input" value="${r.unit}" disabled>
            <input class="modal-input" value="${r.qty}" disabled>
        </div>
    `).join("");
}

/* =============================================================
   SAVE EXIT
============================================================= */
async function saveExit() {
    const dest = document.getElementById("exitDestination").value.trim();
    const notes = document.getElementById("exitNotes").value.trim();

    if (!dest) return alert("Destination required.");
    if (!EXIT_ITEM_ROWS.length) return alert("Add at least one item.");

    try {
        await apiPOST("/api/exits/create", {
            destination: dest,
            notes,
            items: EXIT_ITEM_ROWS.map(i => ({
                product_code: i.product_code,
                qty: i.qty
            }))
        });

        alert("Exit created!");
        closeExitModal();
        loadExitsPage();
    } catch (err) {
        console.error(err);
        alert("Error saving exit.");
    }
}

/* =============================================================
   VIEW EXIT
============================================================= */
async function viewExit(id) {
    try {
        const payload = await apiGET(`/api/exits/${id}`);
        currentExitId = id;

        openExitModal(true);

        document.getElementById("exitDestination").value = payload.exit.destination;
        document.getElementById("exitNotes").value = payload.exit.notes || "";

        EXIT_ITEM_ROWS = payload.items.map(i => ({
            product_code: i.product_code,
            description: i.description,
            unit: i.unit,
            qty: i.qty
        }));

        renderExitItemRows(true);
        renderModalFooter(true);
    } catch (err) {
        console.error(err);
        alert("Unable to load exit details.");
    }
}

/* =============================================================
   FOOTER BUTTONS
============================================================= */
function renderModalFooter(readOnly) {
    const f = document.getElementById("exitModalFooter");

    if (readOnly) {
        f.innerHTML = `
            <button class="btn ghost" onclick="closeExitModal()">Close</button>
            <button class="btn" onclick="downloadExitPDF(${currentExitId})">Print PDF</button>
        `;
    } else {
        f.innerHTML = `
            <button class="btn ghost" onclick="closeExitModal()">Cancel</button>
            <button class="btn" onclick="saveExit()">Save Exit</button>
        `;
    }
}

/* =============================================================
   PDF
============================================================= */
async function downloadExitPDF(id) {
    try {
        const res = await authFetch(`/api/exits-print/${id}/pdf/`);
        const blob = await res.blob();
        window.open(URL.createObjectURL(blob));
    } catch (err) {
        alert("PDF failed.");
    }
}

/* =============================================================
   UTILITIES
============================================================= */
function formatDateBR(d) {
    return new Date(d).toLocaleString("pt-BR");
}

function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"]/g, c =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
    );
}
