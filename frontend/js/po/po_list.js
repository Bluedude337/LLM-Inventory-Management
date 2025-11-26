/* ============================================
   PURCHASE ORDER LIST MODULE — po_list.js
   ============================================ */

/* =======================
   GLOBALS
   ======================= */
let poList = [];        // Full list from backend
let filteredPOs = [];   // Filtered list



/* =======================
   PAGE LOADER
   ======================= */
function loadPOs() {
    fetch("js/po/po_list.html")
        .then(r => r.text())
        .then(html => {
            document.getElementById("contentArea").innerHTML = html;

            // Clear filters
            const f1 = document.getElementById("fltPOCode");
            const f2 = document.getElementById("fltSupplier");
            const f3 = document.getElementById("fltDate");
            const f4 = document.getElementById("fltStatus");

            if (f1) f1.value = "";
            if (f2) f2.value = "";
            if (f3) f3.value = "";
            if (f4) f4.value = "";

            loadPOList();
        });
}



/* =======================
   LOAD PO DATA
   ======================= */
async function loadPOList() {
    try {
        const res = await fetch("/api/po/");
        if (!res.ok) throw new Error("Failed to fetch POs");

        const data = await res.json();
        poList = data.purchase_orders || [];   // backend returns "pos"
        filteredPOs = poList.slice();

        renderPOList();

    } catch (err) {
        console.error("Error loading PO list:", err);
        const tb = document.getElementById("poListBody");
        if (tb) {
            tb.innerHTML =
                "<tr><td colspan='5' style='padding:20px;text-align:center;'>Failed to load POs</td></tr>";
        }
    }
}



/* =======================
   FILTERING
   ======================= */
function applyPOFilters() {
    const fCode = document.getElementById("fltPOCode").value.toLowerCase();
    const fSupplier = document.getElementById("fltSupplier").value.toLowerCase();
    const fDate = document.getElementById("fltDate").value.toLowerCase();
    const fStatus = document.getElementById("fltStatus").value.toLowerCase();

    filteredPOs = poList.filter(po => {
        const matchCode = (po.po_code || "").toLowerCase().includes(fCode);
        const matchSupplier = (po.supplier_name || "").toLowerCase().includes(fSupplier);
        const matchDate = (po.created_at || "").toLowerCase().includes(fDate);
        const matchStatus = (po.status || "").toLowerCase().includes(fStatus);

        return matchCode && matchSupplier && matchDate && matchStatus;
    });

    renderPOList();
}



/* =======================
   TABLE RENDERING
   ======================= */
function renderPOList() {
    const tbody = document.getElementById("poListBody");
    if (!tbody) return;

    if (filteredPOs.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center; padding:12px;">
                    No purchase orders found.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filteredPOs.map(po => `
        <tr>
            <td>${escapeHtml(po.po_code)}</td>
            <td>${escapeHtml(po.supplier_name)}</td>
            <td>${new Date(po.created_at).toLocaleDateString()}</td>
            <td>${escapeHtml(po.status)}</td>
            <td>
                <button class="btn ghost" onclick="openPO(${po.po_number})">
                    Open
                </button>
            </td>
        </tr>
    `).join("");
}



/* =======================
   UTILS
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
