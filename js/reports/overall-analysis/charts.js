import { createOverallAnalysisVolumeChart } from "./volume-chart.js";

import {
    createErrorBalanceChart,
    updateErrorBalanceChart,
} from "../expedition/error-balance-chart.js";

import {
    createLossesRateHistoryChart,
    updateLossesRateHistoryChart,
    updateLossesRateHistoryHighlight,
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

function getOverallAnalysisChartUpdateMode() {
    return overallAnalysisPanel?.classList.contains("is-active") ? undefined : "none";
}

function renderOverallAnalysisReceiptChart(processing, updateMode = getOverallAnalysisChartUpdateMode()) {
    if (!overallAnalysisReceiptChart) {
        return false;
    }

    overallAnalysisReceiptChart.data.datasets[0].data = [
        processing.expectedVolume,
        processing.receivedVolume,
        processing.gap,
    ];
    overallAnalysisReceiptChart.update(updateMode);
    return true;
}

function renderOverallAnalysisCharts(data, previous) {
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

    const updateMode = getOverallAnalysisChartUpdateMode();

    if (data.processing !== previous?.processing &&
        ["expectedVolume", "receivedVolume", "gap"].some(key => data.processing[key] !== previous?.processing[key])) {
        renderOverallAnalysisReceiptChart(data.processing, updateMode);
    }
    if (data.expedition.volumeChecked !== previous?.expedition.volumeChecked ||
        data.expedition.floorVolume !== previous?.expedition.floorVolume) {
        overallAnalysisExpeditionChart.data.datasets[0].data = [data.expedition.volumeChecked, data.expedition.floorVolume];
        overallAnalysisExpeditionChart.update(updateMode);
    }
    if (data.expeditionErrors !== previous?.expeditionErrors &&
        ["labelingErrors", "sortingErrors", "totalRevertedErrors", "finalErrors"]
            .some(key => data.expeditionErrors[key] !== previous?.expeditionErrors[key])) {
        updateErrorBalanceChart(overallAnalysisErrorBalanceChart, data.expeditionErrors, updateMode);
    }
    if (data.damageAndLossesComposition !== previous?.damageAndLossesComposition) {
        updateConsolidatedCompositionChart(
            overallAnalysisDamageAndLossesChart,
            data.damageAndLossesComposition,
            overallAnalysisDamageAndLossesIndicators,
        );
    }
    const history = data.lossesRateHistory;
    if (history !== previous?.lossesRateHistory) {
        if (history.monthlyRates.some((rate, index) => rate !== previous?.lossesRateHistory.monthlyRates[index])) {
            updateLossesRateHistoryChart(overallAnalysisLossesRateHistoryChart, history, updateMode);
        } else if (history.activeMonth !== previous.lossesRateHistory.activeMonth) {
            updateLossesRateHistoryHighlight(overallAnalysisLossesRateHistoryChart, history.activeMonth, updateMode);
        }
    }
    if (data.parcel !== previous?.parcel &&
        ["expectedTotalCount", "expectedScannedCount", "expectedUnscannedCount"]
            .some(key => data.parcel[key] !== previous?.parcel[key])) {
        updateParcelCoverageChart(overallAnalysisParcelCoverageChart, data.parcel, updateMode);
    }
    if (data.reverse !== previous?.reverse &&
        (data.reverse.hasData !== previous?.reverse.hasData ||
            Object.keys(data.reverse.quantities).some(key => data.reverse.quantities[key] !== previous?.reverse.quantities[key]))) {
        updateReverseCompositionChart(overallAnalysisReverseCompositionChart, data.reverse, updateMode);
    }

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
    renderOverallAnalysisReceiptChart,
};
