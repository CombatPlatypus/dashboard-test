import { CHART_TEXT_COLOR } from "../../charts/theme.js";

import {
    getExpeditionErrorAnalysis,
    getExpeditionState,
    subscribeExpeditionState,
} from "./state.js";

let errorBalanceChart = null;
let streetOccurrencesChart = null;
let errorsVisibilityObserver = null;
let errorsResizeFrame = null;

const ERROR_CHART_PIXEL_RATIO =
    Math.max(
        typeof window !== "undefined"
            ? window.devicePixelRatio || 1
            : 1,
        4,
    );

const ERROR_CHART_FONT = {
    family: '"Open Sans", sans-serif',
    size: 14,
};

const ERROR_BALANCE_3D_DEPTH = {
    x: 10,
    y: 9,
};

const ERROR_BALANCE_3D_BASE_COLOR =
    "rgba(168, 169, 173, 0.16)";

const ERROR_BALANCE_3D_BASE_BORDER_COLOR =
    "rgba(168, 169, 173, 0.34)";

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

function getExpeditionErrorsChartElements(
    rootElement = document,
) {
    const getElementById =
        function (elementId) {
            if (
                rootElement.id ===
                elementId
            ) {
                return rootElement;
            }

            return rootElement.querySelector(
                `#${elementId}`,
            );
        };

    return {
        expeditionPanel:
            getElementById(
                "expedition",
            ),

        errorsPanel:
            getElementById(
                "expedition-mistakes",
            ),

        streetsPanel:
            getElementById(
                "expedition-streets",
            ),

        errorBalanceCanvas:
            getElementById(
                "expeditionErrorBalanceChart",
            ),

        streetOccurrencesCanvas:
            getElementById(
                "expeditionStreetOccurrencesChart",
            ),

        streetOccurrencesContainer:
            getElementById(
                "expeditionStreetOccurrencesChartContainer",
            ),

        bestStreet:
            getElementById(
                "expeditionBestStreet",
            ),

        bestStreetRate:
            getElementById(
                "expeditionBestStreetRate",
            ),

        worstStreet:
            getElementById(
                "expeditionWorstStreet",
            ),

        worstStreetRate:
            getElementById(
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

function mixErrorBalanceColor(
    color,
    target,
    ratio,
) {
    const normalizedColor =
        typeof color === "string"
            ? color.trim()
            : "";

    const match = normalizedColor.match(
        /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i,
    );

    if (!match) {
        return normalizedColor;
    }

    const targetValue =
        target === "light"
            ? 255
            : 0;

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

function drawErrorBalanceFace(
    context,
    points,
    color,
    borderColor = null,
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

    if (borderColor) {
        context.strokeStyle = borderColor;
        context.lineWidth = 1;
        context.stroke();
    }
}

const expeditionErrorBalance3DPlugin = {
    id: "expeditionErrorBalance3D",

    beforeDatasetsDraw(chart) {
        const area = chart.chartArea;

        if (!area) {
            return;
        }

        const context = chart.ctx;
        const depthX =
            ERROR_BALANCE_3D_DEPTH.x;

        const depthY =
            ERROR_BALANCE_3D_DEPTH.y;

        context.save();

        drawErrorBalanceFace(
            context,
            [
                {
                    x: area.left - depthX,
                    y: area.top - depthY,
                },
                {
                    x: area.left,
                    y: area.top,
                },
                {
                    x: area.left,
                    y: area.bottom,
                },
                {
                    x: area.left - depthX,
                    y: area.bottom + depthY,
                },
            ],
            ERROR_BALANCE_3D_BASE_COLOR,
            ERROR_BALANCE_3D_BASE_BORDER_COLOR,
        );

        context.restore();
    },

    beforeDatasetDraw(
        chart,
        args,
    ) {
        if (
            args.index !== 0 ||
            !chart.chartArea
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

        const context = chart.ctx;

        context.save();

        bars.forEach(function (
            bar,
            index,
        ) {
            const properties =
                typeof bar.getProps ===
                "function"
                    ? bar.getProps(
                        [
                            "x",
                            "y",
                            "base",
                            "height",
                        ],
                        false,
                    )
                    : bar;

            const values = [
                properties.x,
                properties.y,
                properties.base,
                properties.height,
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
                height,
            ] = values;

            const left =
                Math.min(base, x);

            const right =
                Math.max(base, x);

            if (
                right - left < 0.5 ||
                height <= 0
            ) {
                return;
            }

            const top =
                y - height / 2;

            const bottom =
                y + height / 2;

            const colors =
                dataset.backgroundColor;

            const frontColor =
                Array.isArray(colors)
                    ? colors[index]
                    : colors;

            if (
                typeof frontColor !==
                "string"
            ) {
                return;
            }

            const depthX =
                ERROR_BALANCE_3D_DEPTH.x;

            const depthY =
                ERROR_BALANCE_3D_DEPTH.y;

            drawErrorBalanceFace(
                context,
                [
                    { x: left, y: bottom },
                    { x: right, y: bottom },
                    {
                        x: right + depthX,
                        y: bottom + depthY,
                    },
                    {
                        x: left + depthX,
                        y: bottom + depthY,
                    },
                ],
                mixErrorBalanceColor(
                    frontColor,
                    "dark",
                    0.42,
                ),
            );

            drawErrorBalanceFace(
                context,
                [
                    { x: right, y: top },
                    {
                        x: right + depthX,
                        y: top + depthY,
                    },
                    {
                        x: right + depthX,
                        y: bottom + depthY,
                    },
                    { x: right, y: bottom },
                ],
                mixErrorBalanceColor(
                    frontColor,
                    "light",
                    0.28,
                ),
            );
        });

        context.restore();
    },
};

const expeditionStreetBarValuesPlugin = {
    id: "expeditionStreetBarValues",

    afterDatasetsDraw(chart) {
        if (!chart.chartArea) {
            return;
        }

        const context = chart.ctx;

        context.save();
        applyExpeditionErrorsTextSpacing(chart);
        context.font =
            '600 14px "Open Sans", sans-serif';
        context.textAlign = "center";
        context.textBaseline = "bottom";
        context.fillStyle = CHART_TEXT_COLOR;
        context.strokeStyle = "#18191a";
        context.lineWidth = 3;

        chart.data.datasets.forEach(
            function (dataset, datasetIndex) {
                if (!chart.isDatasetVisible(datasetIndex)) {
                    return;
                }

                chart.getDatasetMeta(datasetIndex).data.forEach(
                    function (bar, index) {
                        const value = dataset.data[index];

                        if (
                            value === null ||
                            value === undefined ||
                            !Number.isFinite(Number(value))
                        ) {
                            return;
                        }

                        const label =
                            formatErrorChartQuantity(value);
                        const labelY = bar.y - 8;

                        context.strokeText(label, bar.x, labelY);
                        context.fillText(label, bar.x, labelY);
                    },
                );
            },
        );

        context.restore();
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
                    "Erros de Etiqueta",
                    "Erros de Sorting",
                    "Revertidos",
                    "Saldo Final",
                ],

                datasets: [
                    {
                        data: [0, 0, 0, 0],
                        backgroundColor: [
                            "#3F51B5",
                            "#f0ad4e",
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
                expeditionErrorBalance3DPlugin,
            ],

            options: {
                indexAxis: "y",
                responsive: true,
                maintainAspectRatio: false,
                devicePixelRatio:
                    ERROR_CHART_PIXEL_RATIO,

                animation: {
                    duration: 250,
                },

                layout: {
                    padding: {
                        right:
                            ERROR_BALANCE_3D_DEPTH.x,
                        bottom:
                            ERROR_BALANCE_3D_DEPTH.y,
                    },
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
                        enabled: false,

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
                            color: CHART_TEXT_COLOR,
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
                        afterFit(scale) {
                            scale.width += 16;
                        },

                        ticks: {
                            color: CHART_TEXT_COLOR,
                            font:
                                ERROR_CHART_FONT,
                            padding: 8,
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
                expeditionStreetBarValuesPlugin,
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
                        enabled: false,

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
                            color: CHART_TEXT_COLOR,
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
                        grace: "15%",

                        ticks: {
                            color: CHART_TEXT_COLOR,
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
    const labelingErrors =
        analysis.labelingErrors ?? 0;

    const sortingErrors =
        analysis.sortingErrors ?? 0;

    const revertedErrors =
        analysis.totalRevertedErrors ?? 0;

    const finalErrors =
        analysis.finalErrors ?? 0;

    errorBalanceChart
        .data
        .datasets[0]
        .data = [
            labelingErrors,
            sortingErrors,
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

function initializeExpeditionErrorsCharts(
    rootElement = document,
) {
    const elements =
        getExpeditionErrorsChartElements(
            rootElement,
        );

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
