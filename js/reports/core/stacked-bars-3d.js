const STACKED_BAR_3D_DEPTH = Object.freeze({
    x: 8,
    y: 7,
});

function mixStackedBarColor(
    color,
    target,
    ratio,
) {
    const normalizedColor =
        String(color || "").trim();

    const match = normalizedColor.match(
        /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i,
    );

    if (!match) {
        return normalizedColor;
    }

    const targetValue =
        target === "light" ? 255 : 0;

    return (
        "#" +
        match
            .slice(1)
            .map(function (component) {
                const value =
                    Number.parseInt(
                        component,
                        16,
                    );

                return Math.round(
                    value +
                    (
                        targetValue -
                        value
                    ) * ratio,
                )
                    .toString(16)
                    .padStart(2, "0");
            })
            .join("")
    );
}

function drawStackedBarFace(
    context,
    points,
    color,
) {
    context.beginPath();
    context.moveTo(
        points[0].x,
        points[0].y,
    );

    points
        .slice(1)
        .forEach(function (point) {
            context.lineTo(
                point.x,
                point.y,
            );
        });

    context.closePath();
    context.fillStyle = color;
    context.fill();
}

function isDatasetVisible(
    chart,
    datasetIndex,
) {
    return typeof chart.isDatasetVisible !==
        "function" ||
        chart.isDatasetVisible(datasetIndex);
}

function getTopDatasetIndex(
    chart,
    dataIndex,
) {
    for (
        let datasetIndex =
            chart.data.datasets.length - 1;
        datasetIndex >= 0;
        datasetIndex -= 1
    ) {
        const dataset =
            chart.data.datasets[datasetIndex];

        if (
            !isDatasetVisible(
                chart,
                datasetIndex,
            ) ||
            !(Number(dataset.data?.[dataIndex]) > 0)
        ) {
            continue;
        }

        return datasetIndex;
    }

    return -1;
}

function createStackedBars3DPlugin({
    id,
    depth = STACKED_BAR_3D_DEPTH,
} = {}) {
    return {
        id,

        beforeDatasetDraw(
            chart,
            args,
        ) {
            if (
                !chart.chartArea ||
                !isDatasetVisible(
                    chart,
                    args.index,
                )
            ) {
                return;
            }

            const dataset =
                chart.data.datasets[
                    args.index
                ];

            const bars =
                args.meta?.data ??
                chart.getDatasetMeta(
                    args.index,
                ).data;

            const colors =
                dataset.backgroundColor;

            const depthX =
                Number(depth.x) || 0;

            const depthY =
                Number(depth.y) || 0;

            const context = chart.ctx;
            context.save();

            bars.forEach(function (
                bar,
                dataIndex,
            ) {
                if (
                    !(
                        Number(
                            dataset.data?.[
                                dataIndex
                            ],
                        ) > 0
                    )
                ) {
                    return;
                }

                const properties =
                    typeof bar.getProps ===
                    "function"
                        ? bar.getProps(
                            [
                                "x",
                                "y",
                                "base",
                                "width",
                            ],
                            false,
                        )
                        : bar;

                const values = [
                    properties.x,
                    properties.y,
                    properties.base,
                    properties.width,
                ].map(Number);

                if (
                    values.some(function (value) {
                        return !Number.isFinite(value);
                    })
                ) {
                    return;
                }

                const [
                    x,
                    y,
                    base,
                    width,
                ] = values;

                const top =
                    Math.min(y, base);

                const bottom =
                    Math.max(y, base);

                if (
                    bottom - top < 0.5 ||
                    width <= 0
                ) {
                    return;
                }

                const left =
                    x - width / 2;

                const right =
                    x + width / 2;

                const frontColor =
                    Array.isArray(colors)
                        ? colors[dataIndex]
                        : colors;

                if (
                    typeof frontColor !==
                    "string"
                ) {
                    return;
                }

                drawStackedBarFace(
                    context,
                    [
                        { x: right, y: top },
                        {
                            x: right + depthX,
                            y: top - depthY,
                        },
                        {
                            x: right + depthX,
                            y: bottom - depthY,
                        },
                        { x: right, y: bottom },
                    ],
                    mixStackedBarColor(
                        frontColor,
                        "dark",
                        0.42,
                    ),
                );

                if (
                    args.index !==
                    getTopDatasetIndex(
                        chart,
                        dataIndex,
                    )
                ) {
                    return;
                }

                drawStackedBarFace(
                    context,
                    [
                        { x: left, y: top },
                        { x: right, y: top },
                        {
                            x: right + depthX,
                            y: top - depthY,
                        },
                        {
                            x: left + depthX,
                            y: top - depthY,
                        },
                    ],
                    mixStackedBarColor(
                        frontColor,
                        "light",
                        0.28,
                    ),
                );
            });

            context.restore();
        },
    };
}

export {
    STACKED_BAR_3D_DEPTH,
    createStackedBars3DPlugin,
};
