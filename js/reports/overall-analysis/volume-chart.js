import { CHART_COLORS, CHART_TEXT_COLOR, CHART_VALUE_FONT, getChartPixelRatio } from "../../charts/theme.js";
import { createDashboardChart } from "../../charts/standard.js";
import { getHorizontalBarLabelPosition } from "../core/horizontal-bars-3d.js";
import { formatOverallAnalysisQuantity } from "./view.js";

const OVERALL_ANALYSIS_CHART_PIXEL_RATIO = getChartPixelRatio();

const OVERALL_ANALYSIS_CHART_FONT = {
    family: '"Open Sans", sans-serif',
    size: 14,
};

const OVERALL_ANALYSIS_VOLUME_CHARTS = {
    processing: {
        labels: ["Volume Esperado", "Volume Recebido", "Gap"],
        colors: ["#bdbdbd", CHART_COLORS.green, CHART_COLORS.yellow],
    },
    expedition: {
        labels: ["Volume Expedido", "Volume no Piso"],
        colors: [CHART_COLORS.green, CHART_COLORS.yellow],
    },
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

function createOverallAnalysisVolumeChart(
    canvas,
    section,
    { values, animate = true } = {},
) {
    const { labels, colors } = OVERALL_ANALYSIS_VOLUME_CHARTS[section];
    const chart =
        createDashboardChart(
            canvas,
            {
                type: "bar",

                data: {
                    labels: labels.slice(),

                    datasets: [
                        {
                            data: values ? values.slice() : labels.map(() => null),

                            backgroundColor:
                                colors.slice(),

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

                    animation: animate && {
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

export { createOverallAnalysisVolumeChart };
