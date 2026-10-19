import { CHART_COLORS, getChartPixelRatio } from "../../charts/theme.js";
import { CHART_TEXT_COLOR, CHART_VALUE_FONT } from "../../charts/theme.js";
import { drawHorizontalBar3D, drawHorizontalBar3DBase } from "../core/horizontal-bars-3d.js";
import { createDashboardChart } from "../../charts/standard.js";
import {
    getExpeditionOperatorRanking,
    getExpeditionState,
    subscribeExpeditionState,
} from "./state.js";

import {
    formatReportPersonFirstName,
} from "../core/person-name.js";

let comparisonChart = null;
let visibilityObserver = null;
let resizeFrame = null;

const CHART_PIXEL_RATIO = getChartPixelRatio();

const ROUTES_SCALE_START = 0;
const ROUTES_SCALE_END = 49;
const TIME_SCALE_START = 51;
const TIME_SCALE_END = 100;
const INITIAL_ROUTE_AXIS_MAXIMUM = 12;
const ROUTE_AXIS_INTERVAL = 2;
const INITIAL_TIME_AXIS_MAXIMUM_SECONDS =
    12 * 60;
const TIME_MAXIMUM_REFERENCE_SECONDS =
    10 * 60;
const TIME_AXIS_INTERVAL_SECONDS =
    2 * 60;
const COMPARISON_COLUMN_GAP = 30;
const COMPARISON_CONTENT_PADDING = Object.freeze({
    top: 12,
    right: 74,
    left: 10,
});
const COMPARISON_LABEL_HEIGHT = 14;
const COMPARISON_LABEL_BAR_GAP = 8;
const ROUTES_BAR_COLOR = "#e4e6eb";
const TIME_BAR_COLOR = CHART_COLORS.yellow;

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
    return formatReportPersonFirstName(
        value,
        "—",
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
            "0px";
    }
}

function getNiceRouteMaximum(value) {
    const maximum = Math.max(
        Math.ceil(Number(value) || 0),
        INITIAL_ROUTE_AXIS_MAXIMUM,
    );

    return Math.ceil(
        maximum /
        ROUTE_AXIS_INTERVAL,
    ) * ROUTE_AXIS_INTERVAL;
}

function getTimeMaximum(value) {
    const receivedValue = Math.max(
        Number(value) || 0,
        INITIAL_TIME_AXIS_MAXIMUM_SECONDS,
    );

    return Math.ceil(
        receivedValue /
        TIME_AXIS_INTERVAL_SECONDS,
    ) * TIME_AXIS_INTERVAL_SECONDS;
}

function getTimeAxisTicks(maximum) {
    const intervalCount = Math.round(
        maximum /
        TIME_AXIS_INTERVAL_SECONDS,
    );

    return Array.from(
        {
            length:
                intervalCount + 1,
        },
        function (_, index) {
            return (
                index *
                TIME_AXIS_INTERVAL_SECONDS
            );
        },
    );
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

function drawRoundedBar(context, positionX, positionY, width, height, fillStyle) {
    drawHorizontalBar3D(context, positionX, positionY, width, height, fillStyle);
}

function drawMetricLabel(
    context,
    label,
    positionX,
    positionY,
    alignment,
    color = CHART_TEXT_COLOR,
) {
    context.textAlign =
        alignment;
    context.textBaseline =
        "middle";

    context.strokeStyle =
        "#18191a";
    context.lineWidth = 3;
    context.fillStyle =
        color;
    context.strokeText(
        label,
        positionX,
        positionY,
    );
    context.fillText(
        label,
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

    const routeMaximum =
        chart.$expeditionRouteMaximum ||
        INITIAL_ROUTE_AXIS_MAXIMUM;
    const timeMaximum =
        chart.$expeditionTimeMaximum ||
        INITIAL_TIME_AXIS_MAXIMUM_SECONDS;
    const comparisonWidth =
        chartArea.right -
        chartArea.left;
    const columnWidth =
        (
            comparisonWidth -
            COMPARISON_COLUMN_GAP
        ) / 2;
    const volumeStart =
        chartArea.left;
    const volumeEnd =
        volumeStart +
        columnWidth;
    const timeGridStart =
        volumeEnd +
        COMPARISON_COLUMN_GAP;
    const timeGridEnd =
        timeGridStart +
        columnWidth;
    const routeStart =
        volumeStart +
        COMPARISON_CONTENT_PADDING.left;
    const routeEnd =
        volumeEnd -
        COMPARISON_CONTENT_PADDING.right;
    const timeStart =
        timeGridStart +
        COMPARISON_CONTENT_PADDING.left;
    const timeEnd =
        timeGridEnd -
        COMPARISON_CONTENT_PADDING.right;
    const barHeight = 24;

    context.save();
    context.strokeStyle =
        "rgba(82, 82, 82, 0.45)";
    context.lineWidth = 1;

    for (
        let routeValue = ROUTE_AXIS_INTERVAL;
        routeValue < routeMaximum;
        routeValue += ROUTE_AXIS_INTERVAL
    ) {
        const ratio =
            routeValue /
            routeMaximum;
        const positionX =
            routeStart +
            (routeEnd - routeStart) *
                ratio;

        context.beginPath();
        context.moveTo(
            positionX,
            chartArea.top,
        );
        context.lineTo(
            positionX,
            chartArea.bottom,
        );
        context.stroke();
    }

    getTimeAxisTicks(
        timeMaximum,
    ).forEach(
        function (timeValue) {
            if (
                timeValue <= 0 ||
                timeValue >= timeMaximum
            ) {
                return;
            }

            const positionX =
                timeStart +
                (
                    timeEnd -
                    timeStart
                ) *
                (
                    timeValue /
                    timeMaximum
                );

            context.beginPath();
            context.moveTo(
                positionX,
                chartArea.top,
            );
            context.lineTo(
                positionX,
                chartArea.bottom,
            );
            context.stroke();
        },
    );

    drawHorizontalBar3DBase(context, { left: routeStart, top: chartArea.top, bottom: chartArea.bottom });
    drawHorizontalBar3DBase(context, { left: timeStart, top: chartArea.top, bottom: chartArea.bottom });

    if (rows.length === 0) {
        context.font =
            '600 14px "Open Sans", sans-serif';
        context.fillStyle =
            CHART_TEXT_COLOR;
        context.textAlign =
            "center";
        context.textBaseline =
            "middle";
        context.fillText(
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

    rows.forEach(
        function (operator, index) {
            const rowTop =
                yScale.getPixelForValue(
                    index - 0.5,
                );
            const positionY =
                Math.max(
                    yScale.getPixelForValue(
                        index,
                    ),
                    rowTop +
                        COMPARISON_CONTENT_PADDING.top +
                        COMPARISON_LABEL_HEIGHT +
                        COMPARISON_LABEL_BAR_GAP +
                        barHeight / 2,
                );
            const rowBottom =
                yScale.getPixelForValue(
                    index + 0.5,
                );
            const labelY =
                positionY -
                barHeight / 2 -
                COMPARISON_LABEL_BAR_GAP;
            const routeBarEnd =
                routeStart +
                (
                    routeEnd -
                    routeStart
                ) *
                Math.min(
                    operator.routesChecked /
                        routeMaximum,
                    1,
                );
            const receivedTime =
                operator
                    .averageDurationSeconds;
            const timeBarEnd =
                receivedTime === null
                    ? timeStart
                    : timeStart +
                        (
                            timeEnd -
                            timeStart
                        ) *
                        Math.min(
                            receivedTime /
                                timeMaximum,
                            1,
                        );

            if (index < rows.length - 1) {
                context.strokeStyle =
                    "rgba(82, 82, 82, 0.4)";
                context.lineWidth = 1;
                context.beginPath();
                context.moveTo(
                    volumeStart,
                    rowBottom,
                );
                context.lineTo(
                    timeGridEnd,
                    rowBottom,
                );
                context.stroke();
            }

            context.font =
                '600 14px "Open Sans", sans-serif';
            context.fillStyle =
                CHART_TEXT_COLOR;
            context.textAlign =
                "left";
            context.textBaseline =
                "bottom";
            context.fillText(
                getOperatorName(
                    operator.operator,
                ),
                routeStart,
                labelY,
            );

            drawRoundedBar(
                context,
                routeStart,
                positionY -
                    barHeight / 2,
                routeEnd - routeStart,
                barHeight,
                "rgba(228, 230, 235, 0.07)",
            );
            drawRoundedBar(
                context,
                routeStart,
                positionY -
                    barHeight / 2,
                routeBarEnd -
                    routeStart,
                barHeight,
                ROUTES_BAR_COLOR,
            );

            drawRoundedBar(
                context,
                timeStart,
                positionY -
                    barHeight / 2,
                timeEnd - timeStart,
                barHeight,
                "rgba(228, 230, 235, 0.07)",
            );

            if (receivedTime !== null) {
                drawRoundedBar(
                    context,
                    timeStart,
                    positionY -
                        barHeight / 2,
                    timeBarEnd -
                        timeStart,
                    barHeight,
                    TIME_BAR_COLOR,
                );
            }

            context.font =
                CHART_VALUE_FONT;
            drawMetricLabel(
                context,
                formatQuantity(
                    operator.routesChecked,
                ),
                routeBarEnd + 20,
                positionY + 7,
                "left",
            );

            if (receivedTime === null) {
                context.fillStyle =
                    CHART_TEXT_COLOR;
                context.textAlign =
                    "left";
                context.fillText(
                    "—",
                    timeStart + 20,
                    positionY + 7,
                );
            } else {
                drawMetricLabel(
                    context,
                    formatDuration(
                        receivedTime,
                    ),
                    timeBarEnd + 20,
                    positionY + 7,
                    "left",
                    CHART_TEXT_COLOR,
                );
            }
        },
    );

    const maximumReferenceX =
        timeStart +
        (
            timeEnd - timeStart
        ) *
        (
            TIME_MAXIMUM_REFERENCE_SECONDS /
            timeMaximum
        );

    context.strokeStyle =
        CHART_COLORS.red;
    context.lineWidth = 1;
    context.setLineDash([
        6,
        5,
    ]);
    context.beginPath();
    context.moveTo(
        maximumReferenceX,
        chartArea.top - 4,
    );
    context.lineTo(
        maximumReferenceX,
        chartArea.bottom,
    );
    context.stroke();
    context.setLineDash([]);

    context.font =
        '600 14px "Open Sans", sans-serif';
    context.textAlign =
        "right";
    context.textBaseline =
        "bottom";
    context.strokeStyle =
        "#18191a";
    context.lineWidth = 3;
    context.fillStyle =
        CHART_TEXT_COLOR;
    context.strokeText(
        "Máximo 10:00",
        maximumReferenceX - 6,
        chartArea.top - 7,
    );
    context.fillText(
        "Máximo 10:00",
        maximumReferenceX - 6,
        chartArea.top - 7,
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
};

function createComparisonChart(canvas) {
    return createDashboardChart(
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
                        pointRadius: 0,
                        pointHoverRadius: 0,
                        pointHitRadius: 12,
                        pointBackgroundColor:
                            "transparent",
                        pointBorderWidth: 0,
                    },
                    {
                        label:
                            "Tempo médio",
                        expeditionMetric:
                            "time",
                        data: [],
                        pointRadius: 0,
                        pointHoverRadius: 0,
                        pointHitRadius: 12,
                        pointBackgroundColor:
                            "transparent",
                        pointBorderWidth: 0,
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
                        top: 38,
                        right: 16,
                        bottom: 16,
                        left: 16,
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
                        enabled: false,

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
                                        "Volume expedido: " +
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
        getTimeMaximum(
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
        operators.length * 74 +
            105,
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
                            ? " rota conferida"
                            : " rotas conferidas"
                    )
                )
                : "0 rotas conferidas";

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
                    "Tempo médio: " +
                    formatDuration(
                        fastestOperator
                            .averageDurationSeconds,
                    )
                )
                : "Tempo médio: —";
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
