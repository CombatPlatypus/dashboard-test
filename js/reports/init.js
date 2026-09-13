import {
    reportManager,
} from "./core/report-manager.js";

import {
    planningReport,
} from "./planning/index.js";

import {
    receiptReport,
} from "./receipt/index.js";

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

    // RELATÓRIOS MODULARIZADOS

    reportManager.register(
        planningReport,
    );

    reportManager.register(
        receiptReport,
    );

    reportManager.initializeAll();

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
