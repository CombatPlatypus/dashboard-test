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
    damageAndLossesReport,
} from "./damage-and-losses/index.js";

import {
    lossesRateReport,
} from "./losses-rate/index.js";

import {
    overallAnalysisReport,
} from "./overall-analysis/index.js";

import {
    initializeReportNotifications,
} from "./report-notifications.js";

import {
    initializeReportSession,
} from "./session.js";

import {
    initializeReportGlobalInputs,
} from "./global-inputs.js";

/* INICIALIZA O PAINEL DE RELATÓRIOS */

function initializeReportsPanel() {

    // BARRA DE NOTIFICAÇÕES

    initializeReportNotifications();

    // INPUTS COMPARTILHADOS ENTRE OS RELATÓRIOS

    initializeReportGlobalInputs();

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

    reportManager.register(
        damageAndLossesReport,
    );

    reportManager.register(
        lossesRateReport,
    );

    reportManager.register(
        overallAnalysisReport,
    );

    reportManager.initializeAll();

    // SESSÃO DOS RELATÓRIOS

    initializeReportSession();
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
