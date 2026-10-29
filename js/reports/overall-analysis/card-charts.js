import { CHART_COLORS, getChartEmptyColor } from "../../charts/theme.js";
import { createDashboardChart } from "../../charts/standard.js";

function getOverallAnalysisCardCharts(data) {
    const damage = data.cards.damage;
    const packages = data.cards.packagesAnalysis;
    const losses = data.cards.lossesRate;
    const hasLossRate = typeof losses.rate === "number" && Number.isFinite(losses.rate) && losses.limit > 0;
    const lossRateProgress = hasLossRate ? Math.max(0, Math.min(losses.rate / losses.limit, 1)) : null;
    const lossRateColor = losses.rate > losses.limit ? CHART_COLORS.red
        : losses.rate >= 0.00025 ? CHART_COLORS.yellow : CHART_COLORS.green;

    return {
        damage: {
            labels: ["Avarias do SOC", "Avarias do Hub"],
            values: [damage.soc, damage.hub],
            colors: [CHART_COLORS.yellow, CHART_COLORS.red],
        },
        packagesAnalysis: {
            labels: ["Em Análise", "Perdas Confirmadas"],
            values: [packages.value, packages.confirmedLosses],
            colors: [CHART_COLORS.yellow, CHART_COLORS.red],
        },
        lossesRate: {
            labels: ["Uso do limite de perdas", "Restante até o limite"],
            values: hasLossRate ? [lossRateProgress, 1 - lossRateProgress] : [null, null],
            colors: [lossRateColor, null],
        },
    };
}

function createOverallAnalysisCardChart(canvas, animation = { duration: 250 }) {
    return createDashboardChart(canvas, {
        type: "doughnut",
        data: { labels: [], datasets: [{ data: [0, 1], backgroundColor: () => getChartEmptyColor(), borderWidth: 0 }] },
        options: {
            responsive: true, maintainAspectRatio: false, cutout: "72%", events: [],
            animation,
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
        },
    });
}

function updateOverallAnalysisCardChart(chart, definition, updateMode) {
    const { labels, values, colors } = definition;
    const hasData = values.every(value => typeof value === "number" && Number.isFinite(value) && value >= 0);
    const hasVolume = hasData && values.some(value => value > 0);
    chart.data.labels = labels;
    chart.data.datasets[0].data = hasVolume ? values : [0, 1];
    chart.data.datasets[0].backgroundColor = context => hasVolume ? colors[context.dataIndex] ?? getChartEmptyColor() : getChartEmptyColor();
    chart.data.datasets[0].hoverBackgroundColor = chart.data.datasets[0].backgroundColor;
    chart.canvas.setAttribute("aria-label", hasData
        ? labels.map((label, index) => `${label}: ${new Intl.NumberFormat("pt-BR").format(values[index])}`).join("; ")
        : `${labels.join(" e ")}: sem dados importados`);
    chart.update(updateMode);
}

export { createOverallAnalysisCardChart, getOverallAnalysisCardCharts, updateOverallAnalysisCardChart };
