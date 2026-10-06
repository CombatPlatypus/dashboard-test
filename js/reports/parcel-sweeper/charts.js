import {
    createParcelSummary,
} from "./model.js";

import {
    getParcelState,
    subscribeParcelState,
} from "./state.js";

import {
    drawParcelCoverage3D,
} from "./coverage-3d.js";

import {
    createParcelHorizontalChart,
    getParcelHorizontalChartHeight,
    updateParcelHorizontalChart,
} from "./horizontal-charts.js";

const PARCEL_BAR_COLOR = "#3F51B5";

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

const parcelAgingWindowLabels = Object.freeze({
    "1-6h": "1 - 6h",
    "7-12h": "7 - 12h",
    "13-24h": "13 - 24h",
    "25-48h": "25 - 48h",
    "49-96h": "2 - 4 Dias",
    "97-168h": "5 - 7 Dias",
    "over-168h": "Super Expedite",
});

function createParcelAgingChartLabel(bin) {
    return [
        parcelAgingWindowLabels[bin.key] ?? bin.label,
        parcelChartPercentageFormatter.format(bin.percentage),
    ];
}

let parcelCoverageChart = null;
let parcelAgingChart = null;
let parcelFinalStatusChart = null;
let parcelNextStepActionChart = null;
let parcelChartVisibilityObserver = null;

const parcelCoverageProjection = {
    id: "parcel-coverage-3d",

    beforeDatasetDraw(chart, args) {
        if (args.index !== 0) {
            return;
        }

        const dataset = chart.data.datasets[0];
        chart.$parcelCoverageGeometry = drawParcelCoverage3D({
            context: chart.ctx,
            area: chart.chartArea,
            values: dataset.data,
            colors: dataset.backgroundColor,
        });

        // Suppress only this chart's default flat arcs.
        return false;
    },
};

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

        const geometry =
            chart.$parcelCoverageGeometry;

        if (!geometry) {
            return;
        }

        const centerX = geometry.centerX;
        const centerY = geometry.textCenterY;

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
            "Bipados",
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
                    hoverOffset: 0,
                }],
            },
            plugins: [
                parcelCoverageProjection,
                parcelCoverageCenterText,
            ],
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: "66%",
                animation: false,
                events: [],
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
                    backgroundColor: PARCEL_BAR_COLOR,
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
                events: [],
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
                        enabled: false,
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
        !parcelAgingChart ||
        !parcelFinalStatusChart ||
        !parcelNextStepActionChart
    ) {
        return;
    }

    const summary =
        createParcelSummary(
            state.rows,
            state.operatorKindOverrides,
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
                createParcelAgingChartLabel,
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
        .backgroundColor = PARCEL_BAR_COLOR;

    parcelAgingChart
        .$parcelAgingPercentages =
            summary.agingDistribution
                .map(
                    function (bin) {
                        return bin.percentage;
                    },
                );

    parcelAgingChart.update();

    const horizontalHeight = getParcelHorizontalChartHeight(Math.max(
        summary.finalStatusDistribution.length, summary.nextStepActionDistribution.length));
    updateParcelHorizontalChart(parcelFinalStatusChart, summary.finalStatusDistribution, {
        title: "Quantidade de pacotes por Final Status", color: PARCEL_BAR_COLOR, height: horizontalHeight,
    });
    updateParcelHorizontalChart(parcelNextStepActionChart, summary.nextStepActionDistribution, {
        title: "Quantidade de pacotes por Next Step Action", color: PARCEL_BAR_COLOR, height: horizontalHeight,
    });
}

function resizeParcelCharts() {
    window.requestAnimationFrame(
        function () {
            parcelCoverageChart
                ?.resize();
            parcelAgingChart
                ?.resize();
            parcelFinalStatusChart?.resize();
            parcelNextStepActionChart?.resize();
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

    const finalStatusCanvas = rootElement.querySelector("#parcelFinalStatusChart");
    const nextStepActionCanvas = rootElement.querySelector("#parcelNextStepActionChart");

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
        !(finalStatusCanvas instanceof HTMLCanvasElement) ||
        !(nextStepActionCanvas instanceof HTMLCanvasElement) ||
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
    parcelFinalStatusChart = createParcelHorizontalChart(finalStatusCanvas, PARCEL_BAR_COLOR);
    parcelNextStepActionChart = createParcelHorizontalChart(nextStepActionCanvas, PARCEL_BAR_COLOR);

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
    createParcelAgingChartLabel,
    createParcelAgingChart,
    createParcelCoverageChart,
    initializeParcelCharts,
    updateParcelCharts,
};
