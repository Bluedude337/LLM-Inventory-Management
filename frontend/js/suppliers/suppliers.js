/* ============================================
   SUPPLIERS MODULE — suppliers.js (AUTH READY)
   Source: :contentReference[oaicite:1]{index=1}
============================================ */

/* =======================
   PAGE LOADER
   ======================= */
function loadSuppliers() {
    fetch("js/suppliers/suppliers.html")
        .then(r => r.text())
        .then(html => {
            document.getElementById("contentArea").innerHTML = html;
            loadSuppliersData();
        });
}

/* =======================
   GLOBALS
   ======================= */
let supData = [];
let supFiltered = [];
let supPage = 0;
const SUP_PAGE_SIZE = 18;

/* =======================
   LOAD SUPPLIERS
   ======================= */
async function loadSuppliersData() {
    const tb = document.getElementById("supBody");

    try {
        const res = await apiGET("/api/suppliers/");
        if (!res || !res.suppliers) throw new Error("Bad supplier response");

        supData = res.suppliers.slice();
        supPage = 0;
        supApplyFilters();

        return supData;

    } catch (err) {
        console.error("loadSuppliersData error:", err);
        if (tb) {
            tb.innerHTML =
                "<tr><td colspan='9' style='padding:20px;text-align:center;'>Failed to load suppliers</td></tr>";
        }
        return [];
    }
}

/* =======================
   FILTER HELPERS
   ======================= */
function norm(v) {
    return (v || "").toString().toLowerCase();
}

function supApplyFilters() {
    const q = document.getElementById("supSearch")?.value.toLowerCase() || "";

    const gf = id => (document.getElementById(id)?.value || "").toLowerCase();

    supFiltered = supData.filter(r =>
        norm(r.cnpj).includes(gf("f_cnpj")) &&
        norm(r.name).includes(gf("f_name")) &&
        norm(r.address).includes(gf("f_address")) &&
        norm(r.neighborhood).includes(gf("f_neigh")) &&
        norm(r.city).includes(gf("f_city")) &&
        norm(r.state).includes(gf("f_state")) &&
        norm(r.cep).includes(gf("f_cep")) &&
        norm(r.seller).includes(gf("f_seller")) &&
        norm(r.cellphone).includes(gf("f_cell")) &&
        (
            norm(r.cnpj).includes(q) ||
            norm(r.name).includes(q) ||
            norm(r.city).includes(q)
        )
    );

    supRenderTable();
}

/* =======================
   TABLE RENDERING
   ======================= */
function supRenderTable() {
    const tb = document.getElementById("supBody");
    if (!tb) return;

    const rows = supFiltered.slice(supPage * SUP_PAGE_SIZE, supPage * SUP_PAGE_SIZE + SUP_PAGE_SIZE);

    if (!rows.length) {
        tb.innerHTML = "<tr><td colspan='9' style='padding:20px; text-align:center;'>No results</td></tr>";
        return;
    }

    tb.innerHTML = rows.map(r => `
        <tr>
            <td>${escapeHtml(r.cnpj)}</td>
            <td>${escapeHtml(r.name)}</td>
            <td>${escapeHtml(r.address)}</td>
            <td>${escapeHtml(r.neighborhood)}</td>
            <td>${escapeHtml(r.city)}</td>
            <td>${escapeHtml(r.state)}</td>
            <td>${escapeHtml(r.cep)}</td>
            <td>${escapeHtml(r.seller)}</td>
            <td>${escapeHtml(r.cellphone)}</td>
        </tr>
    `).join("");
}

/* =======================
   SORT
   ======================= */
function supSort(key) {
    supFiltered.sort((a, b) => String(a[key] || "").localeCompare(String(b[key] || "")));
    supRenderTable();
}

/* =======================
   PAGINATION
   ======================= */
function supPrevPage() {
    supPage = Math.max(0, supPage - 1);
    supRenderTable();
}

function supNextPage() {
    supPage++;
    supRenderTable();
}

/* =======================
   REGISTER SUPPLIER MODAL
   ======================= */
function openRegisterSupplier() {
    document.getElementById("supModal").style.display = "flex";
}

function closeRegisterSupplier() {
    document.getElementById("supModal").style.display = "none";
    document.getElementById("supRegMsg").innerHTML = "";
}

/* =======================
   REGISTER SUPPLIER
   ======================= */
async function registerSupplier() {
    const payload = {
        cnpj: document.getElementById("s_cnpj").value,
        name: document.getElementById("s_name").value,
        address: document.getElementById("s_address").value,
        neighborhood: document.getElementById("s_neighborhood").value,
        city: document.getElementById("s_city").value,
        state: document.getElementById("s_state").value,
        cep: document.getElementById("s_cep").value,
        seller: document.getElementById("s_seller").value,
        cellphone: document.getElementById("s_cell").value,
        pix: document.getElementById("s_pix").value,
    };

    const msg = document.getElementById("supRegMsg");

    if (!payload.cnpj || !payload.name) {
        msg.innerHTML = "<span style='color:#f87171;'>CNPJ and Name are required.</span>";
        return;
    }

    try {
        const res = await apiPOST("/api/suppliers/register/", payload);

        if (res.status === 409) {
            msg.innerHTML = "<span style='color:#f87171;'>Supplier already exists.</span>";
            return;
        }

        if (!res.ok) {
            msg.innerHTML = "<span style='color:#f87171;'>Failed to register supplier.</span>";
            return;
        }

        msg.innerHTML = "<span style='color:#4ade80;'>Supplier registered!</span>";
        await loadSuppliersData();
        setTimeout(closeRegisterSupplier, 700);

    } catch (err) {
        console.error(err);
        msg.innerHTML = "<span style='color:#f87171;'>Network error.</span>";
    }
}

/* =======================
   PRINT
   ======================= */
function printSuppliers() {
    window.print();
}

/* =======================
   SUPPLIER PICKER (Used by PO)
   ======================= */
async function openSupplierPicker() {
    await loadSuppliersData();

    const html = `
        <div id="supplierPicker" style="
            position:fixed; inset:0; display:flex; align-items:center;
            justify-content:center; background:rgba(0,0,0,0.7); z-index:999;">

            <div class="card" style="background:#1e293b; padding:20px; width:800px; max-height:80vh; overflow:auto;">
                <h2 style="font-weight:300;">Select Supplier</h2>

                <input id="spSearch" placeholder="Search..." class="modal-input"
                        style="margin-bottom:12px;" oninput="spApplyFilter()">

                <table>
                    <thead>
                        <tr><th>CNPJ</th><th>Name</th><th>City</th><th>Select</th></tr>
                    </thead>
                    <tbody id="spBody"></tbody>
                </table>

                <button class="btn ghost" style="margin-top:12px;" onclick="closeSupplierPicker()">Close</button>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML("beforeend", html);
    renderSupplierPicker();
}

function closeSupplierPicker() {
    document.getElementById("supplierPicker")?.remove();
}

function renderSupplierPicker(list = supData) {
    const tbody = document.getElementById("spBody");
    if (!tbody) return;

    if (!list.length) {
        tbody.innerHTML =
            `<tr><td colspan='4' style='padding:14px; text-align:center;'>No suppliers found.</td></tr>`;
        return;
    }

    tbody.innerHTML = list.map((s, idx) => `
        <tr>
            <td>${escapeHtml(s.cnpj)}</td>
            <td>${escapeHtml(s.name)}</td>
            <td>${escapeHtml(s.city || '')}</td>
            <td><button class="btn" onclick="selectSupplierByIndex(${idx})">Select</button></td>
        </tr>
    `).join("");
}

function spApplyFilter() {
    const q = document.getElementById("spSearch").value.toLowerCase();

    const filtered = supData.filter(s =>
        norm(s.cnpj).includes(q) ||
        norm(s.name).includes(q) ||
        norm(s.city).includes(q)
    );

    renderSupplierPicker(filtered);
}

function selectSupplierByIndex(idx) {
    const s = supData[idx];
    if (!s) {
        alert("Supplier not found");
        return;
    }

    if (typeof selectSupplier === "function") {
        selectSupplier(s);
    }

    closeSupplierPicker();
}

/* =======================
   BUYER PICKER (Used by PO)
   ======================= */
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
                        <tr><th>CNPJ</th><th>Name</th><th>City</th><th>Select</th></tr>
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
    document.getElementById("buyerPicker")?.remove();
}

function bpApplyFilter() {
    const q = document.getElementById("bpSearch").value.toLowerCase();

    const filtered = supData.filter(b =>
        norm(b.name).includes(q) ||
        norm(b.cnpj).includes(q) ||
        norm(b.city).includes(q)
    );

    renderBuyerPicker(filtered);
}

function renderBuyerPicker(list = supData) {
    const tbody = document.getElementById("bpBody");
    if (!tbody) return;

    if (!list.length) {
        tbody.innerHTML =
            `<tr><td colspan='4' style='padding:14px; text-align:center;'>No buyers found.</td></tr>`;
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

function selectBuyerByIndex(idx) {
    const b = supData[idx];
    if (!b) {
        alert("Buyer not found");
        return;
    }
    if (typeof selectBuyer === "function") {
        selectBuyer(b);
    }
    closeBuyerPicker();
}

/* =======================
   UTILS FALLBACK
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
