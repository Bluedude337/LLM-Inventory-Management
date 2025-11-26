let selectedSupplierData = null;
let selectedBuyerData = null;

/* ============================================
   PURCHASE ORDER CREATION MODULE — po_create.js
   ============================================ */

/* =======================
   Page Loader
   ======================= */

function openCreatePO() {
    fetch("js/po/po_create.html")
        .then(r => r.text())
        .then(html => {
            document.getElementById("contentArea").innerHTML = html;
            selectedSupplierData = null;
            selectedBuyerData = null;
        });
}

/* ============================================
   SUPPLIER SELECTION HANDLING
   ============================================ */

function selectSupplier(s) {
    selectedSupplierData = s;

    const box = document.getElementById("selectedSupplier");
    if (!box) return;

    box.innerHTML = `
        <strong>${escapeHtml(s.name)}</strong><br>
        CNPJ: ${escapeHtml(s.cnpj)}<br>
        ${escapeHtml(s.address)} - ${escapeHtml(s.neighborhood)}<br>
        ${escapeHtml(s.city)} - ${escapeHtml(s.state)}<br>
        CEP: ${escapeHtml(s.cep)}<br>
        PIX: ${escapeHtml(s.pix || '')}<br>
        Contact: ${escapeHtml(s.seller || '')} - ${escapeHtml(s.cellphone || '')}
    `;
}

/* ============================================
   BUYER SELECTION HANDLING
   ============================================ */

function selectBuyer(b) {
    selectedBuyerData = b;

    const box = document.getElementById("selectedBuyer");
    if (!box) return;

    box.innerHTML = `
        <strong>${escapeHtml(b.name)}</strong><br>
        CNPJ: ${escapeHtml(b.cnpj)}<br>
        ${escapeHtml(b.address)} - ${escapeHtml(b.neighborhood)}<br>
        ${escapeHtml(b.city)} - ${escapeHtml(b.state)}<br>
        CEP: ${escapeHtml(b.cep)}<br>
        PIX: ${escapeHtml(b.pix || '')}<br>
        Contact: ${escapeHtml(b.seller || '')} - ${escapeHtml(b.cellphone || '')}
    `;
}

/* ============================================
   ITEM ENTRY ROWS
   ============================================ */

function addPOItemRow() {
    const container = document.getElementById("poItems");

    const rowId = "poitem_" + Date.now();

    const row = document.createElement("div");
    row.id = rowId;
    row.style = "display:flex; gap:10px; margin-bottom:8px; align-items:center;";

    row.innerHTML = `
        <input placeholder="Code" class="modal-input" style="width:90px;"
               onblur="autoFillItem('${rowId}')"
               onkeyup="if(event.key==='Enter') autoFillItem('${rowId}')"
               id="${rowId}_code">

        <input placeholder="Description" class="modal-input" style="flex:1;"
               id="${rowId}_desc" readonly>

        <input placeholder="Unit" class="modal-input" style="width:70px;"
               id="${rowId}_unit" readonly>

        <input placeholder="Qty" type="number" class="modal-input" style="width:70px;"
               id="${rowId}_qty" oninput="updateItemTotal('${rowId}')">

        <input placeholder="Price" type="number" class="modal-input" style="width:80px;"
               id="${rowId}_price" oninput="updateItemTotal('${rowId}')">

        <input placeholder="Total" class="modal-input" style="width:100px;"
               id="${rowId}_total" readonly>

        <button class="btn ghost" onclick="removePOItem('${rowId}')">X</button>
    `;

    container.appendChild(row);
}

async function autoFillItem(rowId) {
    const code = document.getElementById(`${rowId}_code`).value.trim();
    if (!code) return;

    const res = await fetch(`/api/products/${code}`);
    if (!res.ok) {
        alert("Product not found");
        return;
    }

    const data = await res.json();
    const p = data.product || data;

    document.getElementById(`${rowId}_desc`).value = p.description || "";
    document.getElementById(`${rowId}_unit`).value = p.unit || "";

    updateItemTotal(rowId);
}

function updateItemTotal(rowId) {
    const qty = parseFloat(document.getElementById(`${rowId}_qty`).value) || 0;
    const price = parseFloat(document.getElementById(`${rowId}_price`).value) || 0;

    document.getElementById(`${rowId}_total`).value = (qty * price).toFixed(2);

    updatePOTotal();
}

function removePOItem(rowId) {
    document.getElementById(rowId)?.remove();
    updatePOTotal();
}

/* ============================================
   TOTAL SUM CALCULATION
   ============================================ */

function updatePOTotal() {
    let total = 0;

    document.querySelectorAll("#poItems > div").forEach(row => {
        const rowId = row.id;
        const value = parseFloat(document.getElementById(`${rowId}_total`).value) || 0;
        total += value;
    });

    const totalBox = document.getElementById("poTotal");
    if (totalBox) totalBox.innerHTML = `Total: R$ ${total.toFixed(2)}`;
}

/* ============================================
   BUYER PICKER MODAL
   ============================================ */

async function openBuyerPicker() {
    await loadSuppliersData();

    const html = `
        <div id="buyerPicker" style="
            position:fixed; inset:0; display:flex; align-items:center;
            justify-content:center; background:rgba(0,0,0,0.7); z-index:999;">

            <div class="card" style="background:#1e293b; padding:20px; width:800px; max-height:80vh; overflow:auto;">
                <h2 style="font-weight:300;">Select Buyer</h2>

                <input id="bpSearch" placeholder="Search..." class="modal-input"
                       style="margin-bottom:12px;" oninput="bpApplyFilter()">

                <table>
                    <thead>
                        <tr>
                            <th>CNPJ</th>
                            <th>Name</th>
                            <th>City</th>
                            <th>Select</th>
                        </tr>
                    </thead>
                    <tbody id="bpBody"></tbody>
                </table>

                <button class="btn ghost" style="margin-top:12px;" onclick="closeBuyerPicker()">Close</button>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML("beforeend", html);
    renderBuyerPicker();
}

function closeBuyerPicker() {
    const el = document.getElementById("buyerPicker");
    if (el) el.remove();
}

function renderBuyerPicker(list = supData) {
    const tbody = document.getElementById("bpBody");
    if (!tbody) return;

    if (!list.length) {
        tbody.innerHTML = `
            <tr><td colspan="4" style="padding:14px; text-align:center;">No buyers found.</td></tr>`;
        return;
    }

    tbody.innerHTML = list.map((b, idx) => `
        <tr>
            <td>${escapeHtml(b.cnpj)}</td>
            <td>${escapeHtml(b.name)}</td>
            <td>${escapeHtml(b.city || '')}</td>
            <td><button class="btn" onclick="selectBuyerByIndex(${idx})">Select</button></td>
        </tr>
    `).join("");
}

function bpApplyFilter() {
    const q = (document.getElementById("bpSearch").value || "").toLowerCase();

    const filtered = supData.filter(s =>
        (s.name || "").toLowerCase().includes(q) ||
        (s.cnpj || "").toLowerCase().includes(q) ||
        (s.city || "").toLowerCase().includes(q)
    );

    renderBuyerPicker(filtered);
}

function selectBuyerByIndex(idx) {
    const b = supData[idx];
    selectBuyer(b);
    closeBuyerPicker();
}

/* ============================================
   SAVE PURCHASE ORDER
   ============================================ */

async function savePO() {
    // Validate supplier
    if (!selectedSupplierData) {
        alert("Select a supplier first!");
        return;
    }

    // Validate buyer
    if (!selectedBuyerData) {
        alert("Select a buyer first!");
        return;
    }

    // Build item list
    const items = [];
    document.querySelectorAll("#poItems > div").forEach(row => {
        const rowId = row.id;

        const code = document.getElementById(`${rowId}_code`).value.trim();
        const desc = document.getElementById(`${rowId}_desc`).value.trim();
        const unit = document.getElementById(`${rowId}_unit`).value.trim();
        const qty = parseFloat(document.getElementById(`${rowId}_qty`).value) || 0;
        const price = parseFloat(document.getElementById(`${rowId}_price`).value) || 0;

        if (code) {
            items.push({
                code,
                description: desc,
                unit,
                qty,
                price,
                total: qty * price
            });
        }
    });

    if (items.length === 0) {
        alert("Add at least one item!");
        return;
    }

    // Build payload
    const payload = {
        supplier_cnpj: selectedSupplierData.cnpj,
        supplier_name: selectedSupplierData.name,
        supplier_address: selectedSupplierData.address,
        supplier_neighborhood: selectedSupplierData.neighborhood,
        supplier_city: selectedSupplierData.city,
        supplier_state: selectedSupplierData.state,
        supplier_cep: selectedSupplierData.cep,
        supplier_pix: selectedSupplierData.pix,
        supplier_contact: selectedSupplierData.seller + " - " + selectedSupplierData.cellphone,

        buyer_cnpj: selectedBuyerData.cnpj,
        buyer_name: selectedBuyerData.name,
        buyer_address: selectedBuyerData.address,
        buyer_neighborhood: selectedBuyerData.neighborhood,
        buyer_city: selectedBuyerData.city,
        buyer_state: selectedBuyerData.state,
        buyer_cep: selectedBuyerData.cep,
        buyer_pix: selectedBuyerData.pix,
        buyer_contact: selectedBuyerData.seller + " - " + selectedBuyerData.cellphone,

        notes: "",
        items: items
    };

    // Send to backend
    const res = await fetch("/api/po/create/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    if (res.ok) {
        alert("PO created successfully!");
        loadPOs();
    } else {
        alert("Error saving PO.");
    }
}

/* ============================================
   Utils Fallback
   ============================================ */

if (typeof escapeHtml !== "function") {
    function escapeHtml(s) {
        if (s == null) return "";
        return String(s)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll("\"", "&quot;")
            .replaceAll("'", "&#39;");
    }
}
