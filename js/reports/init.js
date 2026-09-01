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

import {
    initializeReceiptReport,
} from "./receipt.js";

import {
    initializeReceiptImport,
} from "./receipt-import.js";

import {
    initializeReceiptCharts,
} from "./receipt-charts.js";

import {
    initializeReceiptExport,
} from "./receipt-export.js";

/* INICIALIZA O PAINEL DE RELATÓRIOS */

function initializeReportsPanel() {

    // PLANEJAMENTO

    initializePlanningLhList();

    // RECEBIMENTO

    initializeReceiptReport();
    initializeReceiptCharts();
    initializeReceiptImport();
    initializeReceiptExport();

    // TAXA DE PERDAS

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
