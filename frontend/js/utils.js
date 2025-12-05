/* ============================================
   UTILITIES WITH AUTH — utils.js (FINAL)
============================================ */

async function authFetch(url, options = {}) {
    const token = sessionStorage.getItem("access_token");

    if (!token) {
        window.location = "/";
        return;
    }

    options.headers = {
        ...(options.headers || {}),
        "Authorization": "Bearer " + token
    };

    let res = await fetch(url, options);

    // Auto-refresh if token expired
    if (res.status === 401) {
        const newToken = await refreshAccessToken();
        if (!newToken) {
            window.location = "/";
            return;
        }

        options.headers["Authorization"] = "Bearer " + newToken;
        res = await fetch(url, options);
    }

    return res;
}

async function apiGET(url) {
    const res = await authFetch(url);
    if (!res) return null;
    return res.ok ? res.json() : null;
}

async function apiPOST(url, body = {}) {
    const res = await authFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });

    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
}

function escapeHtml(s) {
    if (s == null) return "";
    return String(s)
        .replaceAll("&","&amp;")
        .replaceAll("<","&lt;")
        .replaceAll(">","&gt;")
        .replaceAll("\"","&quot;")
        .replaceAll("'", "&#39;");
}

function norm(v) {
    return (v || "").toString().toLowerCase();
}
