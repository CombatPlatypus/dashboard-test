import { CHART_COLORS, getChartPixelRatio } from "../../charts/theme.js";
import { getHorizontalBarLabelPosition } from "../core/horizontal-bars-3d.js";
import { createDashboardChart } from "../../charts/standard.js";
import { CHART_TEXT_COLOR, CHART_VALUE_FONT } from "../../charts/theme.js";

import {
    createParcelCoverageChart,
    updateParcelCoverageChart,
} from "../parcel-sweeper/charts.js";

import {
    createReverseCompositionChart,
    updateReverseCompositionChart,
} from "../reverse/charts.js";

import {
    formatOverallAnalysisQuantity,
} from "./view.js";

let overallAnalysisReceiptChart =
    null;

let overallAnalysisExpeditionChart =
    null;

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

const OVERALL_ANALYSIS_CHART_PIXEL_RATIO = getChartPixelRatio();

const OVERALL_ANALYSIS_CHART_FONT = {
    family: '"Open Sans", sans-serif',
    size: 14,
};

/* ESPAÇAMENTO DOS TEXTOS DO CANVAS */

function applyOverallAnalysisTextSpacing(
    chart,
) {
    if (
        "letterSpacing" in
        chart.ctx
    ) {
        chart.ctx.letterSpacing =
            "1px";
    }
}

const overallAnalysisTextSpacingPlugin = {
    id: "overallAnalysisTextSpacing",

    beforeDraw(
        chart,
    ) {
        applyOverallAnalysisTextSpacing(
            chart,
        );
    },

    beforeDatasetsDraw(
        chart,
    ) {
        applyOverallAnalysisTextSpacing(
            chart,
        );
    },

    beforeTooltipDraw(
        chart,
    ) {
        applyOverallAnalysisTextSpacing(
            chart,
        );
    },
};

/* VALORES AO FINAL DAS BARRAS */

const overallAnalysisBarValuesPlugin = {
    id: "overallAnalysisBarValues",

    afterDatasetsDraw(
        chart,
    ) {
        if (!chart.chartArea) {
            return;
        }

        const context =
            chart.ctx;

        const chartArea =
            chart.chartArea;

        context.save();

        if (
            "letterSpacing" in
            context
        ) {
            context.letterSpacing =
                "1px";
        }

        context.font =
            CHART_VALUE_FONT;
        context.textBaseline =
            "middle";
        context.lineWidth = 3;
        context.strokeStyle =
            "#101010";
        context.fillStyle =
            CHART_TEXT_COLOR;

        chart.data.datasets.forEach(
            function (
                dataset,
                datasetIndex,
            ) {
                const metadata =
                    chart.getDatasetMeta(
                        datasetIndex,
                    );

                metadata.data.forEach(
                    function (
                        bar,
                        index,
                    ) {
                        const value =
                            dataset.data[index];

                        if (
                            value === null ||
                            value === undefined ||
                            !Number.isFinite(
                                Number(value),
                            )
                        ) {
                            return;
                        }

                        const label =
                            formatOverallAnalysisQuantity(
                                value,
                            );

                        const position = getHorizontalBarLabelPosition(bar);
                        const positionX = position.x;
                        context.textAlign = "left";

                        context.strokeText(
                            label,
                            positionX,
                            position.y,
                        );

                        context.fillText(
                            label,
                            positionX,
                            position.y,
                        );
                    },
                );
            },
        );

        context.restore();
    },
};

/* CONFIGURAÇÃO COMPARTILHADA */

function createOverallAnalysisChart(
    canvas,
    labels,
    colors,
) {
    const chart =
        createDashboardChart(
            canvas,
            {
                type: "bar",

                data: {
                    labels,

                    datasets: [
                        {
                            data:
                                labels.map(
                                    function () {
                                        return null;
                                    },
                                ),

                            backgroundColor:
                                colors,

                            borderWidth: 0,
                            borderRadius: 0,
                            barPercentage: 0.72,
                            categoryPercentage: 0.78,
                        },
                    ],
                },

                plugins: [
                    overallAnalysisTextSpacingPlugin,
                    overallAnalysisBarValuesPlugin,
                ],

                options: {
                    indexAxis: "y",
                    responsive: true,
                    maintainAspectRatio: false,
                    devicePixelRatio:
                        OVERALL_ANALYSIS_CHART_PIXEL_RATIO,

                    animation: {
                        duration: 250,
                    },

                    layout: {
                        padding: {
                            right: 55,
                        },
                    },

                    plugins: {
                        legend: {
                            display: false,
                        },

                        tooltip: {
                            enabled: false,

                            titleFont: {
                                ...OVERALL_ANALYSIS_CHART_FONT,
                                weight: "600",
                            },

                            bodyFont:
                                OVERALL_ANALYSIS_CHART_FONT,

                            callbacks: {
                                label(
                                    context,
                                ) {
                                    return (
                                        context.label +
                                        ": " +
                                        formatOverallAnalysisQuantity(
                                            context.raw,
                                        )
                                    );
                                },
                            },
                        },
                    },

                    scales: {
                        x: {
                            beginAtZero: true,
                            grace: "12%",

                            title: {
                                display: true,
                                text:
                                    "Quantidade de pacotes",
                                color: CHART_TEXT_COLOR,

                                font:
                                    OVERALL_ANALYSIS_CHART_FONT,

                                padding: {
                                    top: 15,
                                },
                            },

                            ticks: {
                                color: CHART_TEXT_COLOR,
                                precision: 0,

                                font:
                                    OVERALL_ANALYSIS_CHART_FONT,

                                callback(
                                    value,
                                ) {
                                    return formatOverallAnalysisQuantity(
                                        value,
                                    );
                                },
                            },

                            grid: {
                                color:
                                    "rgba(82, 82, 82, 0.45)",
                            },
                        },

                        y: {
                            afterFit(
                                scale,
                            ) {
                                scale.width +=
                                    18;
                            },

                            ticks: {
                                color: CHART_TEXT_COLOR,
                                autoSkip: false,
                                padding: 8,

                                font:
                                    OVERALL_ANALYSIS_CHART_FONT,
                            },

                            grid: {
                                display: false,
                            },
                        },
                    },
                },
            },
        );

    return chart;
}

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
        createOverallAnalysisChart(
            receiptCanvas,
            [
                "Volume Esperado",
                "Volume Recebido",
                "Gap",
            ],
            [
                "#bdbdbd",
                CHART_COLORS.green,
                CHART_COLORS.yellow,
            ],
        );

    overallAnalysisExpeditionChart =
        createOverallAnalysisChart(
            expeditionCanvas,
            [
                "Volume Expedido",
                "Volume no Piso",
            ],
            [
                CHART_COLORS.green,
                CHART_COLORS.yellow,
            ],
        );

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
