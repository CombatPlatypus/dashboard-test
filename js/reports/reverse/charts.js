import { getChartPixelRatio } from "../../charts/theme.js";
import { createDashboardChart } from "../../charts/standard.js";
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
    DOUGHNUT_3D_PADDING,
    drawDoughnut3D,
    drawDoughnut3DCenterText,
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

        drawDoughnut3DCenterText(chart, geometry, {
            text: options.text || "—",
            label: options.label || "Pacotes",
        });
    },
};

function createReverseCompositionChart(
    canvas,
) {
    return createDashboardChart(
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
                    getChartPixelRatio(),
                cutout: "66%",
                events: [],
                layout: {
                    padding: { ...DOUGHNUT_3D_PADDING },
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
