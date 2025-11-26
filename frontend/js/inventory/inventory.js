/* ============================================
   INVENTORY MODULE — inventory.js
   ============================================ */

/* =======================
   Page Loader
   ======================= */

function loadInventory() {
    fetch("js/inventory/inventory.html")
        .then(r => r.text())
        .then(html => {
            document.getElementById("contentArea").innerHTML = html;
            loadInventoryData();
        });
}

/* =======================
   Data + Filters
   ======================= */

let invData = [];
let invFiltered = [];
let invPage = 0;

async function loadInventoryData() {
    const tb = document.getElementById("invBody");

    try {
        const res = await fetch("/api/products");
        const data = await res.json();

        invData = data.products || [];
        invApplyFilters();
    } catch (err) {
        console.error("Inventory loading error:", err);
        tb.innerHTML = "<tr><td colspan='6' style='text-align:center;'>Failed to load</td></tr>";
    }
}

function invApplyFilters() {
    const q = document.getElementById("invSearch").value.toLowerCase();

    const gf = id => (document.getElementById(id)?.value || "").toLowerCase();

    invFiltered = invData.filter(r =>
        r.code.toLowerCase().includes(gf("f_code")) &&
        r.category.toLowerCase().includes(gf("f_cat")) &&
        r.subcategory.toLowerCase().includes(gf("f_sub")) &&
        r.description.toLowerCase().includes(gf("f_desc")) &&
        r.unit.toLowerCase().includes(gf("f_unit")) &&
        String(r.stock).toLowerCase().includes(gf("f_stock")) &&
        (
            r.code.toLowerCase().includes(q) ||
            r.description.toLowerCase().includes(q) ||
            r.category.toLowerCase().includes(q)
        )
    );

    invRenderTable();
}

/* =======================
   Table & Pagination
   ======================= */

function invRenderTable() {
    const tb = document.getElementById("invBody");
    const rows = invFiltered.slice(invPage * 20, invPage * 20 + 20);

    if (rows.length === 0) {
        tb.innerHTML = "<tr><td colspan='6' style='padding:20px; text-align:center;'>No results</td></tr>";
        return;
    }

    tb.innerHTML = rows.map(r => `
        <tr>
            <td>${escapeHtml(r.code)}</td>
            <td>${escapeHtml(r.category)}</td>
            <td>${escapeHtml(r.subcategory)}</td>
            <td>${escapeHtml(r.description)}</td>
            <td>${escapeHtml(r.unit)}</td>
            <td>${escapeHtml(r.stock)}</td>
        </tr>
    `).join("");
}

function invSort(key) {
    invFiltered.sort((a, b) => String(a[key]).localeCompare(String(b[key])));
    invRenderTable();
}

function invPrevPage() {
    invPage = Math.max(0, invPage - 1);
    invRenderTable();
}

function invNextPage() {
    invPage++;
    invRenderTable();
}

/* =======================
   Register Item Modal
   ======================= */

function openRegisterItem() {
    document.getElementById("regModal").style.display = "flex";
}

function closeRegisterItem() {
    document.getElementById("regModal").style.display = "none";
}

async function registerItem() {
    const payload = {
        code: document.getElementById("r_code").value,
        category: document.getElementById("r_cat").value,
        subcategory: document.getElementById("r_sub").value,
        description: document.getElementById("r_desc").value,
        unit: document.getElementById("r_unit").value,
        stock: Number(document.getElementById("r_stock").value || 0)
    };

    const msg = document.getElementById("regMessage");

    try {
        const res = await fetch("/api/products/register", {
            method: "POST",
            headers: {"Content-Type":"application/json"},
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            msg.innerHTML = "<span style='color:#4ade80;'>Item registered!</span>";
            loadInventoryData();
        } else {
            msg.innerHTML = "<span style='color:#f87171;'>Error registering item.</span>";
        }
    } catch (err) {
        console.error(err);
        msg.innerHTML = "<span style='color:#f87171;'>Network error.</span>";
    }
}

/* =======================
   Print
   ======================= */

function printInventory() {
    window.print();
}

/* =======================
   Utils (fallback)
   ======================= */

if (typeof escapeHtml !== "function") {
    function escapeHtml(s) {
        if (s == null) return "";
        return String(s)
            .replaceAll("&","&amp;")
            .replaceAll("<","&lt;")
            .replaceAll(">","&gt;")
            .replaceAll("\"","&quot;")
            .replaceAll("'","&#39;");
    }
}
