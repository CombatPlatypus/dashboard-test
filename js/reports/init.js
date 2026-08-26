import {
    initializePlanningLhList,
} from "./planning.js";

import {
    initializeLossesRateReport,
} from "./losses-rate.js";

import {
    initializeLossesRateCharts,
} from "./losses-rate-charts.js";

import {
    initializeLossesRateImport,
} from "./losses-rate-import.js";

/* INICIALIZA O PAINEL DE RELATÓRIOS */

function initializeReportsPanel() {
    initializePlanningLhList();
    initializeLossesRateReport();
    initializeLossesRateCharts();
    initializeLossesRateImport();
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
