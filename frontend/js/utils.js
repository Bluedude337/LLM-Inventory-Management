/* ============================================
   GLOBAL UTILITY FUNCTIONS — utils.js
   ============================================ */

/* ===============================
   HTML ESCAPE
   Prevents XSS but allows display.
   =============================== */

function escapeHtml(s) {
    if (s == null) return "";
    return String(s)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}


/* ===============================
   NORMALIZE TEXT SAFE
   Converts null/undefined to "" and lowers.
   =============================== */

function norm(v) {
    return (v || "").toString().toLowerCase();
}


/* ===============================
   CURRENCY FORMATTER
   Used across PO totals and prices.
   =============================== */

function formatCurrency(value) {
    try {
        return value.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });
    } catch {
        return "R$ " + Number(value || 0).toFixed(2);
    }
}


/* ===============================
   SAFE JSON PARSER
   Returns null instead of throwing.
   =============================== */

function safeJSON(text) {
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}


/* ===============================
   DEBOUNCE
   Useful for search inputs later.
   =============================== */

function debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}


/* ===============================
   API HELPERS
   Cleaner fetch wrappers.
   =============================== */

async function apiGET(url) {
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(res.status);
        return await res.json();
    } catch (err) {
        console.error("GET " + url + " failed:", err);
        return null;
    }
}

async function apiPOST(url, body = {}) {
    try {
        const res = await fetch(url, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(body)
        });

        const result = await res.json().catch(() => ({}));
        return { ok: res.ok, status: res.status, data: result };

    } catch (err) {
        console.error("POST " + url + " failed:", err);
        return { ok: false, status: 0, data: null };
    }
}
