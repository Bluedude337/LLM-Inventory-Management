/* ============================================
   PURCHASE ORDER VIEW MODULE — po_view.js
   ============================================ */

/* =======================
   PO Detail Loader
   ======================= */

async function openPO(po_number) {
    // Load placeholder template
    fetch("js/po/po_view.html")
        .then(r => r.text())
        .then(html => {
            document.getElementById("contentArea").innerHTML = html;
            loadPOView(po_number);
        });
}

async function loadPOView(po_number) {
    const container = document.getElementById("poViewContainer");

    try {
        const res = await fetch(`/api/po/${po_number}/`);
        if (!res.ok) throw new Error("Failed to load PO");

        const data = await res.json();
        const header = data.header;
        const items = data.items || [];

        // Render PO view
        container.innerHTML = buildPOViewHTML(header, items);

        // After rendering, update button states based on PO status
        applyPOStatusControls(header.status);

    } catch (err) {
        console.error("PO view error:", err);
        container.innerHTML = `
            <div style="padding:20px; text-align:center; color:#f87171;">
                Failed to load purchase order.
            </div>
        `;
    }
}

/* =======================
   Build HTML (Dynamic)
   ======================= */

function buildPOViewHTML(header, items) {
    return `
        <h1 style="font-weight:300;">PO ${escapeHtml(header.po_code || header.po_number)}</h1>

        <!-- Supplier + Buyer + Header Info -->
        <div class="card" style="margin-bottom:20px;">
            <div style="display:flex; justify-content:space-between; gap:30px;">

                <!-- Supplier -->
                <div style="flex:1;">
                    <h3 style="margin:0 0 8px 0; font-weight:400;">Supplier</h3>
                    <div><strong>${escapeHtml(header.supplier_name)}</strong></div>
                    <div>CNPJ: ${escapeHtml(header.supplier_cnpj)}</div>
                    <div>${escapeHtml(header.supplier_address)} - ${escapeHtml(header.supplier_neighborhood)}</div>
                    <div>${escapeHtml(header.supplier_city)} - ${escapeHtml(header.supplier_state)} CEP ${escapeHtml(header.supplier_cep)}</div>
                    <div>PIX: ${escapeHtml(header.supplier_pix || "")}</div>
                    <div>Contact: ${escapeHtml(header.supplier_contact || "")}</div>
                </div>

                <!-- Buyer -->
                <div style="flex:1;">
                    <h3 style="margin:0 0 8px 0; font-weight:400;">Buyer</h3>
                    <div><strong>${escapeHtml(header.buyer_name)}</strong></div>
                    <div>CNPJ: ${escapeHtml(header.buyer_cnpj)}</div>
                    <div>${escapeHtml(header.buyer_address)} - ${escapeHtml(header.buyer_neighborhood)}</div>
                    <div>${escapeHtml(header.buyer_city)} - ${escapeHtml(header.buyer_state)} CEP ${escapeHtml(header.buyer_cep)}</div>
                    <div>PIX: ${escapeHtml(header.buyer_pix || "")}</div>
                    <div>Contact: ${escapeHtml(header.buyer_contact || "")}</div>
                </div>

                <!-- PO Metadata -->
                <div style="flex:0.6; text-align:right;">
                    <div><strong>PO:</strong> ${escapeHtml(header.po_code || header.po_number)}</div>
                    <div><strong>Date:</strong> ${new Date(header.created_at).toLocaleString()}</div>
                    <div><strong>Status:</strong> <span id="poStatus">${escapeHtml(header.status)}</span></div>
                </div>

            </div>
        </div>

        <!-- Items Table -->
        <div class="card">
            <table>
                <thead>
                    <tr>
                        <th>Code</th>
                        <th>Description</th>
                        <th>Unit</th>
                        <th>Qty</th>
                        <th>Unit Price</th>
                        <th>Total</th>
                    </tr>
                </thead>

                <tbody>
                    ${items.map(it => `
                        <tr>
                            <td>${escapeHtml(it.item_code)}</td>
                            <td>${escapeHtml(it.description)}</td>
                            <td>${escapeHtml(it.unit)}</td>
                            <td>${escapeHtml(it.qty)}</td>
                            <td>R$ ${Number(it.unit_price || 0).toFixed(2)}</td>
                            <td>R$ ${Number(it.line_total || (it.qty * (it.unit_price || 0))).toFixed(2)}</td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>

            <!-- Action Buttons -->
            <div style="display:flex; justify-content:space-between; margin-top:14px; align-items:center;">

                <div>
                    <button class="btn" onclick="downloadPOPdf(${header.po_number})">
                        Download PDF
                    </button>

                    <button class="btn ghost" onclick="backToPOList()">
                        Back
                    </button>
                </div>

                <div>
                    <button id="approveBtn" class="btn" onclick="changePOStatus(${header.po_number}, 'APPROVED')">
                        Approve
                    </button>

                    <button id="cancelBtn" class="btn ghost" onclick="changePOStatus(${header.po_number}, 'CANCELLED')">
                        Cancel
                    </button>
                </div>

            </div>
        </div>
    `;
}


/* =======================
   Actions: Approve / Cancel
   ======================= */

async function changePOStatus(po_number, newStatus) {
    const ok = confirm(`Change PO #${po_number} status to ${newStatus}?`);
    if (!ok) return;

    try {
        const res = await fetch(`/api/po/${po_number}/status/`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ status: newStatus })
        });

        if (!res.ok) {
            const err = await res.json();
            alert("Failed to update status: " + (err.detail || res.status));
            return;
        }

        alert("Status updated");
        loadPOs();

    } catch (err) {
        console.error("Status update error:", err);
        alert("Failed to update status.");
    }
}

/* =======================
   Navigation
   ======================= */

function backToPOList() {
    loadPOs();
}

/* =======================
   PDF Download
   ======================= */

function downloadPOPdf(po_number) {
    const url = `/api/po/${po_number}/pdf/`;
    window.open(url, "_blank");
}

/* =======================
   Utils Fallback
   ======================= */

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

async function changePOStatus(po_number, newStatus) {
    if (!confirm(`Are you sure you want to mark this PO as ${newStatus}?`)) return;

    const res = await fetch(`/api/po/${po_number}/status`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ status: newStatus })
    });

    if (!res.ok) {
        const err = await res.json();
        alert("Error: " + (err.detail || "Could not change status"));
        return;
    }

    const data = await res.json();
    document.getElementById("poStatus").textContent = data.new_status;

    // Disable buttons after change
    if (newStatus !== "OPEN") {
        document.getElementById("approveBtn").disabled = true;
    }

    alert("Status updated successfully!");
}

function applyPOStatusControls(status) {
    const approveBtn = document.getElementById("approveBtn");
    const cancelBtn = document.getElementById("cancelBtn"); // add ID to cancel button

    if (status !== "OPEN") {
        if (approveBtn) approveBtn.disabled = true;
        if (cancelBtn) cancelBtn.disabled = true;
    }
}
