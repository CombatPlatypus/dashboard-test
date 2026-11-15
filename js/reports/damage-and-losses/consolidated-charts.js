import { createDashboardChart } from "../../charts/standard.js";
import { CHART_COLORS } from "../../charts/theme.js";
import {
    DOUGHNUT_3D_PADDING, drawDoughnut3D, drawDoughnut3DCenterText,
} from "../core/doughnut-3d.js";

const quantity = new Intl.NumberFormat("pt-BR");
const percentage = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1 });

const projection = {
    id: "consolidated-composition-3d",
    beforeDatasetDraw(chart, args) {
        if (args.index !== 0) return;
        const dataset = chart.data.datasets[0];
        chart.$consolidatedGeometry = drawDoughnut3D({
            context: chart.ctx,
            area: chart.chartArea,
            values: dataset.data,
            colors: dataset.backgroundColor,
        });
        return false;
    },
};

const centerText = {
    id: "consolidatedCenterText",
    afterDraw(chart, args, options) {
        drawDoughnut3DCenterText(chart, chart.$consolidatedGeometry, options);
    },
};

function createConsolidatedCompositionChart(canvas) {
    return createDashboardChart(canvas, {
        type: "doughnut",
        data: {
            labels: ["Em Análise", "Lost", "Avarias do Hub", "Avarias do SOC"],
            datasets: [{
                data: [0, 0, 0, 0],
                backgroundColor: [CHART_COLORS.blue, CHART_COLORS.red, CHART_COLORS.green, CHART_COLORS.yellow],
                borderColor: "transparent",
                borderWidth: 0,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "66%",
            events: [],
            layout: { padding: { ...DOUGHNUT_3D_PADDING } },
            animation: false,
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false },
                consolidatedCenterText: { text: "—", label: "Ocorrências" },
            },
        },
        plugins: [projection, centerText],
    });
}

function getConsolidatedCompositionIndicators(root, prefix) {
    return ["UnderReview", "Lost", "Damage", "Soc"]
        .map(suffix => root.querySelector(`#${prefix}${suffix}`));
}

function updateConsolidatedCompositionChart(chart, summary, indicators) {
    const { composition, total, hasData, hasDamageData, hasLossesData, monthName, year } = summary;
    const [underReview, confirmedLosses, hub, soc] = composition;

    indicators.forEach((element, index) => {
        const value = composition[index];
        const available = index >= 2 ? hasDamageData : hasLossesData;
        element.textContent = available
            ? `${quantity.format(value)} (${percentage.format(total ? value / total : 0)})`
            : "—";
    });
    chart.data.datasets[0].data = composition.slice();
    chart.options.plugins.consolidatedCenterText.text = hasData ? quantity.format(total) : "—";
    chart.canvas.setAttribute("aria-label", hasData
        ? `Composição das ocorrências de ${monthName} de ${year}: ${underReview} em análise, ${confirmedLosses} perdas confirmadas, ${hub} avarias do Hub e ${soc} avarias do SOC.`
        : "Composição das ocorrências: sem dados importados.");
    chart.update("none");
}

export {
    createConsolidatedCompositionChart,
    getConsolidatedCompositionIndicators,
    updateConsolidatedCompositionChart,
};
