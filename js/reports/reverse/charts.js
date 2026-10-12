import {
    REVERSE_TYPE_DEFINITIONS,
    REVERSE_TYPE_KEYS,
    createReverseSummary,
} from "./model.js";

import {
    getReverseState,
    subscribeReverseState,
} from "./state.js";

let reverseCompositionChart = null;

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
                cutout: "62%",
                animation: {
                    duration: 250,
                },
                plugins: {
                    legend: {
                        display: false,
                    },
                    tooltip: {
                        callbacks: {
                            label(context) {
                                return (
                                    `${context.label}: ` +
                                    new Intl.NumberFormat(
                                        "pt-BR",
                                    ).format(
                                        context.parsed,
                                    )
                                );
                            },
                        },
                    },
                },
            },
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
