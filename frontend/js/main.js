/* ============================================
   MAIN ROUTER / NAVIGATION — main.js
   ============================================ */

/*
   This file acts as the top-level controller for the dashboard.
   It switches screens by calling the correct module loaders:
     - loadInventory()
     - loadSuppliers()
     - loadPOs()

   All these functions are provided by their respective modules.
*/


/* =======================
   Safe loader wrapper
   (prevents errors if a module has not loaded yet)
   ======================= */

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
}


/* =======================
   Initial Screen Loader
   ======================= */

function loadDefaultScreen() {
    // You can change this to "loadPOs" or "loadSuppliers" if you prefer.
    safeCall("loadInventory");
}


/* =======================
   Initialize when dashboard loads
   ======================= */

document.addEventListener("DOMContentLoaded", () => {
    setupNavigation();
    loadDefaultScreen();
});
