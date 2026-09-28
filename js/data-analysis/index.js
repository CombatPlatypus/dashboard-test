import {
    analysisStore,
} from "./core/analysis-store.js";

import {
    initializeDataAvailability,
} from "./core/data-availability.js";

import {
    initializeDataAnalysisModule,
} from "./analysis/analysis-controller.js";

import {
    initializeComparisonModule,
} from "./comparison/comparison-controller.js";

import {
    createNotificationController,
} from "./core/notification.js";

import {
    initializeImportModule,
} from "./importer/import-controller.js";

import {
    initializePreviewModule,
} from "./preview/preview-controller.js";

function initializeAnalysisPanel() {
    const rootElement =
        document.getElementById(
            "analysis",
        );

    if (
        !(rootElement instanceof
            HTMLElement)
    ) {
        return false;
    }

    try {
        const notification =
            createNotificationController(
                rootElement,
            );

        initializeDataAvailability(
            rootElement,
            analysisStore,
        );

        const previewSource =
            initializePreviewModule({
                rootElement,
                store: analysisStore,
                notification,
            });

        initializeDataAnalysisModule({
            rootElement,
            previewSource,
        });

        initializeComparisonModule({
            rootElement,
            previewSource,
        });

        initializeImportModule({
            rootElement,
            store: analysisStore,
            notification,
        });

        return true;
    } catch (error) {
        console.error(
            "Não foi possível inicializar o painel de Análises:",
            error,
        );

        return false;
    }
}

if (
    document.readyState ===
    "loading"
) {
    document.addEventListener(
        "DOMContentLoaded",
        initializeAnalysisPanel,
        {
            once: true,
        },
    );
} else {
    initializeAnalysisPanel();
}

export {
    initializeAnalysisPanel,
};
