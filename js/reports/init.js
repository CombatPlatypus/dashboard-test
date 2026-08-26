import {
    initializePlanningLhList,
} from "./planning.js";

import {
    initializeLossesRateReport,
} from "./losses-rate.js";

import {
    initializeLossesRateCharts,
} from "./losses-rate-charts.js";

/* INICIALIZA O PAINEL DE RELATÓRIOS */

function initializeReportsPanel() {
    initializePlanningLhList();
    initializeLossesRateReport();
    initializeLossesRateCharts();
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
