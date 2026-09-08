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
        3,
    );

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

        panel:
            document.getElementById(
                "expedition-mistakes",
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

        topOffenderGuardian:
            document.getElementById(
                "expeditionTopOffenderGuardian",
            ),

        topOffenderStreet:
            document.getElementById(
                "expeditionTopOffenderStreet",
            ),

        topOffenderRate:
            document.getElementById(
                "expeditionTopOffenderRate",
            ),
    };
}

function hasExpeditionErrorsChartElements(
    elements,
) {
    return (
        elements.expeditionPanel instanceof
            HTMLElement &&
        elements.panel instanceof
            HTMLElement &&
        elements.errorBalanceCanvas instanceof
            HTMLCanvasElement &&
        elements.streetOccurrencesCanvas instanceof
            HTMLCanvasElement &&
        elements.streetOccurrencesContainer instanceof
            HTMLElement &&
        elements.topOffenderGuardian instanceof
            HTMLElement &&
        elements.topOffenderStreet instanceof
            HTMLElement &&
        elements.topOffenderRate instanceof
            HTMLElement
    );
}

function renderTopOffenderGuardian(
    element,
    guardian,
) {
    const receivedGuardian =
        String(
            guardian ?? "",
        ).trim();

    element.classList.remove(
        "expedition-guardian-name",
    );

    if (!receivedGuardian) {
        element.textContent =
            "Não informado";

        return;
    }

    const guardianMatch =
        receivedGuardian.match(
            /^(\[ops\d+\])\s*(.*)$/i,
        );

    if (!guardianMatch) {
        element.classList.add(
            "expedition-guardian-name",
        );

        element.textContent =
            receivedGuardian;

        return;
    }

    const code =
        document.createElement(
            "span",
        );

    code.textContent =
        guardianMatch[1]
            .toLowerCase();

    const name =
        document.createElement(
            "span",
        );

    name.classList.add(
        "expedition-guardian-name",
    );

    name.textContent =
        guardianMatch[2];

    element.replaceChildren(
        code,
        " ",
        name,
    );
}

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
                    "Resultado",
                ],

                datasets: [
                    {
                        label: "Identificados",
                        data: [0, 0],
                        backgroundColor: "#ffc107",
                        borderWidth: 0,
                        stack: "errors",
                        maxBarThickness: 70,
                    },
                    {
                        label: "Revertidos",
                        data: [0, 0],
                        backgroundColor: "#8BC34A",
                        borderWidth: 0,
                        stack: "errors",
                        maxBarThickness: 70,
                    },
                    {
                        label: "Saldo Final",
                        data: [0, 0],
                        backgroundColor: "#FF5722",
                        borderWidth: 0,
                        stack: "errors",
                        maxBarThickness: 70,
                    },
                ],
            },

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
                        filter(context) {
                            return Number(
                                context.raw,
                            ) > 0;
                        },

                        callbacks: {
                            label(context) {
                                return (
                                    `${context.dataset.label}: ` +
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
                        stacked: true,

                        ticks: {
                            color: "#e4e6eb",
                        },

                        grid: {
                            display: false,
                        },
                    },

                    y: {
                        stacked: true,
                        beginAtZero: true,
                        grace: "12%",

                        ticks: {
                            color: "#e4e6eb",
                            precision: 0,

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
                        maxBarThickness: 18,
                        categoryPercentage: 0.8,
                        barPercentage: 0.85,
                        expeditionStreets: [],
                    },
                    {
                        label: "Erros da Rua",
                        data: [],
                        backgroundColor: "#2196F3",
                        borderWidth: 0,
                        maxBarThickness: 18,
                        categoryPercentage: 0.8,
                        barPercentage: 0.85,
                        expeditionStreets: [],
                    },
                ],
            },

            options: {
                indexAxis: "y",
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
                        beginAtZero: true,
                        grace: "12%",

                        ticks: {
                            color: "#e4e6eb",
                            precision: 0,

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
                            autoSkip: false,
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
            0,
        ];

    errorBalanceChart
        .data
        .datasets[1]
        .data = [
            0,
            revertedErrors,
        ];

    errorBalanceChart
        .data
        .datasets[2]
        .data = [
            0,
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

    elements
        .streetOccurrencesContainer
        .style
        .height =
            `${Math.max(
                300,
                rankedStreets.length *
                    42 +
                    70,
            )}px`;

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

function updateTopOffenderCard(
    elements,
    streets,
) {
    const topOffender =
        streets
            .filter(function (street) {
                return street.totalErrors > 0;
            })
            .slice()
            .sort(function (
                first,
                second,
            ) {
                return (
                    second.totalErrors -
                        first.totalErrors ||
                    second.missingOrders -
                        first.missingOrders ||
                    first.name.localeCompare(
                        second.name,
                        "pt-BR",
                        {
                            numeric: true,
                        },
                    )
                );
            })[0] || null;

    if (!topOffender) {
        elements.topOffenderGuardian
            .classList
            .remove(
                "expedition-guardian-name",
            );

        elements.topOffenderGuardian
            .textContent =
                "Guardião";

        elements.topOffenderStreet
            .textContent = "—";

        elements.topOffenderRate
            .textContent = "—";

        return;
    }

    renderTopOffenderGuardian(
        elements.topOffenderGuardian,
        topOffender.guardian,
    );

    elements.topOffenderStreet
        .textContent =
            topOffender.name;

    elements.topOffenderRate
        .textContent =
            formatErrorChartRate(
                topOffender.errorRate,
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

    const animate =
        elements.panel
            .classList
            .contains(
                "is-active",
            );

    updateTopOffenderCard(
        elements,
        analysis.streets,
    );

    updateErrorBalanceChart(
        analysis,
        animate,
    );

    updateStreetOccurrencesChart(
        elements,
        analysis.streets,
        animate,
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
                    !elements.panel
                        .classList
                        .contains(
                            "is-active",
                        )
                ) {
                    return;
                }

                resizeExpeditionErrorsCharts();
            },
        );

    [
        elements.expeditionPanel,
        elements.panel,
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
        elements.panel.dataset
            .expeditionErrorsChartsInitialized ===
        "true"
    ) {
        return true;
    }

    elements.panel.dataset
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
