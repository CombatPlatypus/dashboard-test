import {
    getExpeditionOperatorRanking,
    getExpeditionState,
    subscribeExpeditionState,
} from "./state.js";

let comparisonChart = null;
let visibilityObserver = null;
let resizeFrame = null;

const CHART_PIXEL_RATIO = Math.max(
    typeof window !== "undefined"
        ? window.devicePixelRatio || 1
        : 1,
    4,
);

const ROUTES_SCALE_START = 0;
const ROUTES_SCALE_END = 42;
const TIME_SCALE_START = 58;
const TIME_SCALE_END = 100;
const SCALE_INTERVALS = 3;

const quantityFormatter =
    new Intl.NumberFormat(
        "pt-BR",
    );

function formatQuantity(value) {
    if (
        value === null ||
        value === undefined ||
        !Number.isFinite(Number(value))
    ) {
        return "—";
    }

    return quantityFormatter.format(
        Number(value),
    );
}

function formatDuration(value) {
    if (
        value === null ||
        value === undefined ||
        !Number.isFinite(Number(value))
    ) {
        return "—";
    }

    const totalSeconds = Math.max(
        Math.round(Number(value)),
        0,
    );

    const hours = Math.floor(
        totalSeconds / 3600,
    );

    const minutes = Math.floor(
        (totalSeconds % 3600) / 60,
    );

    const seconds =
        totalSeconds % 60;

    const formattedMinutes =
        String(minutes).padStart(
            2,
            "0",
        );

    const formattedSeconds =
        String(seconds).padStart(
            2,
            "0",
        );

    if (hours > 0) {
        return (
            `${String(hours).padStart(2, "0")}:` +
            `${formattedMinutes}:` +
            formattedSeconds
        );
    }

    return (
        `${formattedMinutes}:` +
        formattedSeconds
    );
}

function getOperatorName(value) {
    const receivedValue =
        String(value ?? "")
            .trim();

    if (!receivedValue) {
        return "—";
    }

    const closingBracketIndex =
        receivedValue.lastIndexOf(
            "]",
        );

    const name =
        closingBracketIndex !== -1
            ? receivedValue.slice(
                closingBracketIndex + 1,
            )
            : receivedValue;

    const normalizedName =
        name.trim();

    if (!normalizedName) {
        return "—";
    }

    const firstName =
        normalizedName
            .split(/\s+/)[0]
            .toLocaleLowerCase(
                "pt-BR",
            );

    return (
        firstName
            .charAt(0)
            .toLocaleUpperCase(
                "pt-BR",
            ) +
        firstName.slice(1)
    );
}

function getChartElements(
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

        panel:
            getElementById(
                "expedition-charts",
            ),

        preview:
            getElementById(
                "expeditionChartsExportArea",
            ),

        topRoutesOperator:
            getElementById(
                "expeditionTopRoutesOperator",
            ),

        topRoutesDetails:
            getElementById(
                "expeditionTopRoutesDetails",
            ),

        fastestOperator:
            getElementById(
                "expeditionFastestOperator",
            ),

        fastestOperatorDetails:
            getElementById(
                "expeditionFastestOperatorDetails",
            ),

        chartContainer:
            getElementById(
                "expeditionAlignedComparisonChartContainer",
            ),

        comparisonCanvas:
            getElementById(
                "expeditionAlignedComparisonChart",
            ),
    };
}

function hasChartElements(elements) {
    return (
        elements.expeditionPanel instanceof
            HTMLElement &&
        elements.panel instanceof
            HTMLElement &&
        elements.preview instanceof
            HTMLElement &&
        elements.topRoutesOperator instanceof
            HTMLElement &&
        elements.topRoutesDetails instanceof
            HTMLElement &&
        elements.fastestOperator instanceof
            HTMLElement &&
        elements.fastestOperatorDetails instanceof
            HTMLElement &&
        elements.chartContainer instanceof
            HTMLElement &&
        elements.comparisonCanvas instanceof
            HTMLCanvasElement
    );
}

function applyTextSpacing(chart) {
    if (
        "letterSpacing" in
        chart.ctx
    ) {
        chart.ctx.letterSpacing =
            "1px";
    }
}

function getNiceRouteMaximum(value) {
    const maximum = Math.max(
        Math.ceil(Number(value) || 0),
        1,
    );

    const roughStep =
        maximum /
        SCALE_INTERVALS;

    const magnitude =
        10 ** Math.floor(
            Math.log10(
                roughStep,
            ),
        );

    const normalizedStep =
        roughStep /
        magnitude;

    const multiplier =
        normalizedStep <= 1
            ? 1
            : normalizedStep <= 2
                ? 2
                : normalizedStep <= 5
                    ? 5
                    : 10;

    const step = Math.max(
        1,
        Math.ceil(
            multiplier *
            magnitude,
        ),
    );

    return step *
        SCALE_INTERVALS;
}

function getNiceTimeMaximum(value) {
    const maximum = Math.max(
        Number(value) || 0,
        60,
    );

    const availableSteps = [
        60,
        120,
        180,
        300,
        600,
        900,
        1200,
        1800,
        3600,
        7200,
    ];

    const step =
        availableSteps.find(
            function (candidate) {
                return (
                    candidate *
                    SCALE_INTERVALS >=
                    maximum
                );
            },
        ) || Math.ceil(
            maximum /
            SCALE_INTERVALS /
            3600,
        ) * 3600;

    return step *
        SCALE_INTERVALS;
}

function normalizeMetric(
    value,
    maximum,
    start,
    end,
) {
    const ratio = Math.max(
        0,
        Math.min(
            Number(value) /
                maximum,
            1,
        ),
    );

    return start +
        (
            end - start
        ) * ratio;
}

function drawCenteredText(
    context,
    text,
    positionX,
    positionY,
) {
    context.textAlign =
        "center";
    context.textBaseline =
        "middle";
    context.fillText(
        text,
        positionX,
        positionY,
    );
}

function drawComparisonStructure(chart) {
    const rows =
        chart.$expeditionRows || [];

    const context =
        chart.ctx;

    const chartArea =
        chart.chartArea;

    const xScale =
        chart.scales.x;

    const yScale =
        chart.scales.y;

    if (
        !chartArea ||
        !xScale ||
        !yScale
    ) {
        return;
    }

    applyTextSpacing(
        chart,
    );

    context.save();

    context.font =
        '600 15px "Open Sans", sans-serif';
    context.fillStyle =
        "#e4e6eb";

    drawCenteredText(
        context,
        "Rotas",
        (
            xScale.getPixelForValue(
                ROUTES_SCALE_START,
            ) +
            xScale.getPixelForValue(
                ROUTES_SCALE_END,
            )
        ) / 2,
        chartArea.top - 52,
    );

    drawCenteredText(
        context,
        "Tempo médio",
        (
            xScale.getPixelForValue(
                TIME_SCALE_START,
            ) +
            xScale.getPixelForValue(
                TIME_SCALE_END,
            )
        ) / 2,
        chartArea.top - 52,
    );

    const routeMaximum =
        chart.$expeditionRouteMaximum ||
        1;

    const timeMaximum =
        chart.$expeditionTimeMaximum ||
        60;

    context.font =
        '500 12px "Open Sans", sans-serif';
    context.fillStyle =
        "#bfc2c8";
    context.strokeStyle =
        "rgba(82, 82, 82, 0.45)";
    context.lineWidth = 1;

    for (
        let index = 0;
        index <= SCALE_INTERVALS;
        index += 1
    ) {
        const ratio =
            index /
            SCALE_INTERVALS;

        const routeValue =
            routeMaximum *
            ratio;

        const routePosition =
            ROUTES_SCALE_START +
            (
                ROUTES_SCALE_END -
                ROUTES_SCALE_START
            ) * ratio;

        const routeX =
            xScale.getPixelForValue(
                routePosition,
            );

        context.beginPath();
        context.moveTo(
            routeX,
            chartArea.top - 4,
        );
        context.lineTo(
            routeX,
            chartArea.bottom,
        );
        context.stroke();

        drawCenteredText(
            context,
            formatQuantity(
                routeValue,
            ),
            routeX,
            chartArea.top - 22,
        );

        const timeValue =
            timeMaximum *
            ratio;

        const timePosition =
            TIME_SCALE_START +
            (
                TIME_SCALE_END -
                TIME_SCALE_START
            ) * ratio;

        const timeX =
            xScale.getPixelForValue(
                timePosition,
            );

        context.beginPath();
        context.moveTo(
            timeX,
            chartArea.top - 4,
        );
        context.lineTo(
            timeX,
            chartArea.bottom,
        );
        context.stroke();

        drawCenteredText(
            context,
            formatDuration(
                timeValue,
            ),
            timeX,
            chartArea.top - 22,
        );
    }

    context.strokeStyle =
        "rgba(82, 82, 82, 0.65)";

    context.beginPath();
    context.moveTo(
        xScale.getPixelForValue(
            50,
        ),
        chartArea.top - 12,
    );
    context.lineTo(
        xScale.getPixelForValue(
            50,
        ),
        chartArea.bottom,
    );
    context.stroke();

    if (rows.length === 0) {
        context.font =
            '600 14px "Open Sans", sans-serif';
        context.fillStyle =
            "#bfc2c8";

        drawCenteredText(
            context,
            "Importe os dados para comparar os conferentes.",
            (
                chartArea.left +
                chartArea.right
            ) / 2,
            (
                chartArea.top +
                chartArea.bottom
            ) / 2,
        );

        context.restore();
        return;
    }

    context.font =
        '600 14px "Open Sans", sans-serif';
    context.fillStyle =
        "#e4e6eb";
    context.textAlign =
        "right";
    context.textBaseline =
        "middle";

    rows.forEach(
        function (operator, index) {
            const positionY =
                yScale.getPixelForValue(
                    index,
                );

            context.strokeStyle =
                "rgba(82, 82, 82, 0.3)";
            context.beginPath();
            context.moveTo(
                xScale.getPixelForValue(
                    ROUTES_SCALE_START,
                ),
                positionY,
            );
            context.lineTo(
                xScale.getPixelForValue(
                    TIME_SCALE_END,
                ),
                positionY,
            );
            context.stroke();

            context.fillStyle =
                "#e4e6eb";
            context.fillText(
                getOperatorName(
                    operator.operator,
                ),
                xScale.getPixelForValue(
                    ROUTES_SCALE_START,
                ) - 16,
                positionY,
            );

            if (
                operator
                    .averageDurationSeconds ===
                null
            ) {
                context.textAlign =
                    "left";
                context.fillStyle =
                    "#bfc2c8";
                context.fillText(
                    "—",
                    xScale.getPixelForValue(
                        TIME_SCALE_START,
                    ) + 8,
                    positionY,
                );
                context.textAlign =
                    "right";
            }
        },
    );

    context.restore();
}

function drawPointValues(chart) {
    const context =
        chart.ctx;

    const xScale =
        chart.scales.x;

    if (!xScale) {
        return;
    }

    applyTextSpacing(
        chart,
    );

    context.save();
    context.font =
        '600 13px "Open Sans", sans-serif';
    context.textBaseline =
        "middle";
    context.fillStyle =
        "#e4e6eb";
    context.strokeStyle =
        "#1c1c1c";
    context.lineWidth = 3;

    chart.data.datasets.forEach(
        function (dataset, datasetIndex) {
            const metadata =
                chart.getDatasetMeta(
                    datasetIndex,
                );

            metadata.data.forEach(
                function (point, index) {
                    const receivedValue =
                        dataset.data[index]
                            ?.actualValue;

                    if (
                        !Number.isFinite(
                            Number(
                                receivedValue,
                            ),
                        )
                    ) {
                        return;
                    }

                    const formattedValue =
                        dataset
                            .expeditionMetric ===
                        "time"
                            ? formatDuration(
                                receivedValue,
                            )
                            : formatQuantity(
                                receivedValue,
                            );

                    const panelLimit =
                        dataset
                            .expeditionMetric ===
                        "time"
                            ? chart.chartArea
                                .right
                            : xScale
                                .getPixelForValue(
                                    TIME_SCALE_START,
                                ) - 10;

                    const textWidth =
                        context.measureText(
                            formattedValue,
                        ).width;

                    let positionX =
                        point.x + 10;

                    let textAlign =
                        "left";

                    if (
                        positionX +
                            textWidth >
                        panelLimit
                    ) {
                        positionX =
                            point.x - 10;
                        textAlign =
                            "right";
                    }

                    context.textAlign =
                        textAlign;
                    context.strokeText(
                        formattedValue,
                        positionX,
                        point.y,
                    );
                    context.fillText(
                        formattedValue,
                        positionX,
                        point.y,
                    );
                },
            );
        },
    );

    context.restore();
}

const alignedComparisonPlugin = {
    id: "expeditionAlignedComparison",

    beforeDatasetsDraw(chart) {
        drawComparisonStructure(
            chart,
        );
    },

    afterDatasetsDraw(chart) {
        drawPointValues(
            chart,
        );
    },
};

function createComparisonChart(canvas) {
    return new window.Chart(
        canvas,
        {
            type: "scatter",

            data: {
                datasets: [
                    {
                        label: "Rotas",
                        expeditionMetric:
                            "routes",
                        data: [],
                        pointRadius: 6,
                        pointHoverRadius: 8,
                        pointBackgroundColor:
                            "#4CAF50",
                        pointBorderColor:
                            "#d8f0d9",
                        pointBorderWidth: 2,
                    },
                    {
                        label:
                            "Tempo médio",
                        expeditionMetric:
                            "time",
                        data: [],
                        pointRadius: 6,
                        pointHoverRadius: 8,
                        pointBackgroundColor:
                            "#2196F3",
                        pointBorderColor:
                            "#d5ebfd",
                        pointBorderWidth: 2,
                    },
                ],
            },

            plugins: [
                alignedComparisonPlugin,
            ],

            options: {
                responsive: true,
                maintainAspectRatio: false,
                devicePixelRatio:
                    CHART_PIXEL_RATIO,
                parsing: false,

                layout: {
                    padding: {
                        top: 76,
                        right: 52,
                        bottom: 16,
                        left: 112,
                    },
                },

                animation: {
                    duration: 250,
                },

                interaction: {
                    intersect: true,
                    mode: "nearest",
                },

                plugins: {
                    legend: {
                        display: false,
                    },

                    tooltip: {
                        titleFont: {
                            family:
                                '"Open Sans", sans-serif',
                            size: 14,
                            weight: "600",
                        },

                        bodyFont: {
                            family:
                                '"Open Sans", sans-serif',
                            size: 14,
                        },

                        callbacks: {
                            title(contexts) {
                                return contexts[0]
                                    ?.raw
                                    ?.operatorName ||
                                    "";
                            },

                            label(context) {
                                const data =
                                    context.raw;

                                return context
                                    .dataset
                                    .expeditionMetric ===
                                    "time"
                                    ? (
                                        "Tempo médio: " +
                                        formatDuration(
                                            data.actualValue,
                                        )
                                    )
                                    : (
                                        "Rotas conferidas: " +
                                        formatQuantity(
                                            data.actualValue,
                                        )
                                    );
                            },

                            afterLabel(context) {
                                const data =
                                    context.raw;

                                if (
                                    context
                                        .dataset
                                        .expeditionMetric ===
                                    "routes"
                                ) {
                                    return (
                                        "Volume conferido: " +
                                        formatQuantity(
                                            data.details
                                                .volumeChecked,
                                        )
                                    );
                                }

                                return [
                                    (
                                        "Melhor tempo: " +
                                        formatDuration(
                                            data.details
                                                .bestDurationSeconds,
                                        )
                                    ),
                                    (
                                        "Pior tempo: " +
                                        formatDuration(
                                            data.details
                                                .worstDurationSeconds,
                                        )
                                    ),
                                ];
                            },
                        },
                    },
                },

                scales: {
                    x: {
                        type: "linear",
                        display: false,
                        min: 0,
                        max: 100,
                    },

                    y: {
                        type: "linear",
                        display: false,
                        reverse: true,
                        min: -0.5,
                        max: 0.5,
                    },
                },
            },
        },
    );
}

function updateComparisonChart(
    chart,
    operators,
    animate,
) {
    const maximumRoutes =
        getNiceRouteMaximum(
            Math.max(
                0,
                ...operators.map(
                    function (operator) {
                        return operator
                            .routesChecked;
                    },
                ),
            ),
        );

    const maximumTime =
        getNiceTimeMaximum(
            Math.max(
                0,
                ...operators.map(
                    function (operator) {
                        return operator
                            .averageDurationSeconds ??
                            0;
                    },
                ),
            ),
        );

    chart.$expeditionRows =
        operators;
    chart.$expeditionRouteMaximum =
        maximumRoutes;
    chart.$expeditionTimeMaximum =
        maximumTime;

    chart.options.scales.y.max =
        Math.max(
            operators.length - 0.5,
            0.5,
        );

    chart.data.datasets[0].data =
        operators.map(
            function (operator, index) {
                return {
                    x: normalizeMetric(
                        operator.routesChecked,
                        maximumRoutes,
                        ROUTES_SCALE_START,
                        ROUTES_SCALE_END,
                    ),
                    y: index,
                    actualValue:
                        operator.routesChecked,
                    operatorName:
                        getOperatorName(
                            operator.operator,
                        ),
                    details: operator,
                };
            },
        );

    chart.data.datasets[1].data =
        operators.flatMap(
            function (operator, index) {
                if (
                    operator
                        .averageDurationSeconds ===
                    null
                ) {
                    return [];
                }

                return [
                    {
                        x: normalizeMetric(
                            operator
                                .averageDurationSeconds,
                            maximumTime,
                            TIME_SCALE_START,
                            TIME_SCALE_END,
                        ),
                        y: index,
                        actualValue:
                            operator
                                .averageDurationSeconds,
                        operatorName:
                            getOperatorName(
                                operator.operator,
                            ),
                        details: operator,
                    },
                ];
            },
        );

    const chartHeight = Math.max(
        470,
        operators.length * 48 +
            110,
    );

    chart.canvas
        .parentElement
        .style.height =
            `${chartHeight}px`;

    chart.resize();
    chart.update(
        animate
            ? undefined
            : "none",
    );
}

function renderCards(
    elements,
    topRoutesOperator,
    fastestOperator,
) {
    elements
        .topRoutesOperator
        .textContent =
            topRoutesOperator
                ? getOperatorName(
                    topRoutesOperator
                        .operator,
                )
                : "—";

    elements
        .topRoutesDetails
        .textContent =
            topRoutesOperator
                ? (
                    formatQuantity(
                        topRoutesOperator
                            .routesChecked,
                    ) +
                    (
                        topRoutesOperator
                            .routesChecked ===
                        1
                            ? " Rota Conferida"
                            : " Rotas Conferidas"
                    )
                )
                : "0 Rotas Conferidas";

    elements
        .fastestOperator
        .textContent =
            fastestOperator
                ? getOperatorName(
                    fastestOperator
                        .operator,
                )
                : "—";

    elements
        .fastestOperatorDetails
        .textContent =
            fastestOperator
                ? (
                    "Tempo Médio: " +
                    formatDuration(
                        fastestOperator
                            .averageDurationSeconds,
                    )
                )
                : "Tempo Médio: —";
}

function renderCharts(
    elements,
    state,
) {
    const operators =
        getExpeditionOperatorRanking(
            state,
        ).filter(
            function (operator) {
                return operator.selected !==
                    false;
            },
        );

    const routesRanking =
        operators
            .slice()
            .sort(
                function (
                    first,
                    second,
                ) {
                    return (
                        second
                            .routesChecked -
                        first
                            .routesChecked ||
                        first
                            .operator
                            .localeCompare(
                                second
                                    .operator,
                                "pt-BR",
                            )
                    );
                },
            );

    const timeRanking =
        operators
            .filter(
                function (operator) {
                    return operator
                        .averageDurationSeconds !==
                        null;
                },
            )
            .sort(
                function (
                    first,
                    second,
                ) {
                    return (
                        first
                            .averageDurationSeconds -
                        second
                            .averageDurationSeconds ||
                        second
                            .routesChecked -
                        first
                            .routesChecked ||
                        first
                            .operator
                            .localeCompare(
                                second
                                    .operator,
                                "pt-BR",
                            )
                    );
                },
            );

    renderCards(
        elements,
        routesRanking[0] ||
            null,
        timeRanking[0] ||
            null,
    );

    updateComparisonChart(
        comparisonChart,
        routesRanking,
        elements
            .panel
            .classList
            .contains(
                "is-active",
            ),
    );
}

function resizeChart() {
    if (
        resizeFrame !==
        null
    ) {
        window.cancelAnimationFrame(
            resizeFrame,
        );
    }

    resizeFrame =
        window.requestAnimationFrame(
            function () {
                resizeFrame = null;

                if (!comparisonChart) {
                    return;
                }

                comparisonChart.resize();
                comparisonChart.update(
                    "none",
                );
            },
        );
}

function observeVisibility(elements) {
    visibilityObserver
        ?.disconnect();

    visibilityObserver =
        new MutationObserver(
            function () {
                if (
                    !elements
                        .panel
                        .classList
                        .contains(
                            "is-active",
                        )
                ) {
                    return;
                }

                resizeChart();
            },
        );

    [
        elements.expeditionPanel,
        elements.panel,
    ].forEach(
        function (element) {
            visibilityObserver.observe(
                element,
                {
                    attributes: true,
                    attributeFilter: [
                        "class",
                    ],
                },
            );
        },
    );
}

function initializeExpeditionCharts(
    rootElement = document,
) {
    const elements =
        getChartElements(
            rootElement,
        );

    if (
        !hasChartElements(
            elements,
        )
    ) {
        console.error(
            "Os elementos do Rank de Conferentes não foram encontrados.",
        );

        return false;
    }

    if (
        typeof window.Chart !==
        "function"
    ) {
        console.error(
            "O Chart.js não está disponível para o gráfico de expedição.",
        );

        return false;
    }

    if (
        elements
            .panel
            .dataset
            .expeditionChartsInitialized ===
        "true"
    ) {
        return true;
    }

    elements
        .panel
        .dataset
        .expeditionChartsInitialized =
            "true";

    comparisonChart =
        createComparisonChart(
            elements
                .comparisonCanvas,
        );

    subscribeExpeditionState(
        function (state) {
            renderCharts(
                elements,
                state,
            );
        },
    );

    renderCharts(
        elements,
        getExpeditionState(),
    );

    observeVisibility(
        elements,
    );

    return true;
}

export {
    initializeExpeditionCharts,
};
