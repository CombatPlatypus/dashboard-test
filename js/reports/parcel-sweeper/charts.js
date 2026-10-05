import {
    createParcelSummary,
} from "./model.js";

import {
    getParcelState,
    subscribeParcelState,
} from "./state.js";

const parcelChartIntegerFormatter =
    new Intl.NumberFormat(
        "pt-BR",
        {
            maximumFractionDigits: 0,
        },
    );

const parcelChartPercentageFormatter =
    new Intl.NumberFormat(
        "pt-BR",
        {
            style: "percent",
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
        },
    );

let parcelCoverageChart = null;
let parcelAgingChart = null;
let parcelChartVisibilityObserver = null;

const parcelCoverageCenterText = {
    id: "parcelCoverageCenterText",

    afterDraw(
        chart,
    ) {
        const total =
            chart.$parcelTotal ?? 0;

        const scanned =
            chart.$parcelScanned ?? 0;

        const context =
            chart.ctx;

        const area =
            chart.chartArea;

        if (!area) {
            return;
        }

        const centerX =
            (
                area.left +
                area.right
            ) / 2;

        const centerY =
            (
                area.top +
                area.bottom
            ) / 2;

        context.save();
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillStyle = "#f7f7f7";
        context.font =
            "600 24px Open Sans, Arial, sans-serif";

        context.fillText(
            total > 0
                ? parcelChartPercentageFormatter
                    .format(
                        scanned / total,
                    )
                : "—",
            centerX,
            centerY - 7,
        );

        context.fillStyle = "#b7b7b7";
        context.font =
            "12px Open Sans, Arial, sans-serif";

        context.fillText(
            "bipados",
            centerX,
            centerY + 18,
        );

        context.restore();
    },
};

const parcelAgingValueLabels = {
    id: "parcelAgingValueLabels",

    afterDatasetsDraw(
        chart,
    ) {
        const context =
            chart.ctx;

        const metadata =
            chart.getDatasetMeta(
                0,
            );

        context.save();
        context.fillStyle = "#f7f7f7";
        context.font =
            "600 11px Open Sans, Arial, sans-serif";
        context.textAlign = "center";
        context.textBaseline = "bottom";

        metadata.data.forEach(
            function (
                bar,
                index,
            ) {
                const value =
                    chart.data
                        .datasets[0]
                        .data[index];

                if (
                    !Number.isFinite(
                        value,
                    ) ||
                    value <= 0
                ) {
                    return;
                }

                context.fillText(
                    parcelChartIntegerFormatter
                        .format(
                            value,
                        ),
                    bar.x,
                    bar.y - 6,
                );
            },
        );

        context.restore();
    },
};

const parcelAgingTextSpacing = {
    id: "parcelAgingTextSpacing",

    beforeLayout(chart) {
        if ("letterSpacing" in chart.ctx) {
            chart.ctx.letterSpacing = "1px";
        }
    },

    beforeDraw(chart) {
        this.beforeLayout(chart);
    },
};

function createParcelCoverageChart(
    canvas,
) {
    return new window.Chart(
        canvas,
        {
            type: "doughnut",
            data: {
                labels: [
                    "Escaneados",
                    "Não escaneados",
                ],
                datasets: [{
                    data: [
                        0,
                        0,
                    ],
                    backgroundColor: [
                        "#3F51B5",
                        "#e4e6eb",
                    ],
                    borderWidth: 0,
                    hoverOffset: 4,
                }],
            },
            plugins: [
                parcelCoverageCenterText,
            ],
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: "66%",
                animation: {
                    duration: 350,
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
                                const value =
                                    Number(
                                        context.raw,
                                    ) || 0;

                                const total =
                                    context.dataset
                                        .data
                                        .reduce(
                                            function (
                                                sum,
                                                item,
                                            ) {
                                                return sum +
                                                    Number(
                                                        item,
                                                    );
                                            },
                                            0,
                                        );

                                const percentage =
                                    total > 0
                                        ? value /
                                            total
                                        : 0;

                                return (
                                    `${context.label}: ` +
                                    `${parcelChartIntegerFormatter.format(value)} ` +
                                    `(${parcelChartPercentageFormatter.format(percentage)})`
                                );
                            },
                        },
                    },
                },
            },
        },
    );
}

function createParcelAgingChart(
    canvas,
) {
    return new window.Chart(
        canvas,
        {
            type: "bar",
            data: {
                labels: [],
                datasets: [{
                    label: "Pacotes",
                    data: [],
                    backgroundColor: [],
                    borderWidth: 0,
                    borderRadius: 0,
                    maxBarThickness: 70,
                }],
            },
            plugins: [
                parcelAgingTextSpacing,
                parcelAgingValueLabels,
            ],
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        top: 20,
                    },
                },
                animation: {
                    duration: 350,
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
                                const percentage =
                                    context.chart
                                        .$parcelAgingPercentages?.[
                                            context.dataIndex
                                        ] ?? 0;

                                return (
                                    `${parcelChartIntegerFormatter.format(context.raw)} pacotes ` +
                                    `(${parcelChartPercentageFormatter.format(percentage)})`
                                );
                            },
                        },
                    },
                },
                scales: {
                    x: {
                        grid: {
                            display: false,
                        },
                        ticks: {
                            color: "#a8a9ad",
                            font: {
                                size: 14,
                            },
                        },
                    },
                    y: {
                        beginAtZero: true,
                        grace: "12%",
                        grid: {
                            color:
                                "rgba(255, 255, 255, 0.10)",
                        },
                        ticks: {
                            color: "#b7b7b7",
                            precision: 0,
                        },
                    },
                },
            },
        },
    );
}

function updateParcelCharts(
    state,
) {
    if (
        !parcelCoverageChart ||
        !parcelAgingChart
    ) {
        return;
    }

    const summary =
        createParcelSummary(
            state.rows,
        );

    parcelCoverageChart
        .data
        .datasets[0]
        .data = [
            summary.scannedCount,
            summary.unscannedCount,
        ];

    parcelCoverageChart
        .$parcelTotal =
            summary.totalRows;

    parcelCoverageChart
        .$parcelScanned =
            summary.scannedCount;

    parcelCoverageChart.update();

    parcelAgingChart.data.labels =
        summary.agingDistribution
            .map(
                function (bin) {
                    return [
                        bin.label,
                        parcelChartPercentageFormatter
                            .format(
                                bin.percentage,
                            ),
                    ];
                },
            );

    parcelAgingChart
        .data
        .datasets[0]
        .data =
            summary.agingDistribution
                .map(
                    function (bin) {
                        return bin.count;
                    },
                );

    parcelAgingChart
        .data
        .datasets[0]
        .backgroundColor =
            summary.agingDistribution
                .map(
                    function (bin) {
                        return bin.color;
                    },
                );

    parcelAgingChart
        .$parcelAgingPercentages =
            summary.agingDistribution
                .map(
                    function (bin) {
                        return bin.percentage;
                    },
                );

    parcelAgingChart.update();
}

function resizeParcelCharts() {
    window.requestAnimationFrame(
        function () {
            parcelCoverageChart
                ?.resize();
            parcelAgingChart
                ?.resize();
        },
    );
}

function observeParcelChartVisibility(
    panel,
) {
    parcelChartVisibilityObserver
        ?.disconnect();

    parcelChartVisibilityObserver =
        new MutationObserver(
            function () {
                if (
                    panel.classList
                        .contains(
                            "is-active",
                        )
                ) {
                    resizeParcelCharts();
                }
            },
        );

    parcelChartVisibilityObserver
        .observe(
            panel,
            {
                attributes: true,
                attributeFilter: [
                    "class",
                ],
            },
        );
}

function initializeParcelCharts(
    rootElement = document,
) {
    const panel =
        rootElement.id === "parcel"
            ? rootElement
            : rootElement.querySelector(
                "#parcel",
            );

    const coverageCanvas =
        rootElement.querySelector(
            "#parcelCoverageChart",
        );

    const agingCanvas =
        rootElement.querySelector(
            "#parcelAgingChart",
        );

    if (
        !(panel instanceof HTMLElement) ||
        !(
            coverageCanvas instanceof
                HTMLCanvasElement
        ) ||
        !(
            agingCanvas instanceof
                HTMLCanvasElement
        ) ||
        typeof window.Chart !==
            "function"
    ) {
        return false;
    }

    if (
        panel.dataset
            .parcelChartsInitialized ===
        "true"
    ) {
        return true;
    }

    panel.dataset
        .parcelChartsInitialized =
            "true";

    parcelCoverageChart =
        createParcelCoverageChart(
            coverageCanvas,
        );

    parcelAgingChart =
        createParcelAgingChart(
            agingCanvas,
        );

    subscribeParcelState(
        updateParcelCharts,
    );

    updateParcelCharts(
        getParcelState(),
    );

    observeParcelChartVisibility(
        panel,
    );

    return true;
}

export {
    initializeParcelCharts,
    updateParcelCharts,
};
