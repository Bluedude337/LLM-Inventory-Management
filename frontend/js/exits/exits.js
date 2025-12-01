/* ============================================
   EXITS MODULE — exits.js
   ============================================ */

let EXITS_DATA = [];   // List table
let EXIT_ITEM_ROWS = []; // For modal item rows

/* ============================
   PAGE LOADER (from sidebar)
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
    const box = document.getElementById("exitsContainer");

    try {
        const res = await fetch("/api/exits/list");
        const payload = await res.json();

        EXITS_DATA = payload.data || payload || [];

        renderExitsTable();

    } catch (err) {
        console.error(err);
        box.innerHTML = `<div style="color:red;">Failed loading exits.</div>`;
    }
}

function renderExitsTable() {
    const box = document.getElementById("exitsContainer");

    if (!EXITS_DATA.length) {
        box.innerHTML = `<div>No exits found.</div>`;
        return;
    }

    box.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Code</th>
                    <th>Date</th>
                    <th>Destination</th>
                    <th>Created By</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${EXITS_DATA.map(exitRowHTML).join("")}
            </tbody>
        </table>
    `;
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
   VIEW EXIT (simple read-only modal)
   ============================ */

async function viewExit(id) {
    try {
        const res = await fetch(`/api/exits/${id}`);
        const payload = await res.json();
        const details = payload.data || payload;

        openExitModal(true); // read-only mode

        // Fill fields
        document.getElementById("exitDestination").value = details.exit.destination;
        document.getElementById("exitNotes").value = details.exit.notes || "";
        document.getElementById("exitCreatedBy").value = details.exit.created_by || "";

        EXIT_ITEM_ROWS = details.items.map(i => ({
            id: "readonly_" + Date.now(),
            code: i.product_code,
            description: i.description,
            unit: i.unit,
            stock: "", // not needed for view
            qty: i.qty
        }));

        renderExitItemRows(true);

    } catch (err) {
        alert("Unable to view exit.");
    }
}

/* ============================
   MODAL CONTROL
   ============================ */

function openExitModal(readOnly = false) {
    const m = document.getElementById("exitModal");

    if (!readOnly) {
        // Reset
        EXIT_ITEM_ROWS = [];
        document.getElementById("exitDestination").value = "";
        document.getElementById("exitNotes").value = "";
        document.getElementById("exitCreatedBy").value = "";
        renderExitItemRows();
    }

    m.style.display = "flex";
}

function closeExitModal() {
    document.getElementById("exitModal").style.display = "none";
}

/* ============================
   ITEM ROWS (dynamic)
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

async function autoFillExitItem(id) {
    const code = document.getElementById(`${id}_code`).value.trim();
    if (!code) return;

    try {
        const res = await fetch(`/api/products/${code}`);
        if (!res.ok) throw new Error();

        const p = (await res.json()).product;

        // Fill row data
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

    if (!EXIT_ITEM_ROWS.length) {
        container.innerHTML = `<div style="color:#94a3b8;">No items added.</div>`;
        return;
    }

    container.innerHTML = EXIT_ITEM_ROWS.map(r => `
        <div id="${r.id}" style="display:flex; gap:10px; margin-bottom:8px; align-items:center;">

            <input id="${r.id}_code" class="modal-input" style="width:90px;"
       value="${r.code}"
       ${readOnly ? "disabled" : `
            oninput="updateExitCode('${r.id}', this.value)"
            onblur="autoFillExitItem('${r.id}')"
            onkeyup="if(event.key==='Enter') autoFillExitItem('${r.id}')"
       `}>

            <input id="${r.id}_desc" class="modal-input" style="flex:1;" readonly value="${r.description}">
            <input id="${r.id}_unit" class="modal-input" style="width:70px;" readonly value="${r.unit}">
            <input id="${r.id}_stock" class="modal-input" style="width:70px;" readonly value="${r.stock}">

            <input id="${r.id}_qty" class="modal-input" type="number" style="width:70px;"
                   value="${r.qty}"
                   ${readOnly ? "disabled" : `oninput="updateExitQty('${r.id}', this.value)"`}>

            ${readOnly ? "" : `<button class="btn ghost" onclick="removeExitItemRow('${r.id}')">X</button>`}
        </div>
    `).join("");
}

function updateExitQty(id, qty) {
    EXIT_ITEM_ROWS = EXIT_ITEM_ROWS.map(r =>
        r.id === id ? { ...r, qty: Number(qty) } : r
    );
}

/* ============================
   SAVE EXIT
   ============================ */

async function saveExit() {
    const destination = document.getElementById("exitDestination").value.trim();
    if (!destination) {
        alert("Destination is required.");
        return;
    }

    if (EXIT_ITEM_ROWS.length === 0) {
        alert("Add at least one item.");
        return;
    }

    const created_by_value = document.getElementById("exitCreatedBy").value.trim();

    const payload = {
        destination,
        notes: document.getElementById("exitNotes").value.trim() || null,
        created_by: created_by_value ? Number(created_by_value) : null,
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
            throw new Error(err?.detail || "Failed to create exit");
        }

        alert("Exit created successfully.");
        closeExitModal();
        loadExitsTable();

    } catch (err) {
        alert("Error: " + err.message);
    }
}

/* ============================
   UTILITIES
   ============================ */

function formatDateBR(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleString("pt-BR");
}


function updateExitCode(id, value) {
    EXIT_ITEM_ROWS = EXIT_ITEM_ROWS.map(r =>
        r.id === id ? { ...r, code: value } : r
    );
}