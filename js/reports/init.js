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
    expeditionReport,
} from "./expedition/index.js";

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

    reportManager.register(
        expeditionReport,
    );

    reportManager.initializeAll();

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
