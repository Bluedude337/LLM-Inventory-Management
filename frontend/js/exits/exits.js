/* ============================================
   EXITS MODULE — exits.js (AUTH READY)
   FIXED PDF ROUTE + TOKEN-AWARE DOWNLOAD
   Source: :contentReference[oaicite:2]{index=2}
============================================ */

let EXITS_DATA = [];
let EXIT_ITEM_ROWS = [];
let currentExitId = null;
let EXITS_FILTERED = [];

/* =========================
   PAGE LOADER
   ========================= */
function loadExitsPage() {
    fetch("js/exits/exits.html")
        .then(r => r.text())
        .then(html => {
            document.getElementById("contentArea").innerHTML = html;
            loadExitsTable();
        });
}

/* =========================
   LOAD EXITS TABLE
   ========================= */
async function loadExitsTable() {
    const box = document.getElementById("exitListBody") || document.getElementById("exitsContainer");

    try {
        const payload = await apiGET("/api/exits/list");
        const data = payload?.data || payload || [];
        EXITS_DATA = data;
        EXITS_FILTERED = EXITS_DATA.slice();
        renderExitsTable();
    } catch (err) {
        console.error("loadExitsTable error:", err);
        if (box) box.innerHTML = `<div style="color:red;">Failed loading exits.</div>`;
    }
}

/* =========================
   RENDER TABLE
   ========================= */
function renderExitsTable() {
    const tbody = document.getElementById("exitListBody");
    if (!tbody) return;

    if (!EXITS_FILTERED.length) {
        tbody.innerHTML = `
            <tr><td colspan="6" style="text-align:center; padding:12px;">No exits found.</td></tr>
        `;
        return;
    }

    tbody.innerHTML = EXITS_FILTERED.map(e => `
        <tr>
            <td>${escapeHtml(e.id)}</td>
            <td>${escapeHtml(e.exit_code || "")}</td>
            <td>${formatDateBR(e.created_at)}</td>
            <td>${escapeHtml(e.destination)}</td>
            <td>${escapeHtml(e.created_by || "")}</td>
            <td>
                <button class="btn ghost" onclick="viewExit(${e.id})">View</button>
            </td>
        </tr>
    `).join("");
}

/* =========================
   VIEW EXIT DETAILS
   ========================= */

async function viewExit(id) {
    try {
        const payload = await apiGET(`/api/exits/${id}`);

        if (!payload || !payload.exit) {
            throw new Error("Invalid exit response");
        }

        const details = payload;
        currentExitId = id;

        openExitModal(true);

        document.getElementById("exitDestination").value = details.exit.destination;
        document.getElementById("exitNotes").value = details.exit.notes || "";
        document.getElementById("exitCreatedBy").value = details.exit.created_by || "";

        document.getElementById("exitDestination").disabled = true;
        document.getElementById("exitNotes").disabled = true;
        document.getElementById("exitCreatedBy").disabled = true;

        EXIT_ITEM_ROWS = details.items.map(i => ({
            id: "readonly_" + Date.now() + Math.floor(Math.random() * 999),
            code: i.product_code,
            description: i.description,
            unit: i.unit,
            stock: "",
            qty: i.qty
        }));

        renderExitItemRows(true);
        renderModalFooter(true);

    } catch (err) {
        console.error("viewExit error:", err);
        alert("Unable to load exit details.");
    }
}


/* =========================
   MODAL FOOTER
   ========================= */
function renderModalFooter(readOnly) {
    const footer = document.getElementById("exitModalFooter");
    if (!footer) return;

    if (readOnly) {
        footer.innerHTML = `
            <button class="btn ghost" onclick="closeExitModal()">Close</button>
            <button class="btn" onclick="downloadExitPDF(${currentExitId})">Print PDF</button>
        `;
    } else {
        footer.innerHTML = `
            <button class="btn ghost" onclick="closeExitModal()">Cancel</button>
            <button class="btn" onclick="saveExit()">Save Exit</button>
        `;
    }
}

/* =========================
   PRINT EXIT PDF (AUTH-FETCH)
   ========================= */
async function downloadExitPDF(id) {
    try {
        const res = await authFetch(`/api/exits-print/${id}/pdf/`);
        if (!res) {
            alert("No response from server.");
            return;
        }

        if (!res.ok) {
            const err = await res.text().catch(() => "");
            console.error("Exit PDF error:", err);
            alert("Failed to download PDF.");
            return;
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);

        const newTab = window.open(url, "_blank");
        if (!newTab) {
            const a = document.createElement("a");
            a.href = url;
            a.download = `exit_${id}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        }

        setTimeout(() => URL.revokeObjectURL(url), 30000);

    } catch (err) {
        console.error("downloadExitPDF error:", err);
        alert("Failed to download exit PDF.");
    }
}

/* =========================
   UTILITIES
   ========================= */
function formatDateBR(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleString("pt-BR");
}
