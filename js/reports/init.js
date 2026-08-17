import {
    initializePlanningLhList,
} from "./planning.js";

/* INICIALIZA O PAINEL DE RELATÓRIOS */

function initializeReportsPanel() {
    initializePlanningLhList();
}

if (
    document.readyState ===
    "loading"
) {
    document.addEventListener(
        "DOMContentLoaded",
        initializeReportsPanel,
        {
            once: true,
        },
    );
} else {
    initializeReportsPanel();
}
