import { getChartBorderColor, getChartTheme } from "../../charts/theme.js";

const HORIZONTAL_BAR_3D_DEPTH = Object.freeze({ x: 10, y: 9 });

function shadeColor(color, target, ratio) {
    const match = color.match(/^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i);

    if (!match) {
        return color;
    }

    return "#" + match.slice(1).map(component => {
        const value = Number.parseInt(component, 16);
        return Math.round(value + (target - value) * ratio)
            .toString(16).padStart(2, "0");
    }).join("");
}

function drawFace(context, points, color, borderColor) {
    context.beginPath();
    context.moveTo(...points[0]);
    points.slice(1).forEach(point => context.lineTo(...point));
    context.closePath();
    context.fillStyle = color;
    context.fill();

    if (borderColor) {
        context.strokeStyle = borderColor;
        context.lineWidth = 1;
        context.stroke();
    }
}

function createHorizontalBars3DPlugin({ id }) {
    const { x: depthX, y: depthY } = HORIZONTAL_BAR_3D_DEPTH;

    return {
        id,

        afterLayout(chart) {
            const scale = chart.scales.y;
            if (!scale || scale.type !== "category") {
                return;
            }

            // Leave a gutter inside the plot, above the bottom axis and its labels.
            scale.bottom = Math.max(scale.top + 1, scale.bottom - 16);
            scale.height = scale.bottom - scale.top;
            scale.configure();
        },

        beforeDatasetsDraw(chart) {
            const area = chart.chartArea;
            if (!area) {
                return;
            }

            const context = chart.ctx;
            context.save();
            drawHorizontalBar3DBase(context, { left: area.left, top: area.top, bottom: area.bottom });
            context.restore();
        },

        beforeDatasetDraw(chart, args) {
            if (
                !chart.chartArea ||
                (chart.isDatasetVisible && !chart.isDatasetVisible(args.index))
            ) {
                return;
            }

            const dataset = chart.data.datasets[args.index];
            const bars = args.meta?.data ?? chart.getDatasetMeta(args.index).data;
            const context = chart.ctx;
            context.save();

            bars.forEach((bar, index) => {
                if (!(Number(dataset.data[index]) > 0)) {
                    return;
                }

                const properties = bar.getProps(
                    ["x", "y", "base", "height"], false,
                );
                const { x, y, base, height } = properties;
                if (
                    ![x, y, base, height].every(Number.isFinite) ||
                    Math.abs(x - base) < 0.5 || height <= 0
                ) {
                    return;
                }

                const color = Array.isArray(dataset.backgroundColor)
                    ? dataset.backgroundColor[index]
                    : dataset.backgroundColor;
                if (typeof color !== "string") {
                    return;
                }

                const left = Math.min(base, x);
                const right = Math.max(base, x);
                const top = y - height / 2;
                const bottom = y + height / 2;

                drawFace(context, [
                    [left, bottom],
                    [right, bottom],
                    [right + depthX, bottom + depthY],
                    [left + depthX, bottom + depthY],
                ], shadeColor(color, 0, 0.42));

                drawFace(context, [
                    [right, top],
                    [right + depthX, top + depthY],
                    [right + depthX, bottom + depthY],
                    [right, bottom],
                ], shadeColor(color, 255, 0.28));
            });

            context.restore();
        },
    };
}

function drawHorizontalBar3DBase(context, { left, top, bottom }) {
    const { x, y } = HORIZONTAL_BAR_3D_DEPTH;
    const theme = getChartTheme();
    drawFace(context, [
        [left - x, top - y], [left + x, top + y],
        [left + x, bottom + y], [left - x, bottom - y],
    ], theme.base, theme.border);
}

function drawHorizontalBar3D(context, left, top, width, height, color) {
    if (width <= 0 || height <= 0 || !/^#[\da-f]{6}$/i.test(color)) return;
    const { x, y } = HORIZONTAL_BAR_3D_DEPTH;
    const right = left + width;
    const bottom = top + height;
    drawFace(context, [[left, bottom], [right, bottom], [right + x, bottom + y], [left + x, bottom + y]], shadeColor(color, 0, 0.42));
    drawFace(context, [[right, top], [right + x, top + y], [right + x, bottom + y], [right, bottom]], shadeColor(color, 255, 0.28));
    drawFace(context, [[left, top], [right, top], [right, bottom], [left, bottom]], color);
}

function horizontalBarGridColor(context) {
    return Number(context.tick?.value) === 0
        ? "rgba(0, 0, 0, 0)"
        : getChartBorderColor();
}

function getHorizontalBarLabelPosition(bar) {
    const { x, y, base } = bar.getProps(["x", "y", "base"], false);

    return {
        x: Math.max(x, base) + HORIZONTAL_BAR_3D_DEPTH.x + 10,
        y: y + 7,
    };
}

export {
    HORIZONTAL_BAR_3D_DEPTH,
    createHorizontalBars3DPlugin,
    horizontalBarGridColor,
    getHorizontalBarLabelPosition,
    drawHorizontalBar3D,
    drawHorizontalBar3DBase,
};
