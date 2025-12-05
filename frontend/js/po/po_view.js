/* ============================================
   PURCHASE ORDER VIEW MODULE — po_view.js (AUTH READY)
   Updated to:
     - download PDF with authFetch + blob
     - receive PO using PUT via authFetch (matches backend)
   Source reviewed: :contentReference[oaicite:2]{index=2}
============================================ */

/* =======================
   OPEN PO VIEW PAGE
   ======================= */
async function openPO(po_number) {
    fetch("js/po/po_view.html")
        .then(r => r.text())
        .then(html => {
            document.getElementById("contentArea").innerHTML = html;
            loadPOView(po_number);
        });
}

/* =======================
   LOAD PO DETAILS
   ======================= */
async function loadPOView(po_number) {
    const container = document.getElementById("poViewContainer");

    try {
        const data = await apiGET(`/api/po/${po_number}/`);
        if (!data || !data.header) throw new Error("Invalid PO response.");

        const header = data.header;
        const items = data.items || [];

        container.innerHTML = buildPOViewHTML(header, items);

        // Apply status-based controls (Approve / Cancel / Receive)
        applyPOStatusControls(header.status, po_number);

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
   BUILD HTML
   ======================= */
function buildPOViewHTML(header, items) {
    return `
        <h1 style="font-weight:300;">PO ${escapeHtml(header.po_code || header.po_number)}</h1>

        <div class="card" style="margin-bottom:20px;">
            <div style="display:flex; justify-content:space-between; gap:30px;">
                <!-- Supplier -->
                <div style="flex:1;">
                    <h3 style="margin-bottom:8px;">Supplier</h3>
                    <div><strong>${escapeHtml(header.supplier_name)}</strong></div>
                    <div>CNPJ: ${escapeHtml(header.supplier_cnpj)}</div>
                    <div>${escapeHtml(header.supplier_address)} - ${escapeHtml(header.supplier_neighborhood)}</div>
                    <div>${escapeHtml(header.supplier_city)} - ${escapeHtml(header.supplier_state)} CEP ${escapeHtml(header.supplier_cep)}</div>
                    <div>PIX: ${escapeHtml(header.supplier_pix || "")}</div>
                    <div>Contact: ${escapeHtml(header.supplier_contact || "")}</div>
                </div>

                <!-- Buyer -->
                <div style="flex:1;">
                    <h3 style="margin-bottom:8px;">Buyer</h3>
                    <div><strong>${escapeHtml(header.buyer_name)}</strong></div>
                    <div>CNPJ: ${escapeHtml(header.buyer_cnpj)}</div>
                    <div>${escapeHtml(header.buyer_address)} - ${escapeHtml(header.buyer_neighborhood)}</div>
                    <div>${escapeHtml(header.buyer_city)} - ${escapeHtml(header.buyer_state)} CEP ${escapeHtml(header.buyer_cep)}</div>
                    <div>PIX: ${escapeHtml(header.buyer_pix || "")}</div>
                    <div>Contact: ${escapeHtml(header.buyer_contact || "")}</div>
                </div>

                <!-- Metadata -->
                <div style="flex:0.6; text-align:right;">
                    <div><strong>PO:</strong> ${escapeHtml(header.po_code || header.po_number)}</div>
                    <div><strong>Date:</strong> ${formatDateTime(header.created_at)}</div>
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
                    ${items.map(itemRowHTML).join("")}
                </tbody>
            </table>

            <div style="display:flex; justify-content:space-between; margin-top:14px; align-items:center;">
                <div>
                    <button class="btn" onclick="downloadPOPdf(${header.po_number})">Download PDF</button>
                    <button class="btn ghost" onclick="backToPOList()">Back</button>
                </div>

                <div>
                    <button id="approveBtn" class="btn"
                        onclick="changePOStatus(${header.po_number}, 'APPROVED')">
                        Approve
                    </button>

                    <button id="cancelBtn" class="btn ghost"
                        onclick="changePOStatus(${header.po_number}, 'CANCELLED')">
                        Cancel
                    </button>
                </div>

            </div>
        </div>

        <div id="poReceiveArea" style="margin-top:20px; text-align:right;"></div>
    `;
}

/* =======================
   TABLE ROW TEMPLATE
   ======================= */
function itemRowHTML(it) {
    const total = Number(it.line_total || (it.qty * (it.unit_price || 0))).toFixed(2);
    return `
        <tr>
            <td>${escapeHtml(it.item_code)}</td>
            <td>${escapeHtml(it.description)}</td>
            <td>${escapeHtml(it.unit)}</td>
            <td>${it.qty}</td>
            <td>R$ ${Number(it.unit_price || 0).toFixed(2)}</td>
            <td>R$ ${total}</td>
        </tr>
    `;
}

/* =======================
   STATUS UPDATE
   ======================= */
async function changePOStatus(po_number, newStatus) {
    if (!confirm(`Mark this PO as ${newStatus}?`)) return;

    try {
        const res = await apiPOST(`/api/po/${po_number}/status`, { status: newStatus });
        if (!res.ok) {
            alert("Error: " + (res.data?.detail || "Unable to update status"));
            return;
        }

        alert("Status updated successfully!");
        loadPOView(po_number);

    } catch (err) {
        console.error(err);
        alert("Unable to update PO status.");
    }
}

/* =======================
   RECEIVE PURCHASE ORDER
   ======================= */
async function receivePO(po_number) {
    if (!confirm(`Confirm receiving PO #${po_number}? Inventory will be updated.`)) return;

    try {
        // Use authFetch with PUT to match backend route
        const res = await authFetch(`/api/po/${po_number}/receive`, { method: "PUT" });

        if (!res) {
            alert("No response from server.");
            return;
        }

        // Try parse JSON if possible
        const parsed = await res.json().catch(() => ({}));
        if (!res.ok) {
            alert("Error: " + (parsed?.detail || "Failed to receive PO"));
            return;
        }

        alert("PO received successfully!");
        loadPOView(po_number);

    } catch (err) {
        console.error(err);
        alert("Error receiving PO.");
    }
}

/* =======================
   STATUS-BASED UI CONTROLS
   ======================= */
function applyPOStatusControls(status, po_number) {
    const approveBtn = document.getElementById("approveBtn");
    const cancelBtn = document.getElementById("cancelBtn");
    const receiveArea = document.getElementById("poReceiveArea");

    if (status !== "OPEN") {
        if (approveBtn) approveBtn.disabled = true;
        if (cancelBtn) cancelBtn.disabled = true;
    }

    receiveArea.innerHTML = "";

    if (status === "APPROVED") {
        receiveArea.innerHTML = `
            <button class="btn" onclick="receivePO(${po_number})">
                Receive Order
            </button>
        `;
    }
}

/* =======================
   NAVIGATION
   ======================= */
function backToPOList() {
    loadPOs();
}

/* =======================
   PDF DOWNLOAD (auth-aware)
   ======================= */
async function downloadPOPdf(po_number) {
    try {
        const res = await authFetch(`/api/po/${po_number}/pdf/`);
        if (!res) {
            alert("No response from server.");
            return;
        }

        if (!res.ok) {
            // Try parse error body
            const err = await res.text().catch(() => "");
            console.error("PDF error:", err);
            alert("Failed to download PDF.");
            return;
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);

        // Open in new tab
        const win = window.open(url, "_blank");
        if (!win) {
            // Fallback: download
            const a = document.createElement("a");
            a.href = url;
            a.download = `po_${po_number}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        }
        // release object URL after a short delay
        setTimeout(() => URL.revokeObjectURL(url), 30000);

    } catch (err) {
        console.error("downloadPOPdf error:", err);
        alert("Failed to download PDF.");
    }
}

/* =======================
   UTILITIES
   ======================= */
function formatDateTime(dt) {
    return new Date(dt).toLocaleString("pt-BR");
}

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
