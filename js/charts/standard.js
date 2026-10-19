import { CHART_AXIS_FONT, CHART_TEXT_COLOR, getChartPixelRatio, normalizeChartColor } from "./theme.js";
import { createHorizontalBars3DPlugin, horizontalBarGridColor } from "../reports/core/horizontal-bars-3d.js";
import { createStackedBars3DPlugin } from "../reports/core/stacked-bars-3d.js";

const colorProperties = ["backgroundColor", "borderColor", "hoverBackgroundColor", "pointBackgroundColor", "pointBorderColor"];

export function normalizeChartDatasets(data) {
    for (const dataset of data.datasets ?? []) {
        for (const property of colorProperties) {
            if (dataset[property] !== undefined) dataset[property] = normalizeChartColor(dataset[property]);
        }
    }
}

const palettePlugin = {
    id: "dashboardPalette",
    beforeUpdate(chart) { normalizeChartDatasets(chart.data); },
};
const horizontalProjection = createHorizontalBars3DPlugin({ id: "dashboardHorizontalBars3D" });
const verticalProjection = createStackedBars3DPlugin({ id: "dashboardVerticalBars3D" });

export function applyChartStandard(config) {
    const options = config.options ??= {};
    options.devicePixelRatio = getChartPixelRatio();
    options.font = { ...options.font, family: CHART_AXIS_FONT.family, size: 14 };
    options.color = CHART_TEXT_COLOR;
    if (options.plugins !== false) {
        const plugins = options.plugins ??= {};
        if (plugins.legend !== false) {
            const legend = plugins.legend ??= {};
            legend.labels = { ...legend.labels, color: CHART_TEXT_COLOR };
        }
        for (const key of ["title", "subtitle"]) {
            if (plugins[key] !== false) plugins[key] = { ...plugins[key], color: CHART_TEXT_COLOR };
        }
        if (plugins.tooltip !== false) {
            plugins.tooltip = { enabled: false, ...plugins.tooltip, titleColor: CHART_TEXT_COLOR, bodyColor: CHART_TEXT_COLOR, footerColor: CHART_TEXT_COLOR };
        }
    }
    config.data ??= { datasets: [] };
    normalizeChartDatasets(config.data);

    for (const scale of Object.values(options.scales ?? {})) {
        scale.ticks ??= {};
        scale.ticks.font = { ...scale.ticks.font, ...CHART_AXIS_FONT };
        scale.ticks.color = CHART_TEXT_COLOR;
        if (scale.title) scale.title.color = CHART_TEXT_COLOR;
    }

    config.plugins ??= [];
    if (!config.plugins.some(plugin => plugin.id === palettePlugin.id)) config.plugins.push(palettePlugin);
    if (config.type !== "bar") return config;

    const horizontal = options.indexAxis === "y";
    for (const dataset of config.data.datasets) {
        dataset.borderRadius = 0;
        dataset.borderWidth = 0;
        dataset.borderSkipped = false;
        dataset.inflateAmount = 0;
        if (horizontal) dataset.barThickness = 24;
    }

    const padding = options.layout?.padding;
    const requestedPadding = typeof padding === "number"
        ? { top: padding, right: padding, bottom: padding, left: padding }
        : padding ?? {};
    options.layout ??= {};
    options.layout.padding = {
        ...requestedPadding,
        top: Math.max(requestedPadding.top ?? 0, horizontal ? 9 : 24),
        bottom: Math.max(requestedPadding.bottom ?? 0, horizontal ? 9 : 0),
        right: Math.max(requestedPadding.right ?? 0, horizontal ? 64 : 8),
    };

    const already3D = config.plugins.some(plugin => /bars3d|balance3d/i.test(plugin.id));
    if (horizontal) {
        const scales = options.scales ??= {};
        const x = scales.x ??= {};
        x.display = true;
        x.beginAtZero = true;
        x.grace ??= "15%";
        x.ticks = { ...x.ticks, color: CHART_TEXT_COLOR, font: { ...CHART_AXIS_FONT }, padding: 10 };
        x.grid = { ...x.grid, display: true, color: horizontalBarGridColor };
        x.border = { ...x.border, color: "#525252" };
        const y = scales.y ??= {};
        y.ticks = { ...y.ticks, color: CHART_TEXT_COLOR, font: { ...CHART_AXIS_FONT }, padding: 22 };
        y.grid = { display: false };
        y.border = { display: false };
        if (!already3D) config.plugins.unshift(horizontalProjection);
    } else if (!already3D && !config.plugins.some(plugin => /periodbars3d/i.test(plugin.id))) {
        config.plugins.unshift(verticalProjection);
    }

    return config;
}

export function createDashboardChart(canvas, config) {
    return new window.Chart(canvas, applyChartStandard(config));
}

if (typeof window !== "undefined") {
    window.DashboardCharts = { createChart: createDashboardChart };
}
