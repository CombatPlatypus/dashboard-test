import {
    REVERSE_TYPE_DEFINITIONS,
    REVERSE_TYPE_KEYS,
    createReverseSummary,
} from "./model.js";

import {
    getReverseState,
    subscribeReverseState,
} from "./state.js";

import {
    drawDoughnut3D,
} from "../core/doughnut-3d.js";

let reverseCompositionChart = null;

const reverseQuantityFormatter =
    new Intl.NumberFormat("pt-BR");

const reverseCompositionProjection = {
    id: "reverse-composition-3d",
    beforeDatasetDraw(chart, args) {
        if (args.index !== 0) {
            return;
        }

        const dataset =
            chart.data.datasets[0];

        chart.$reverseCompositionGeometry =
            drawDoughnut3D({
                context: chart.ctx,
                area: chart.chartArea,
                values: dataset.data,
                colors: dataset.backgroundColor,
            });

        return false;
    },
};

const reverseCenterTextPlugin = {
    id: "reverseCenterText",
    afterDraw(chart, args, options) {
        const geometry =
            chart.$reverseCompositionGeometry;

        if (!geometry) {
            return;
        }

        const context = chart.ctx;
        const fontFamily =
            window.getComputedStyle(
                chart.canvas,
            ).fontFamily || "sans-serif";

        context.save();
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillStyle = "#e4e6eb";
        context.font = `600 22px ${fontFamily}`;
        context.fillText(
            options.text || "—",
            geometry.centerX,
            geometry.textCenterY - 8,
        );
        context.fillStyle = "#8b8d91";
        context.font = `12px ${fontFamily}`;
        context.fillText(
            options.label || "Pacotes",
            geometry.centerX,
            geometry.textCenterY + 16,
        );
        context.restore();
    },
};

function createReverseCompositionChart(
    canvas,
) {
    return new window.Chart(
        canvas,
        {
            type: "doughnut",
            data: {
                labels:
                    REVERSE_TYPE_KEYS.map(
                        function (typeKey) {
                            return REVERSE_TYPE_DEFINITIONS[
                                typeKey
                            ].label;
                        },
                    ),
                datasets: [
                    {
                        data:
                            REVERSE_TYPE_KEYS.map(
                                function () {
                                    return 0;
                                },
                            ),
                        backgroundColor:
                            REVERSE_TYPE_KEYS.map(
                                function (typeKey) {
                                    return REVERSE_TYPE_DEFINITIONS[
                                        typeKey
                                    ].color;
                                },
                            ),
                        borderColor:
                            "transparent",
                        borderWidth: 0,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                devicePixelRatio:
                    Math.max(
                        window.devicePixelRatio || 1,
                        2,
                    ),
                cutout: "66%",
                events: [],
                layout: {
                    padding: {
                        top: 10,
                        right: 20,
                        bottom: 5,
                        left: 20,
                    },
                },
                animation: false,
                plugins: {
                    legend: {
                        display: false,
                    },
                    tooltip: {
                        enabled: false,
                    },
                    reverseCenterText: {
                        text: "—",
                        label: "Pacotes",
                    },
                },
            },
            plugins: [
                reverseCompositionProjection,
                reverseCenterTextPlugin,
            ],
        },
    );
}

function renderReverseCharts(
    state = getReverseState(),
) {
    if (!reverseCompositionChart) {
        return false;
    }

    const summary =
        createReverseSummary(
            state.transfers,
        );

    reverseCompositionChart
        .data.datasets[0].data =
        REVERSE_TYPE_KEYS.map(
            function (typeKey) {
                return summary.quantities[
                    typeKey
                ];
            },
        );

    reverseCompositionChart
        .options.plugins
        .reverseCenterText.text =
        summary.hasData
            ? reverseQuantityFormatter.format(
                summary.total,
            )
            : "—";

    reverseCompositionChart.update();

    return true;
}

function initializeReverseCharts(
    rootElement = document,
) {
    const canvas =
        rootElement.querySelector(
            "#reverseCompositionChart",
        );

    if (
        !(canvas instanceof
            HTMLCanvasElement) ||
        typeof window.Chart !== "function"
    ) {
        return false;
    }

    reverseCompositionChart =
        createReverseCompositionChart(
            canvas,
        );

    subscribeReverseState(
        renderReverseCharts,
    );

    renderReverseCharts(
        getReverseState(),
    );

    return true;
}

export {
    createReverseCompositionChart,
    initializeReverseCharts,
    renderReverseCharts,
};
