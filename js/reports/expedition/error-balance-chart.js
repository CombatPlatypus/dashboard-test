import { CHART_AXIS_FONT, CHART_COLORS, CHART_TEXT_COLOR, CHART_VALUE_FONT } from "../../charts/theme.js";
import { createDashboardChart } from "../../charts/standard.js";
import { createHorizontalBars3DPlugin, getHorizontalBarLabelPosition } from "../core/horizontal-bars-3d.js";

const errorChartQuantityFormatter = new Intl.NumberFormat("pt-BR");

function formatErrorChartQuantity(value) {
    return value == null || !Number.isFinite(Number(value))
        ? "—"
        : errorChartQuantityFormatter.format(Number(value));
}

function applyExpeditionErrorsTextSpacing(chart) {
    if ("letterSpacing" in chart.ctx) {
        chart.ctx.letterSpacing = "1px";
    }
}

const expeditionErrorsTextSpacingPlugin = {
    id: "expeditionErrorsTextSpacing",
    beforeDraw: applyExpeditionErrorsTextSpacing,
    beforeDatasetsDraw: applyExpeditionErrorsTextSpacing,
    beforeTooltipDraw: applyExpeditionErrorsTextSpacing,
};

const expeditionErrorBalance3DPlugin = createHorizontalBars3DPlugin({ id: "expeditionErrorBalance3D" });

const expeditionErrorBalanceValuesPlugin = {
    id: "expeditionErrorBalanceValues",

    afterDatasetsDraw(chart) {
        if (!chart.chartArea) {
            return;
        }

        const values = chart.data.datasets[0].data;
        const context = chart.ctx;

        context.save();
        applyExpeditionErrorsTextSpacing(chart);
        context.font = CHART_VALUE_FONT;
        context.fillStyle = CHART_TEXT_COLOR;
        context.textBaseline = "middle";
        context.textAlign = "left";

        chart.getDatasetMeta(0).data.forEach((bar, index) => {
            const value = Number(values[index]);
            if (bar.horizontal !== true || !Number.isFinite(value) || value === 0) {
                return;
            }

            const position = getHorizontalBarLabelPosition(bar);
            context.fillText(formatErrorChartQuantity(value), position.x, position.y);
        });

        context.restore();
    },
};

function getErrorBalanceValues(analysis) {
    return [
        analysis.labelingErrors ?? 0,
        analysis.sortingErrors ?? 0,
        analysis.totalRevertedErrors ?? 0,
        analysis.finalErrors ?? 0,
    ];
}

function createErrorBalanceChart(canvas, { analysis = {}, animate = true } = {}) {
    return createDashboardChart(canvas, {
        type: "bar",
        data: {
            labels: ["Erros de Etiquetagem", "Erros de Sorting", "Revertidos", "Saldo Final"],
            datasets: [{
                data: getErrorBalanceValues(analysis),
                backgroundColor: [CHART_COLORS.blue, CHART_COLORS.yellow, CHART_COLORS.green, CHART_COLORS.red],
                borderWidth: 0,
                maxBarThickness: 42,
                categoryPercentage: 0.8,
                barPercentage: 0.9,
            }],
        },
        plugins: [
            expeditionErrorsTextSpacingPlugin,
            expeditionErrorBalance3DPlugin,
            expeditionErrorBalanceValuesPlugin,
        ],
        options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            animation: animate ? { duration: 250 } : false,
            interaction: { intersect: false, mode: "index" },
            plugins: {
                legend: { display: false },
                tooltip: {
                    enabled: false,
                    titleFont: { ...CHART_AXIS_FONT, weight: "600" },
                    bodyFont: CHART_AXIS_FONT,
                    callbacks: {
                        label: context => `${context.label}: ${formatErrorChartQuantity(context.raw)}`,
                    },
                },
            },
            scales: {
                x: {
                    grace: "12%",
                    ticks: { precision: 0, callback: formatErrorChartQuantity },
                },
                y: {
                    afterFit(scale) {
                        scale.width += 16;
                    },
                },
            },
        },
    });
}

function updateErrorBalanceChart(chart, analysis, updateMode) {
    chart.data.datasets[0].data = getErrorBalanceValues(analysis);
    chart.update(updateMode);
}

export {
    applyExpeditionErrorsTextSpacing,
    createErrorBalanceChart,
    expeditionErrorsTextSpacingPlugin,
    formatErrorChartQuantity,
    updateErrorBalanceChart,
};
