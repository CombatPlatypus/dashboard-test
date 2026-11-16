import { createOverallAnalysisVolumeChart } from "./volume-chart.js";

import {
    createErrorBalanceChart,
    updateErrorBalanceChart,
} from "../expedition/error-balance-chart.js";

import {
    createLossesRateHistoryChart,
    updateLossesRateHistoryChart,
} from "../losses-rate/charts.js";

import {
    createConsolidatedCompositionChart,
    getConsolidatedCompositionIndicators,
    updateConsolidatedCompositionChart,
} from "../damage-and-losses/consolidated-charts.js";

import {
    createParcelCoverageChart,
    updateParcelCoverageChart,
} from "../parcel-sweeper/charts.js";

import {
    createReverseCompositionChart,
    updateReverseCompositionChart,
} from "../reverse/charts.js";

let overallAnalysisReceiptChart =
    null;

let overallAnalysisExpeditionChart =
    null;

let overallAnalysisErrorBalanceChart = null;

let overallAnalysisDamageAndLossesChart = null;
let overallAnalysisDamageAndLossesIndicators = null;
let overallAnalysisLossesRateHistoryChart = null;

let overallAnalysisParcelCoverageChart =
    null;

let overallAnalysisReverseCompositionChart =
    null;

let overallAnalysisPanel =
    null;

let overallAnalysisVisibilityObserver =
    null;

let overallAnalysisResizeFrame =
    null;

/* REDIMENSIONAMENTO AO EXIBIR A GUIA */

function resizeOverallAnalysisCharts() {
    if (
        overallAnalysisResizeFrame !==
        null
    ) {
        window.cancelAnimationFrame(
            overallAnalysisResizeFrame,
        );
    }

    overallAnalysisResizeFrame =
        window.requestAnimationFrame(
            function () {
                overallAnalysisResizeFrame =
                    null;

                [
                    overallAnalysisReceiptChart,
                    overallAnalysisExpeditionChart,
                    overallAnalysisErrorBalanceChart,
                    overallAnalysisDamageAndLossesChart,
                    overallAnalysisLossesRateHistoryChart,
                    overallAnalysisParcelCoverageChart,
                    overallAnalysisReverseCompositionChart,
                ].forEach(
                    function (chart) {
                        if (!chart) {
                            return;
                        }

                        chart.resize();
                        chart.update("none");
                    },
                );
            },
        );
}

function observeOverallAnalysisVisibility() {
    overallAnalysisVisibilityObserver
        ?.disconnect();

    overallAnalysisVisibilityObserver =
        new MutationObserver(
            function () {
                if (
                    !overallAnalysisPanel
                        .classList
                        .contains(
                            "is-active",
                        )
                ) {
                    return;
                }

                resizeOverallAnalysisCharts();
            },
        );

    overallAnalysisVisibilityObserver.observe(
        overallAnalysisPanel,
        {
            attributes: true,
            attributeFilter: [
                "class",
            ],
        },
    );
}

/* RENDERIZAÇÃO */

function renderOverallAnalysisCharts(
    data,
) {
    if (
        !overallAnalysisReceiptChart ||
        !overallAnalysisExpeditionChart ||
        !overallAnalysisErrorBalanceChart ||
        !overallAnalysisDamageAndLossesChart ||
        !overallAnalysisLossesRateHistoryChart ||
        !overallAnalysisParcelCoverageChart ||
        !overallAnalysisReverseCompositionChart
    ) {
        return false;
    }

    overallAnalysisReceiptChart
        .data
        .datasets[0]
        .data = [
            data.processing.expectedVolume,
            data.processing.receivedVolume,
            data.processing.gap,
        ];

    overallAnalysisExpeditionChart
        .data
        .datasets[0]
        .data = [
            data.expedition.volumeChecked,
            data.expedition.floorVolume,
        ];

    const updateMode =
        overallAnalysisPanel
            ?.classList
            .contains(
                "is-active",
            )
            ? undefined
            : "none";

    overallAnalysisReceiptChart.update(
        updateMode,
    );

    overallAnalysisExpeditionChart.update(
        updateMode,
    );

    updateErrorBalanceChart(overallAnalysisErrorBalanceChart, data.expeditionErrors, updateMode);

    updateConsolidatedCompositionChart(
        overallAnalysisDamageAndLossesChart,
        data.damageAndLossesComposition,
        overallAnalysisDamageAndLossesIndicators,
    );
    updateLossesRateHistoryChart(overallAnalysisLossesRateHistoryChart, data.lossesRateHistory, updateMode);

    updateParcelCoverageChart(
        overallAnalysisParcelCoverageChart,
        data.parcel,
        updateMode,
    );

    updateReverseCompositionChart(
        overallAnalysisReverseCompositionChart,
        data.reverse,
        updateMode,
    );

    return true;
}

function initializeOverallAnalysisCharts(
    rootElement,
) {
    const receiptCanvas =
        rootElement.querySelector(
            "#overallAnalysisReceiptChart",
        );

    const expeditionCanvas =
        rootElement.querySelector(
            "#overallAnalysisExpeditionChart",
        );

    const errorBalanceCanvas = rootElement.querySelector("#overallAnalysisErrorBalanceChart");
    const damageAndLossesCanvas = rootElement.querySelector("#overallAnalysisDamageAndLossesCompositionChart");
    const lossesRateHistoryCanvas = rootElement.querySelector("#overallAnalysisLossesRateHistoryChart");

    const parcelCoverageCanvas =
        rootElement.querySelector(
            "#overallAnalysisParcelCoverageChart",
        );

    const reverseCompositionCanvas =
        rootElement.querySelector(
            "#overallAnalysisReverseCompositionChart",
        );

    if (
        !(receiptCanvas instanceof
            HTMLCanvasElement) ||
        !(expeditionCanvas instanceof
            HTMLCanvasElement) ||
        !(errorBalanceCanvas instanceof HTMLCanvasElement) ||
        !(damageAndLossesCanvas instanceof HTMLCanvasElement) ||
        !(lossesRateHistoryCanvas instanceof HTMLCanvasElement) ||
        !(parcelCoverageCanvas instanceof
            HTMLCanvasElement) ||
        !(reverseCompositionCanvas instanceof
            HTMLCanvasElement) ||
        typeof window.Chart !==
            "function"
    ) {
        console.error(
            "Não foi possível inicializar os gráficos da Análise Geral.",
        );

        return false;
    }

    overallAnalysisPanel =
        rootElement;

    overallAnalysisReceiptChart =
        createOverallAnalysisVolumeChart(
            receiptCanvas,
            "processing",
        );

    overallAnalysisExpeditionChart =
        createOverallAnalysisVolumeChart(
            expeditionCanvas,
            "expedition",
        );

    overallAnalysisErrorBalanceChart = createErrorBalanceChart(errorBalanceCanvas);

    overallAnalysisDamageAndLossesChart = createConsolidatedCompositionChart(damageAndLossesCanvas);
    overallAnalysisDamageAndLossesIndicators =
        getConsolidatedCompositionIndicators(rootElement, "overallAnalysisDamageAndLossesComposition");
    overallAnalysisLossesRateHistoryChart = createLossesRateHistoryChart(lossesRateHistoryCanvas);

    overallAnalysisParcelCoverageChart =
        createParcelCoverageChart(
            parcelCoverageCanvas,
        );

    overallAnalysisReverseCompositionChart =
        createReverseCompositionChart(
            reverseCompositionCanvas,
        );

    observeOverallAnalysisVisibility();

    window.addEventListener(
        "resize",
        resizeOverallAnalysisCharts,
    );

    return true;
}

export {
    initializeOverallAnalysisCharts,
    renderOverallAnalysisCharts,
};
