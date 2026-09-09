import {
    getExpeditionErrorAnalysis,
    getExpeditionState,
    subscribeExpeditionState,
} from "./expedition-state.js";

let errorBalanceChart = null;
let streetOccurrencesChart = null;
let errorsVisibilityObserver = null;
let errorsResizeFrame = null;

const ERROR_CHART_PIXEL_RATIO =
    Math.max(
        window.devicePixelRatio || 1,
        4,
    );

const ERROR_CHART_FONT = {
    family: '"Open Sans", sans-serif',
    size: 14,
};

const errorChartQuantityFormatter =
    new Intl.NumberFormat(
        "pt-BR",
    );

const errorChartRateFormatter =
    new Intl.NumberFormat(
        "pt-BR",
        {
            style: "percent",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        },
    );

function formatErrorChartQuantity(
    value,
) {
    if (
        value === null ||
        value === undefined ||
        !Number.isFinite(
            Number(value),
        )
    ) {
        return "—";
    }

    return errorChartQuantityFormatter
        .format(
            Number(value),
        );
}

function formatErrorChartRate(
    value,
) {
    if (
        value === null ||
        value === undefined ||
        !Number.isFinite(
            Number(value),
        )
    ) {
        return "—";
    }

    return errorChartRateFormatter
        .format(
            Number(value),
        );
}

function getExpeditionErrorsChartElements() {
    return {
        expeditionPanel:
            document.getElementById(
                "expedition",
            ),

        errorsPanel:
            document.getElementById(
                "expedition-mistakes",
            ),

        streetsPanel:
            document.getElementById(
                "expedition-streets",
            ),

        errorBalanceCanvas:
            document.getElementById(
                "expeditionErrorBalanceChart",
            ),

        streetOccurrencesCanvas:
            document.getElementById(
                "expeditionStreetOccurrencesChart",
            ),

        streetOccurrencesContainer:
            document.getElementById(
                "expeditionStreetOccurrencesChartContainer",
            ),

        bestStreet:
            document.getElementById(
                "expeditionBestStreet",
            ),

        bestStreetRate:
            document.getElementById(
                "expeditionBestStreetRate",
            ),

        worstStreet:
            document.getElementById(
                "expeditionWorstStreet",
            ),

        worstStreetRate:
            document.getElementById(
                "expeditionWorstStreetRate",
            ),
    };
}

function hasExpeditionErrorsChartElements(
    elements,
) {
    return (
        elements.expeditionPanel instanceof
            HTMLElement &&
        elements.errorsPanel instanceof
            HTMLElement &&
        elements.streetsPanel instanceof
            HTMLElement &&
        elements.errorBalanceCanvas instanceof
            HTMLCanvasElement &&
        elements.streetOccurrencesCanvas instanceof
            HTMLCanvasElement &&
        elements.streetOccurrencesContainer instanceof
            HTMLElement &&
        elements.bestStreet instanceof
            HTMLElement &&
        elements.bestStreetRate instanceof
            HTMLElement &&
        elements.worstStreet instanceof
            HTMLElement &&
        elements.worstStreetRate instanceof
            HTMLElement
    );
}

function applyExpeditionErrorsTextSpacing(
    chart,
) {
    if (
        "letterSpacing" in
        chart.ctx
    ) {
        chart.ctx.letterSpacing =
            "1px";
    }
}

const expeditionErrorsTextSpacingPlugin = {
    id: "expeditionErrorsTextSpacing",

    beforeDraw(chart) {
        applyExpeditionErrorsTextSpacing(
            chart,
        );
    },

    beforeDatasetsDraw(chart) {
        applyExpeditionErrorsTextSpacing(
            chart,
        );
    },

    beforeTooltipDraw(chart) {
        applyExpeditionErrorsTextSpacing(
            chart,
        );
    },
};

function createErrorBalanceChart(
    canvas,
) {
    return new window.Chart(
        canvas,
        {
            type: "bar",

            data: {
                labels: [
                    "Identificados",
                    "Revertidos",
                    "Saldo Final",
                ],

                datasets: [
                    {
                        data: [0, 0, 0],
                        backgroundColor: [
                            "#ffc107",
                            "#8BC34A",
                            "#FF5722",
                        ],
                        borderWidth: 0,
                        maxBarThickness: 42,
                        categoryPercentage: 0.8,
                        barPercentage: 0.9,
                    },
                ],
            },

            plugins: [
                expeditionErrorsTextSpacingPlugin,
            ],

            options: {
                indexAxis: "y",
                responsive: true,
                maintainAspectRatio: false,
                devicePixelRatio:
                    ERROR_CHART_PIXEL_RATIO,

                layout: {
                    padding: {
                        left: 40,
                        right: 10,
                    },
                },

                animation: {
                    duration: 250,
                },

                interaction: {
                    intersect: false,
                    mode: "index",
                },

                plugins: {
                    legend: {
                        display: false,
                    },

                    tooltip: {
                        titleFont: {
                            ...ERROR_CHART_FONT,
                            weight: "600",
                        },

                        bodyFont:
                            ERROR_CHART_FONT,

                        callbacks: {
                            label(context) {
                                return (
                                    `${context.label}: ` +
                                    formatErrorChartQuantity(
                                        context.raw,
                                    )
                                );
                            },
                        },
                    },
                },

                scales: {
                    x: {
                        beginAtZero: true,
                        grace: "12%",

                        ticks: {
                            color: "#e4e6eb",
                            precision: 0,
                            font:
                                ERROR_CHART_FONT,

                            callback(value) {
                                return formatErrorChartQuantity(
                                    value,
                                );
                            },
                        },

                        grid: {
                            color:
                                "rgba(82, 82, 82, 0.45)",
                        },
                    },

                    y: {
                        ticks: {
                            color: "#e4e6eb",
                            font:
                                ERROR_CHART_FONT,
                        },

                        grid: {
                            display: false,
                        },
                    },
                },
            },
        },
    );
}

function createStreetOccurrencesChart(
    canvas,
) {
    return new window.Chart(
        canvas,
        {
            type: "bar",

            data: {
                labels: [],

                datasets: [
                    {
                        label: "Pacotes Ausentes",
                        data: [],
                        backgroundColor: "#ffc107",
                        borderWidth: 0,
                        maxBarThickness: 28,
                        categoryPercentage: 0.9,
                        barPercentage: 0.92,
                        expeditionStreets: [],
                    },
                    {
                        label: "Erros da Rua",
                        data: [],
                        backgroundColor: "#F44336",
                        borderWidth: 0,
                        maxBarThickness: 28,
                        categoryPercentage: 0.9,
                        barPercentage: 0.92,
                        expeditionStreets: [],
                    },
                ],
            },

            plugins: [
                expeditionErrorsTextSpacingPlugin,
            ],

            options: {
                responsive: true,
                maintainAspectRatio: false,
                devicePixelRatio:
                    ERROR_CHART_PIXEL_RATIO,

                animation: {
                    duration: 250,
                },

                interaction: {
                    intersect: false,
                    mode: "index",
                },

                plugins: {
                    legend: {
                        display: false,
                    },

                    tooltip: {
                        titleFont: {
                            ...ERROR_CHART_FONT,
                            weight: "600",
                        },

                        bodyFont:
                            ERROR_CHART_FONT,

                        footerFont:
                            ERROR_CHART_FONT,

                        callbacks: {
                            label(context) {
                                return (
                                    `${context.dataset.label}: ` +
                                    formatErrorChartQuantity(
                                        context.raw,
                                    )
                                );
                            },

                            afterBody(contexts) {
                                const context =
                                    contexts[0];

                                const street =
                                    context
                                        ?.dataset
                                        ?.expeditionStreets[
                                            context.dataIndex
                                        ];

                                if (!street) {
                                    return [];
                                }

                                return [
                                    (
                                        "Guardião: " +
                                        (
                                            street.guardian ||
                                            "Não informado"
                                        )
                                    ),
                                    (
                                        "Taxa de erros: " +
                                        formatErrorChartRate(
                                            street.errorRate,
                                        )
                                    ),
                                ];
                            },
                        },
                    },
                },

                scales: {
                    x: {
                        ticks: {
                            color: "#e4e6eb",
                            autoSkip: false,
                            maxRotation: 0,
                            font:
                                ERROR_CHART_FONT,
                        },

                        grid: {
                            display: false,
                        },
                    },

                    y: {
                        beginAtZero: true,
                        grace: "12%",

                        ticks: {
                            color: "#e4e6eb",
                            precision: 0,
                            font:
                                ERROR_CHART_FONT,

                            callback(value) {
                                return formatErrorChartQuantity(
                                    value,
                                );
                            },
                        },

                        grid: {
                            color:
                                "rgba(82, 82, 82, 0.45)",
                        },
                    },
                },
            },
        },
    );
}

function updateErrorBalanceChart(
    analysis,
    animate,
) {
    const totalErrors =
        analysis.totalErrors ?? 0;

    const revertedErrors =
        analysis.totalRevertedErrors ?? 0;

    const finalErrors =
        analysis.finalErrors ?? 0;

    errorBalanceChart
        .data
        .datasets[0]
        .data = [
            totalErrors,
            revertedErrors,
            finalErrors,
        ];

    errorBalanceChart.update(
        animate
            ? undefined
            : "none",
    );
}

function updateStreetOccurrencesChart(
    elements,
    streets,
    animate,
) {
    const rankedStreets =
        streets
            .slice()
            .sort(function (
                first,
                second,
            ) {
                const firstTotal =
                    first.missingOrders +
                    first.totalErrors;

                const secondTotal =
                    second.missingOrders +
                    second.totalErrors;

                return (
                    secondTotal -
                        firstTotal ||
                    first.name.localeCompare(
                        second.name,
                        "pt-BR",
                        {
                            numeric: true,
                        },
                    )
                );
            });

    streetOccurrencesChart.data.labels =
        rankedStreets.map(
            function (street) {
                return `Rua ${street.name}`;
            },
        );

    const missingDataset =
        streetOccurrencesChart
            .data
            .datasets[0];

    const errorsDataset =
        streetOccurrencesChart
            .data
            .datasets[1];

    missingDataset.data =
        rankedStreets.map(
            function (street) {
                return street.missingOrders;
            },
        );

    errorsDataset.data =
        rankedStreets.map(
            function (street) {
                return street.totalErrors;
            },
        );

    missingDataset.expeditionStreets =
        rankedStreets;

    errorsDataset.expeditionStreets =
        rankedStreets;

    streetOccurrencesChart.update(
        animate
            ? undefined
            : "none",
    );
}

function updateStreetCards(
    elements,
    streets,
) {
    const rankedStreets =
        streets
            .slice()
            .sort(function (
                first,
                second,
            ) {
                return (
                    first.totalErrors -
                        second.totalErrors ||
                    first.missingOrders -
                        second.missingOrders ||
                    first.name.localeCompare(
                        second.name,
                        "pt-BR",
                        {
                            numeric: true,
                        },
                    )
                );
            });

    const bestStreet =
        rankedStreets[0] || null;

    const worstStreet =
        rankedStreets[
            rankedStreets.length - 1
        ] || null;

    if (!bestStreet || !worstStreet) {
        elements.bestStreet.textContent =
            "—";

        elements.bestStreetRate.textContent =
            "—";

        elements.worstStreet.textContent =
            "—";

        elements.worstStreetRate.textContent =
            "—";

        return;
    }

    elements.bestStreet.textContent =
        bestStreet.name;

    elements.bestStreetRate.textContent =
        formatErrorChartRate(
            bestStreet.errorRate,
        );

    elements.worstStreet.textContent =
        worstStreet.name;

    elements.worstStreetRate.textContent =
        formatErrorChartRate(
            worstStreet.errorRate,
        );
}

function renderExpeditionErrorsCharts(
    elements,
    state,
) {
    const analysis =
        getExpeditionErrorAnalysis(
            state,
        );

    const animateErrors =
        elements.errorsPanel
            .classList
            .contains(
                "is-active",
            );

    const animateStreets =
        elements.streetsPanel
            .classList
            .contains(
                "is-active",
            );

    updateStreetCards(
        elements,
        analysis.streets,
    );

    updateErrorBalanceChart(
        analysis,
        animateErrors,
    );

    updateStreetOccurrencesChart(
        elements,
        analysis.streets,
        animateStreets,
    );
}

function resizeExpeditionErrorsCharts() {
    if (errorsResizeFrame !== null) {
        window.cancelAnimationFrame(
            errorsResizeFrame,
        );
    }

    errorsResizeFrame =
        window.requestAnimationFrame(
            function () {
                errorsResizeFrame = null;

                [
                    errorBalanceChart,
                    streetOccurrencesChart,
                ].forEach(function (chart) {
                    if (!chart) {
                        return;
                    }

                    chart.resize();
                    chart.update("none");
                });
            },
        );
}

function observeExpeditionErrorsVisibility(
    elements,
) {
    errorsVisibilityObserver
        ?.disconnect();

    errorsVisibilityObserver =
        new MutationObserver(
            function () {
                if (
                    !elements.errorsPanel
                        .classList
                        .contains("is-active") &&
                    !elements.streetsPanel
                        .classList
                        .contains("is-active")
                ) {
                    return;
                }

                resizeExpeditionErrorsCharts();
            },
        );

    [
        elements.expeditionPanel,
        elements.errorsPanel,
        elements.streetsPanel,
    ].forEach(function (element) {
        errorsVisibilityObserver.observe(
            element,
            {
                attributes: true,
                attributeFilter: [
                    "class",
                ],
            },
        );
    });
}

function initializeExpeditionErrorsCharts() {
    const elements =
        getExpeditionErrorsChartElements();

    if (
        !hasExpeditionErrorsChartElements(
            elements,
        )
    ) {
        console.error(
            "Os elementos dos gráficos de erros da expedição não foram encontrados.",
        );

        return false;
    }

    if (
        typeof window.Chart !==
        "function"
    ) {
        console.error(
            "O Chart.js não está disponível para os gráficos de erros da expedição.",
        );

        return false;
    }

    if (
        elements.errorsPanel.dataset
            .expeditionErrorsChartsInitialized ===
        "true"
    ) {
        return true;
    }

    elements.errorsPanel.dataset
        .expeditionErrorsChartsInitialized =
            "true";

    errorBalanceChart =
        createErrorBalanceChart(
            elements.errorBalanceCanvas,
        );

    streetOccurrencesChart =
        createStreetOccurrencesChart(
            elements.streetOccurrencesCanvas,
        );

    subscribeExpeditionState(
        function (state) {
            renderExpeditionErrorsCharts(
                elements,
                state,
            );
        },
    );

    renderExpeditionErrorsCharts(
        elements,
        getExpeditionState(),
    );

    observeExpeditionErrorsVisibility(
        elements,
    );

    window.addEventListener(
        "resize",
        resizeExpeditionErrorsCharts,
    );

    return true;
}

export {
    initializeExpeditionErrorsCharts,
};
