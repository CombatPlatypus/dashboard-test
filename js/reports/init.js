import {
    initializePlanningLhList,
} from "./planning.js";

import {
    initializePlanningImport,
} from "./planning-import.js";

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

import {
    initializeExpeditionReport,
} from "./expedition.js";

import {
    initializeExpeditionImport,
} from "./expedition-import.js";

import {
    initializeExpeditionErrorsImport,
} from "./expedition-errors-import.js";

import {
    initializeExpeditionCharts,
} from "./expedition-charts.js";

import {
    initializeExpeditionErrorsCharts,
} from "./expedition-errors-charts.js";

import {
    initializeReportNotifications,
} from "./report-notifications.js";

/* INICIALIZA O PAINEL DE RELATÓRIOS */

function initializeReportsPanel() {

    // BARRA DE NOTIFICAÇÕES

    initializeReportNotifications();

    // PLANEJAMENTO

    initializePlanningLhList();
    initializePlanningImport();

    // RECEBIMENTO

    initializeReceiptReport();
    initializeReceiptCharts();
    initializeReceiptImport();
    initializeReceiptExport();

    // EXPEDIÇÃO

    initializeExpeditionReport();
    initializeExpeditionImport();
    initializeExpeditionErrorsImport();
    initializeExpeditionCharts();
    initializeExpeditionErrorsCharts();

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
