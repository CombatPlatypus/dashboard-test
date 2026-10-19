import { createHorizontalBars3DPlugin, getHorizontalBarLabelPosition } from "../core/horizontal-bars-3d.js";
import { createDashboardChart } from "../../charts/standard.js";
import { CHART_TEXT_COLOR, CHART_VALUE_FONT } from "../../charts/theme.js";

const parcelHorizontalQuantityFormatter = new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 0,
});

const parcelHorizontalLabelFont = {
    size: 14,
    family: '"Open Sans", sans-serif',
};

function fitParcelHorizontalLabels(scale) {
    const context = scale.ctx;
    context.save();
    context.font = `${parcelHorizontalLabelFont.size}px ${parcelHorizontalLabelFont.family}`;
    if ("letterSpacing" in context) context.letterSpacing = "0px";

    const labelWidths = scale.ticks.flatMap(tick =>
        (Array.isArray(tick.label) ? tick.label : [tick.label])
            .map(label => context.measureText(String(label ?? "")).width));

    // Chart.js caps the automatic axis width. Reserve the full measured text,
    // including tracking and a safety margin, on updates, resizes and export.
    scale.width = Math.max(scale.width,
        Math.ceil(Math.max(0, ...labelWidths) + scale.options.ticks.padding * 2 + 8));
    context.restore();
}

const parcelHorizontalTextStyle = {
    id: "parcelHorizontalTextStyle",
    beforeLayout(chart) {
        if ("letterSpacing" in chart.ctx) {
            chart.ctx.letterSpacing = "0px";
        }
    },
    beforeDraw(chart) {
        this.beforeLayout(chart);
    },
};

const parcelHorizontalValues = {
    id: "parcelHorizontalValues",
    afterDatasetsDraw(chart) {
        const area = chart.chartArea;
        if (!area) return;

        const context = chart.ctx;
        context.save();
        if ("letterSpacing" in context) context.letterSpacing = "0px";
        context.font = CHART_VALUE_FONT;
        context.fillStyle = CHART_TEXT_COLOR;
        context.textAlign = "left";
        context.textBaseline = "middle";
        chart.getDatasetMeta(0).data.forEach((bar, index) => {
            const { x, y } = getHorizontalBarLabelPosition(bar);
            const value = chart.data.datasets[0].data[index];
            context.fillText(chart.$parcelHasDistribution
                ? parcelHorizontalQuantityFormatter.format(value)
                : "—", x, y);
        });
        context.restore();
    },
};

function getParcelHorizontalChartHeight(categoryCount) {
    return Math.max(220, categoryCount * 40 + 16);
}

function createParcelHorizontalChart(canvas, color) {
    return createDashboardChart(canvas, {
        type: "bar",
        data: {
            labels: ["—"],
            datasets: [{
                label: "Pacotes",
                data: [0],
                backgroundColor: color,
                borderWidth: 0,
                borderRadius: 3,
                barThickness: 24,
            }],
        },
        options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            events: [],
            layout: { padding: { right: 52 } },
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false },
            },
            scales: {
                x: { beginAtZero: true, display: false, suggestedMax: 1 },
                y: {
                    afterFit: fitParcelHorizontalLabels,
                    ticks: {
                        color: CHART_TEXT_COLOR,
                        font: parcelHorizontalLabelFont,
                        padding: 12,
                        autoSkip: false,
                    },
                    grid: { display: false },
                    border: { display: false },
                },
            },
        },
        plugins: [parcelHorizontalTextStyle, createHorizontalBars3DPlugin({ id: "parcelHorizontalBars3D" }), parcelHorizontalValues],
    });
}

function updateParcelHorizontalChart(chart, distribution, { title, color, height }) {
    const labels = distribution.map(item => item.label);
    const values = distribution.map(item => item.count);
    const maximum = Math.max(0, ...values);
    const quantityText = parcelHorizontalQuantityFormatter.format(maximum);
    const container = chart.canvas.parentElement;

    if (container && container.style.height !== `${height}px`) {
        container.style.height = `${height}px`;
        chart.resize();
    }
    chart.$parcelHasDistribution = distribution.length > 0;
    chart.data.labels = labels.length > 0 ? labels : ["—"];
    chart.data.datasets[0].data = values.length > 0 ? values : [0];
    chart.data.datasets[0].backgroundColor = labels.length > 0
        ? labels.map(label => label === "-" ? "#a8a9ad" : color)
        : ["#a8a9ad"];
    chart.options.scales.x.suggestedMax = maximum > 0 ? Math.ceil(maximum * 1.15) : 1;
    chart.options.layout.padding.right = Math.max(64, quantityText.length * 10 + 24);
    chart.canvas.setAttribute("aria-label", `${title}: ${distribution.length > 0
        ? distribution.map(item => `${item.label}: ${parcelHorizontalQuantityFormatter.format(item.count)}`).join("; ")
        : "sem pacotes importados"}.`);
    chart.update();
}

export { createParcelHorizontalChart, getParcelHorizontalChartHeight, updateParcelHorizontalChart };
