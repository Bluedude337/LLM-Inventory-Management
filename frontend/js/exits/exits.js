/* ============================================
   EXITS MODULE — exits.js
   ============================================ */

let EXITS_DATA = [];
let EXIT_ITEM_ROWS = [];
let currentExitId = null;
let EXITS_FILTERED = [];


/* ============================
   PAGE LOADER
   ============================ */

function loadExitsPage() {
    fetch("js/exits/exits.html")
        .then(r => r.text())
        .then(html => {
            document.getElementById("contentArea").innerHTML = html;
            loadExitsTable();
        });
}

/* ============================
   LOAD EXITS TABLE
   ============================ */

async function loadExitsTable() {
    const box = document.getElementById("exitListBody") || document.getElementById("exitsContainer");

    try {
        const res = await fetch("/api/exits/list");
        const payload = await res.json();
        EXITS_DATA = payload.data || payload || [];
        EXITS_FILTERED = EXITS_DATA.slice();

        renderExitsTable();

    } catch {
        box.innerHTML = `<div style="color:red;">Failed loading exits.</div>`;
    }
}

function renderExitsTable() {
    const tbody = document.getElementById("exitListBody");
    if (!tbody) return;

    if (!EXITS_FILTERED.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center; padding:12px;">
                    No exits found.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = EXITS_FILTERED.map(e => `
        <tr>
            <td>${e.id}</td>
            <td>${e.exit_code || ""}</td>
            <td>${formatDateBR(e.created_at)}</td>
            <td>${e.destination}</td>
            <td>${e.created_by || ""}</td>
            <td>
                <button class="btn ghost" onclick="viewExit(${e.id})">View</button>
            </td>
        </tr>
    `).join("");
}

function exitRowHTML(e) {
    return `
        <tr>
            <td>${e.id}</td>
            <td>${e.exit_code || ""}</td>
            <td>${formatDateBR(e.created_at)}</td>
            <td>${e.destination}</td>
            <td>${e.created_by || ""}</td>
            <td>
                <button class="btn ghost" onclick="viewExit(${e.id})">View</button>
            </td>
        </tr>
    `;
}

/* ============================
   VIEW EXIT
   ============================ */

async function viewExit(id) {
    try {
        const res = await fetch(`/api/exits/${id}`);
        const payload = await res.json();
        const details = payload.data || payload;

        currentExitId = id;

        // Open in READ-ONLY MODE
        openExitModal(true);

        // Fill data
        document.getElementById("exitDestination").value = details.exit.destination;
        document.getElementById("exitNotes").value = details.exit.notes || "";
        document.getElementById("exitCreatedBy").value = details.exit.created_by || "";

        // 🔒 LOCK ALL TOP FIELDS
        document.getElementById("exitDestination").disabled = true;
        document.getElementById("exitNotes").disabled = true;
        document.getElementById("exitCreatedBy").disabled = true;

        // Fill items (read-only)
        EXIT_ITEM_ROWS = details.items.map(i => ({
            id: "readonly_" + Date.now(),
            code: i.product_code,
            description: i.description,
            unit: i.unit,
            stock: "",
            qty: i.qty
        }));

        // Render items in read-only mode
        renderExitItemRows(true);

        // Footer = CLOSE + PRINT PDF
        renderModalFooter(true);

    } catch (err) {
        alert("Unable to load exit details.");
    }
}

/* ============================
   MODAL CONTROL
   ============================ */

function openExitModal(readOnly = false) {
    const m = document.getElementById("exitModal");

    if (!readOnly) {

        // Unlock all fields for creating new exit
        document.getElementById("exitDestination").disabled = false;
        document.getElementById("exitNotes").disabled = false;
        document.getElementById("exitCreatedBy").disabled = false;

        EXIT_ITEM_ROWS = [];
        document.getElementById("exitDestination").value = "";
        document.getElementById("exitNotes").value = "";
        document.getElementById("exitCreatedBy").value = "";
        renderExitItemRows();
        renderModalFooter(false);
    }

    m.style.display = "flex";
}

function closeExitModal() {
    document.getElementById("exitModal").style.display = "none";
}

function renderModalFooter(readOnly) {
    const footer = document.getElementById("exitModalFooter");

    if (readOnly) {
        footer.innerHTML = `
            <button class="btn ghost" onclick="closeExitModal()">Close</button>
            <button class="btn" onclick="printExitPDF(${currentExitId})">Print PDF</button>
        `;
    } else {
        footer.innerHTML = `
            <button class="btn ghost" onclick="closeExitModal()">Cancel</button>
            <button class="btn" onclick="saveExit()">Save Exit</button>
        `;
    }
}

/* ============================
   ITEM ROWS
   ============================ */

function addExitItemRow() {
    const id = "exititem_" + Date.now();

    EXIT_ITEM_ROWS.push({
        id,
        code: "",
        description: "",
        unit: "",
        stock: "",
        qty: 1
    });

    renderExitItemRows();
}

function removeExitItemRow(id) {
    EXIT_ITEM_ROWS = EXIT_ITEM_ROWS.filter(r => r.id !== id);
    renderExitItemRows();
}

function updateExitCode(id, value) {
    EXIT_ITEM_ROWS = EXIT_ITEM_ROWS.map(r =>
        r.id === id ? { ...r, code: value } : r
    );
}

function updateExitQty(id, value) {
    EXIT_ITEM_ROWS = EXIT_ITEM_ROWS.map(r =>
        r.id === id ? { ...r, qty: Number(value) } : r
    );
}

async function autoFillExitItem(id) {
    const code = document.getElementById(`${id}_code`).value.trim();
    if (!code) return;

    try {
        const res = await fetch(`/api/products/${code}`);
        if (!res.ok) throw new Error();

        const p = (await res.json()).product;

        document.getElementById(`${id}_desc`).value = p.description;
        document.getElementById(`${id}_unit`).value = p.unit;
        document.getElementById(`${id}_stock`).value = p.stock;

        EXIT_ITEM_ROWS = EXIT_ITEM_ROWS.map(r =>
            r.id === id
                ? { ...r, description: p.description, unit: p.unit, stock: p.stock }
                : r
        );

    } catch {
        alert("Product not found.");
    }
}

function renderExitItemRows(readOnly = false) {
    const container = document.getElementById("exitItemsContainer");
    if (!container) return;

    // HIDE ADD ITEM BUTTON IN READ-ONLY MODE
    const addBtn = document.querySelector("#exitItemsContainer + button");
    if (addBtn) addBtn.style.display = readOnly ? "none" : "block";

    if (!EXIT_ITEM_ROWS.length) {
        container.innerHTML = `<div style="color:#94a3b8;">No items added.</div>`;
        return;
    }

    container.innerHTML = EXIT_ITEM_ROWS.map(r => `
        <div id="${r.id}" style="display:flex; gap:10px; margin-bottom:8px; align-items:center;">

            <!-- Product Code -->
            <input id="${r.id}_code"
                class="modal-input"
                style="width:90px;"
                value="${r.code}"
                ${readOnly
                    ? "disabled"
                    : `oninput="updateExitCode('${r.id}', this.value)"
                       onblur="autoFillExitItem('${r.id}')"
                       onkeyup="if(event.key==='Enter') autoFillExitItem('${r.id}')"`
                }>

            <!-- Description -->
            <input id="${r.id}_desc"
                class="modal-input"
                style="flex:1;"
                value="${r.description}"
                ${readOnly ? "disabled" : "readonly"}>

            <!-- Unit -->
            <input id="${r.id}_unit"
                class="modal-input"
                style="width:70px;"
                value="${r.unit}"
                ${readOnly ? "disabled" : "readonly"}>

            <!-- Stock -->
            <input id="${r.id}_stock"
                class="modal-input"
                style="width:70px;"
                value="${r.stock}"
                ${readOnly ? "disabled" : "readonly"}>

            <!-- Quantity -->
            <input id="${r.id}_qty"
                class="modal-input"
                type="number"
                style="width:70px;"
                value="${r.qty}"
                ${readOnly ? "disabled" : `oninput="updateExitQty('${r.id}', this.value)"`}>

            <!-- Remove Button -->
            ${readOnly ? "" : `<button class="btn ghost" onclick="removeExitItemRow('${r.id}')">X</button>`}

        </div>
    `).join("");
}


/* ============================
   SAVE EXIT
   ============================ */

async function saveExit() {
    const dest = document.getElementById("exitDestination").value.trim();
    if (!dest) { alert("Destination is required."); return; }

    if (EXIT_ITEM_ROWS.length === 0) {
        alert("Add at least one item."); return;
    }

    const created_by_val = document.getElementById("exitCreatedBy").value.trim();

    const payload = {
        destination: dest,
        notes: document.getElementById("exitNotes").value.trim() || null,
        created_by: created_by_val ? Number(created_by_val) : null,
        items: EXIT_ITEM_ROWS.map(r => ({
            product_code: document.getElementById(`${r.id}_code`).value.trim(),
            qty: Number(document.getElementById(`${r.id}_qty`).value) || 0
        }))
    };

    try {
        const res = await fetch("/api/exits/create", {
            method: "POST",
            headers: { "Content-Type":"application/json" },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const err = await res.json().catch(() => null);
            throw new Error(err?.detail || "Failed creating exit");
        }

        alert("Exit created successfully.");
        closeExitModal();
        loadExitsTable();

    } catch (err) {
        alert("Error: " + err.message);
    }
}

/* ============================
   PRINT EXIT PDF
   ============================ */

function printExitPDF(id) {
    window.open(`/api/exits/${id}/pdf`, "_blank");
}

/* ============================
   UTILITIES
   ============================ */

function formatDateBR(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleString("pt-BR");
}

function applyExitFilters() {
    const fID = document.getElementById("fltExitID").value.toLowerCase();
    const fCode = document.getElementById("fltExitCode").value.toLowerCase();
    const fDate = document.getElementById("fltExitDate").value.toLowerCase();
    const fDest = document.getElementById("fltExitDest").value.toLowerCase();
    const fUser = document.getElementById("fltExitUser").value.toLowerCase();

    EXITS_FILTERED = EXITS_DATA.filter(e => {
        const matchID = (String(e.id).toLowerCase()).includes(fID);
        const matchCode = (e.exit_code || "").toLowerCase().includes(fCode);
        const matchDate = (e.created_at || "").toLowerCase().includes(fDate);
        const matchDest = (e.destination || "").toLowerCase().includes(fDest);
        const matchUser = (String(e.created_by || "")).toLowerCase().includes(fUser);

        return matchID && matchCode && matchDate && matchDest && matchUser;
    });

    renderExitsTable();
}
