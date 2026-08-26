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

import {
    initializeLossesRateExport,
} from "./losses-rate-export.js";

/* INICIALIZA O PAINEL DE RELATÓRIOS */

function initializeReportsPanel() {
    initializePlanningLhList();
    initializeLossesRateReport();
    initializeLossesRateCharts();
    initializeLossesRateImport();
    initializeLossesRateExport();
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
