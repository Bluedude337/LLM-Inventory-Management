/* ============================================
   MAIN ROUTER / NAVIGATION — main.js
   ============================================ */

/*
   Controls all navigation between screens:
     - Inventory
     - Suppliers
     - Purchase Orders
     - Entries
*/

function safeCall(fnName, ...args) {
    if (typeof window[fnName] === "function") {
        return window[fnName](...args);
    } else {
        console.error(`Function ${fnName} is not defined (module not loaded?)`);
        alert("Module not loaded correctly: " + fnName);
    }
}

/* =======================
   Sidebar Navigation
   ======================= */

function setupNavigation() {

    // Inventory
    const invBtn = document.getElementById("navInventory");
    if (invBtn) {
        invBtn.addEventListener("click", () => safeCall("loadInventory"));
    }

    // Suppliers
    const supBtn = document.getElementById("navSuppliers");
    if (supBtn) {
        supBtn.addEventListener("click", () => safeCall("loadSuppliers"));
    }

    // Purchase Orders
    const poBtn = document.getElementById("navPOs");
    if (poBtn) {
        poBtn.addEventListener("click", () => safeCall("loadPOs"));
    }

    // Entries  ← **FIXED NEW ENTRY**
    const entBtn = document.getElementById("navEntries");
    if (entBtn) {
        entBtn.addEventListener("click", () => safeCall("loadEntriesPage"));
    }

    // Exits (placeholder for future)
    const exitBtn = document.getElementById("navExits");
    if (exitBtn) {
        exitBtn.addEventListener("click", () => {
            alert("Exits page not implemented yet.");
        });
    }
}

/* =======================
   Load Default Screen
   ======================= */

function loadDefaultScreen() {
    // Change this if you want another default screen
    safeCall("loadInventory");
}

/* =======================
   Startup
   ======================= */

document.addEventListener("DOMContentLoaded", () => {
    setupNavigation();
    loadDefaultScreen();
});
