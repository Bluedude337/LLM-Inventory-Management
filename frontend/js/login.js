/* ============================================
   LOGIN & BOOTSTRAP ADMIN MODULE — login.js
============================================ */

let ACCESS_TOKEN = null;

/* -------------------------------
   LOGIN
-------------------------------- */
async function performLogin() {
    const username = document.getElementById("loginUsername").value.trim();
    const password = document.getElementById("loginPassword").value.trim();
    const msg = document.getElementById("loginMessage");

    if (!username || !password) {
        msg.innerHTML = "<span style='color:#f87171;'>Fill all fields.</span>";
        return;
    }

    try {
        const res = await fetch("/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        // ----------------------------------------
        // BOOTSTRAP MODE LOGIN
        // ----------------------------------------
        if (data.bootstrap === true) {
            showBootstrapModal();
            return;
        }

        // ----------------------------------------
        // NORMAL LOGIN
        // ----------------------------------------
        if (!res.ok) {
            msg.innerHTML = "<span style='color:#f87171;'>Invalid credentials.</span>";
            return;
        }

        ACCESS_TOKEN = data.access_token;

        sessionStorage.setItem("access_token", ACCESS_TOKEN);
        sessionStorage.setItem("username", username);

        window.location = "/dashboard";

    } catch (err) {
        console.error(err);
        msg.innerHTML = "<span style='color:#f87171;'>Connection error.</span>";
    }
}

/* -------------------------------
   BOOTSTRAP ADMIN CREATION
-------------------------------- */
async function createBootstrapAdmin() {
    const username = document.getElementById("bsUsername").value.trim();
    const password = document.getElementById("bsPassword").value.trim();
    const msg = document.getElementById("bsMessage");

    if (!username || !password) {
        msg.innerHTML = "<span style='color:#f87171;'>Fill all fields.</span>";
        return;
    }

    const res = await fetch("/auth/bootstrap-create-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (!res.ok) {
        msg.innerHTML = "<span style='color:#f87171;'>" + (data.detail || "Error creating admin.") + "</span>";
        return;
    }

    msg.innerHTML = "<span style='color:#4ade80;'>Master admin created successfully!</span>";

    setTimeout(() => {
        closeBootstrapModal();
        window.location.reload();
    }, 1200);
}

/* -------------------------------
   LOGOUT
-------------------------------- */
async function logout() {
    try {
        await fetch("/auth/logout", { method: "POST", credentials: "include" });
    } catch (_) {}
    sessionStorage.clear();
    window.location = "/";
}

/* -------------------------------
   REFRESH
-------------------------------- */
async function refreshAccessToken() {
    try {
        const res = await fetch("/auth/refresh", {
            method: "POST",
            credentials: "include"
        });

        if (!res.ok) {
            logout();
            return null;
        }

        const data = await res.json();
        ACCESS_TOKEN = data.access_token;
        sessionStorage.setItem("access_token", ACCESS_TOKEN);
        return ACCESS_TOKEN;

    } catch (err) {
        logout();
        return null;
    }
}

/* -------------------------------
   TOKEN RETRIEVAL
-------------------------------- */
async function getAccessToken() {
    const token = sessionStorage.getItem("access_token");
    if (!token) return null;
    ACCESS_TOKEN = token;
    return ACCESS_TOKEN;
}

/* -------------------------------
   BOOTSTRAP MODAL CONTROL
-------------------------------- */
function showBootstrapModal() {
    document.getElementById("bootstrapModal").style.display = "flex";
}

function closeBootstrapModal() {
    document.getElementById("bootstrapModal").style.display = "none";
}
