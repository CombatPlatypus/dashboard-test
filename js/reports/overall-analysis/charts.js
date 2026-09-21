import {
    formatOverallAnalysisQuantity,
} from "./view.js";

let overallAnalysisCapacityChart =
    null;

let overallAnalysisPackagesAnalysisChart =
    null;

let overallAnalysisLossRateChart =
    null;

let overallAnalysisReceiptChart =
    null;

let overallAnalysisExpeditionChart =
    null;

let overallAnalysisPanel =
    null;

let overallAnalysisVisibilityObserver =
    null;

let overallAnalysisResizeFrame =
    null;

const OVERALL_ANALYSIS_CHART_PIXEL_RATIO =
    Math.max(
        typeof window !== "undefined"
            ? window.devicePixelRatio || 1
            : 1,
        2,
    );

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

/* GRÁFICOS DE ROSCA DOS CARDS */

function createOverallAnalysisMiniChart(
    canvas,
    activeColor,
) {
    return new window.Chart(
        canvas,
        {
            type: "doughnut",

            data: {
                datasets: [
                    {
                        data: [
                            0,
                            1,
                        ],

                        backgroundColor: [
                            activeColor,
                            "#4b4b4b",
                        ],

                        hoverBackgroundColor: [
                            activeColor,
                            "#4b4b4b",
                        ],

                        borderWidth: 0,
                    },
                ],
            },

            options: {
                responsive: true,
                maintainAspectRatio: false,
                devicePixelRatio:
                    OVERALL_ANALYSIS_CHART_PIXEL_RATIO,
                cutout: "72%",
                events: [],

                animation: {
                    duration: 250,
                },

                plugins: {
                    legend: {
                        display: false,
                    },

                    tooltip: {
                        enabled: false,
                    },
                },
            },
        },
    );
}

function updateOverallAnalysisMiniChart(
    chart,
    progress,
    activeColor,
    updateMode,
) {
    const normalizedProgress =
        progress === null ||
        progress === undefined ||
        !Number.isFinite(
            Number(progress),
        )
            ? 0
            : Math.min(
                Math.max(
                    Number(progress),
                    0,
                ),
                1,
            );

    const dataset =
        chart.data.datasets[0];

    dataset.data = [
        normalizedProgress,
        1 - normalizedProgress,
    ];

    dataset.backgroundColor = [
        activeColor,
        "#4b4b4b",
    ];

    dataset.hoverBackgroundColor =
        dataset.backgroundColor;

    chart.update(
        updateMode,
    );
}

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
            '600 14px "Open Sans", sans-serif';
        context.textBaseline =
            "middle";
        context.lineWidth = 3;
        context.strokeStyle =
            "#101010";
        context.fillStyle =
            "#e4e6eb";

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

                        const textWidth =
                            context
                                .measureText(
                                    label,
                                )
                                .width;

                        let positionX =
                            bar.x + 8;

                        let textAlign =
                            "left";

                        if (
                            positionX +
                                textWidth >
                            chartArea.right
                        ) {
                            positionX =
                                bar.x - 8;

                            textAlign =
                                "right";
                        }

                        context.textAlign =
                            textAlign;

                        context.strokeText(
                            label,
                            positionX,
                            bar.y,
                        );

                        context.fillText(
                            label,
                            positionX,
                            bar.y,
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
        new window.Chart(
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
                                color: "#e4e6eb",

                                font:
                                    OVERALL_ANALYSIS_CHART_FONT,

                                padding: {
                                    top: 15,
                                },
                            },

                            ticks: {
                                color: "#e4e6eb",
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
                                color: "#e4e6eb",
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
                    overallAnalysisCapacityChart,
                    overallAnalysisPackagesAnalysisChart,
                    overallAnalysisLossRateChart,
                    overallAnalysisReceiptChart,
                    overallAnalysisExpeditionChart,
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
        !overallAnalysisCapacityChart ||
        !overallAnalysisPackagesAnalysisChart ||
        !overallAnalysisLossRateChart ||
        !overallAnalysisReceiptChart ||
        !overallAnalysisExpeditionChart
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

    const capacityProgress =
        data.cards.capacity.usageRate;

    const packagesAnalysisProgress =
        data.cards.packagesAnalysis.rate;

    const lossRateProgress =
        data.cards.lossesRate.rate !==
            null &&
        data.cards.lossesRate.limit > 0
            ? data.cards.lossesRate.rate /
                data.cards.lossesRate.limit
            : null;

    updateOverallAnalysisMiniChart(
        overallAnalysisCapacityChart,
        capacityProgress,
        "#e4e6eb",
        updateMode,
    );

    updateOverallAnalysisMiniChart(
        overallAnalysisPackagesAnalysisChart,
        packagesAnalysisProgress,
        "#d9534f",
        updateMode,
    );

    overallAnalysisPackagesAnalysisChart
        .canvas
        .setAttribute(
            "aria-label",
            data.cards.packagesAnalysis
                .value === null
                ? "Pacotes em análise, sem dados importados"
                : (
                    formatOverallAnalysisQuantity(
                        data.cards
                            .packagesAnalysis
                            .value,
                    ) +
                    " pacotes em análise de " +
                    formatOverallAnalysisQuantity(
                        data.cards
                            .packagesAnalysis
                            .total,
                    ) +
                    " registros"
                ),
        );

    updateOverallAnalysisMiniChart(
        overallAnalysisLossRateChart,
        lossRateProgress,
        data.cards.lossesRate
            .withinLimit === false
            ? "#d9534f"
            : "#e4e6eb",
        updateMode,
    );

    overallAnalysisReceiptChart.update(
        updateMode,
    );

    overallAnalysisExpeditionChart.update(
        updateMode,
    );

    return true;
}

function initializeOverallAnalysisCharts(
    rootElement,
) {
    const capacityCanvas =
        rootElement.querySelector(
            "#overallAnalysisCapacityChart",
        );

    const lossRateCanvas =
        rootElement.querySelector(
            "#overallAnalysisLossRateChart",
        );

    const packagesAnalysisCanvas =
        rootElement.querySelector(
            "#overallAnalysisPackagesAnalysisChart",
        );

    const receiptCanvas =
        rootElement.querySelector(
            "#overallAnalysisReceiptChart",
        );

    const expeditionCanvas =
        rootElement.querySelector(
            "#overallAnalysisExpeditionChart",
        );

    if (
        !(capacityCanvas instanceof
            HTMLCanvasElement) ||
        !(packagesAnalysisCanvas instanceof
            HTMLCanvasElement) ||
        !(lossRateCanvas instanceof
            HTMLCanvasElement) ||
        !(receiptCanvas instanceof
            HTMLCanvasElement) ||
        !(expeditionCanvas instanceof
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

    overallAnalysisCapacityChart =
        createOverallAnalysisMiniChart(
            capacityCanvas,
            "#e4e6eb",
        );

    overallAnalysisPackagesAnalysisChart =
        createOverallAnalysisMiniChart(
            packagesAnalysisCanvas,
            "#d9534f",
        );

    overallAnalysisLossRateChart =
        createOverallAnalysisMiniChart(
            lossRateCanvas,
            "#e4e6eb",
        );

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
                "#63b967",
                "#f2c94c",
            ],
        );

    overallAnalysisExpeditionChart =
        createOverallAnalysisChart(
            expeditionCanvas,
            [
                "Volume Conferido",
                "Volume no Piso",
            ],
            [
                "#63b967",
                "#f2c94c",
            ],
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
