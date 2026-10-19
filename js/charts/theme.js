export const CHART_TEXT_COLOR = "#e4e6eb";

export const CHART_COLORS = Object.freeze({
    red: "#8B0000",
    yellow: "#f99400",
    green: "#007A48",
    blue: "#2538a5",
});

export const CHART_AXIS_FONT = Object.freeze({ family: '"Open Sans", sans-serif', size: 14 });
export const CHART_VALUE_FONT = '600 15px "Open Sans", sans-serif';

export function getChartPixelRatio() {
    const screenRatio = typeof window !== "undefined" ? Number(window.devicePixelRatio) || 1 : 1;
    return Math.max(screenRatio, 2);
}

const legacyColors = new Map([
    ...["#f44336", "#ef5350", "#d9534f", "#ff5722", "#ff5533"].map(color => [color, CHART_COLORS.red]),
    ...["#ffc107", "#f18f00", "#ff9800", "#f0ad4e", "#f2c94c"].map(color => [color, CHART_COLORS.yellow]),
    ...["#4caf50", "#43a047", "#66bb6a", "#8bc34a", "#63b967"].map(color => [color, CHART_COLORS.green]),
    ...["#3f51b5", "#4054b2", "#2196f3"].map(color => [color, CHART_COLORS.blue]),
]);

export function normalizeChartColor(color) {
    if (Array.isArray(color)) return color.map(normalizeChartColor);
    return typeof color === "string" ? legacyColors.get(color.toLowerCase()) ?? color : color;
}
