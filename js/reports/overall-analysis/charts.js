import {
    formatOverallAnalysisQuantity,
} from "./view.js";

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
        context.font =
            '600 13px "Open Sans", sans-serif';
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
                            },

                            ticks: {
                                color: "#e4e6eb",
                                precision: 0,

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
                            ticks: {
                                color: "#e4e6eb",
                                autoSkip: false,
                                padding: 6,
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
    const receiptCanvas =
        rootElement.querySelector(
            "#overallAnalysisReceiptChart",
        );

    const expeditionCanvas =
        rootElement.querySelector(
            "#overallAnalysisExpeditionChart",
        );

    if (
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
