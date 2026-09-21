import {
    getDamageAndLossesState,
    getDamageAndLossesSummary,
    subscribeDamageAndLossesState,
} from "./state.js";

const DAMAGE_SOC_COLOR =
    "#ffc107";

const DAMAGE_HUB_COLOR =
    "#F44336";

const DAMAGE_SOLID_COLOR =
    "#F44336";

const DAMAGE_LIQUID_COLOR =
    "#ff9800";

const DAMAGE_GLASS_COLOR =
    "#3F51B5";

const damageChartQuantityFormatter =
    new Intl.NumberFormat(
        "pt-BR",
        {
            maximumFractionDigits: 0,
        },
    );

let damageLastSevenDaysChart = null;
let damageCompositionChart = null;

function formatDamageChartDate(
    dateKey,
) {
    const [
        ,
        month,
        day,
    ] = String(dateKey ?? "")
        .split("-");

    return month && day
        ? `${day}/${month}`
        : "—";
}

function drawDamageChartText(
    context,
    text,
    positionX,
    positionY,
    {
        color = "#e4e6eb",
        align = "center",
        font =
            '600 14px "Open Sans", sans-serif',
    } = {},
) {
    context.font = font;
    context.textAlign = align;
    context.textBaseline = "middle";
    context.lineWidth = 2;
    context.strokeStyle =
        "rgba(15, 15, 15, 0.7)";
    context.fillStyle = color;
    context.strokeText(
        text,
        positionX,
        positionY,
    );
    context.fillText(
        text,
        positionX,
        positionY,
    );
}

const damageChartAveragePlugin = {
    id: "damageChartAverage",

    afterDatasetsDraw(chart) {
        const average =
            Number(
                chart.$damageDailyAverage,
            );

        const yScale =
            chart.scales.y;

        if (
            !Number.isFinite(average) ||
            average <= 0 ||
            !yScale
        ) {
            return;
        }

        const context = chart.ctx;
        const chartArea =
            chart.chartArea;
        const positionY =
            yScale.getPixelForValue(
                average,
            );

        context.save();
        context.strokeStyle =
            "#e4e6eb";
        context.lineWidth = 1;
        context.setLineDash([
            8,
            6,
        ]);
        context.beginPath();
        context.moveTo(
            chartArea.left,
            positionY,
        );
        context.lineTo(
            chartArea.right,
            positionY,
        );
        context.stroke();
        context.setLineDash([]);

        drawDamageChartText(
            context,
            `Média diária: ${damageChartQuantityFormatter.format(average)}`,
            chartArea.right + 10,
            positionY,
            {
                align: "left",
                font:
                    '500 13px "Open Sans", sans-serif',
            },
        );

        context.restore();
    },
};

const damageChartLabelsPlugin = {
    id: "damageChartLabels",

    afterDatasetsDraw(chart) {
        const days =
            chart.$damageChartDays || [];

        if (days.length === 0) {
            return;
        }

        const context = chart.ctx;
        const yScale =
            chart.scales.y;

        const socElements =
            chart.getDatasetMeta(0)
                .data;

        const hubElements =
            chart.getDatasetMeta(1)
                .data;

        context.save();

        days.forEach(
            function (day, index) {
                const total =
                    day.soc +
                    day.hub;

                const socElement =
                    socElements[index];

                const hubElement =
                    hubElements[index];

                if (
                    day.soc > 0 &&
                    socElement
                ) {
                    const properties =
                        socElement.getProps(
                            [
                                "x",
                                "y",
                                "base",
                            ],
                            true,
                        );

                    if (
                        Math.abs(
                            properties.base -
                            properties.y,
                        ) >= 12
                    ) {
                        drawDamageChartText(
                            context,
                            damageChartQuantityFormatter
                                .format(
                                    day.soc,
                                ),
                            properties.x,
                            (
                                properties.base +
                                properties.y
                            ) / 2,
                        );
                    }
                }

                if (
                    day.hub > 0 &&
                    hubElement
                ) {
                    const properties =
                        hubElement.getProps(
                            [
                                "x",
                                "y",
                                "base",
                            ],
                            true,
                        );

                    if (
                        Math.abs(
                            properties.base -
                            properties.y,
                        ) >= 12
                    ) {
                        drawDamageChartText(
                            context,
                            damageChartQuantityFormatter
                                .format(
                                    day.hub,
                                ),
                            properties.x,
                            (
                                properties.base +
                                properties.y
                            ) / 2,
                        );
                    }
                }

                if (
                    total > 0 &&
                    (hubElement || socElement)
                ) {
                    const barElement =
                        hubElement ||
                        socElement;

                    const positionX =
                        barElement.getProps(
                            ["x"],
                            true,
                        ).x;

                    drawDamageChartText(
                        context,
                        damageChartQuantityFormatter
                            .format(total),
                        positionX,
                        yScale.getPixelForValue(
                            total,
                        ) - 11,
                    );
                }
            },
        );

        context.restore();
    },
};

const damageCompositionCenterPlugin = {
    id: "damageCompositionCenter",

    afterDatasetsDraw(chart) {
        const total =
            Number(
                chart.$damageCompositionTotal,
            ) || 0;

        const chartArea =
            chart.chartArea;

        if (!chartArea) {
            return;
        }

        const context = chart.ctx;
        const positionX =
            (
                chartArea.left +
                chartArea.right
            ) / 2;
        const positionY =
            (
                chartArea.top +
                chartArea.bottom
            ) / 2;

        context.save();
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillStyle = "#e4e6eb";
        context.font =
            '700 24px "Open Sans", sans-serif';
        context.fillText(
            total > 0
                ? damageChartQuantityFormatter
                    .format(total)
                : "—",
            positionX,
            positionY - 8,
        );

        context.fillStyle = "#bfc2c8";
        context.font =
            '500 12px "Open Sans", sans-serif';
        context.fillText(
            "classificadas",
            positionX,
            positionY + 15,
        );
        context.restore();
    },
};

function createDamageCompositionChart(
    canvas,
) {
    return new window.Chart(
        canvas,
        {
            type: "doughnut",

            data: {
                labels: [
                    "Avaria Sólida",
                    "Avaria Líquida",
                    "Avaria de Vidro",
                ],

                datasets: [
                    {
                        data: [0, 0, 0],

                        backgroundColor: [
                            DAMAGE_SOLID_COLOR,
                            DAMAGE_LIQUID_COLOR,
                            DAMAGE_GLASS_COLOR,
                        ],

                        borderColor:
                            "transparent",

                        borderWidth: 0,
                        hoverOffset: 5,
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

                cutout: "64%",

                layout: {
                    padding: 12,
                },

                animation: {
                    duration: 350,
                },

                plugins: {
                    legend: {
                        display: false,
                    },

                    tooltip: {
                        callbacks: {
                            label(context) {
                                const value =
                                    Number(
                                        context.raw,
                                    ) || 0;

                                const total =
                                    context.dataset
                                        .data
                                        .reduce(
                                            function (
                                                sum,
                                                item,
                                            ) {
                                                return sum +
                                                    (
                                                        Number(
                                                            item,
                                                        ) || 0
                                                    );
                                            },
                                            0,
                                        );

                                const percentage =
                                    total > 0
                                        ? value /
                                            total *
                                            100
                                        : 0;

                                return (
                                    `${context.label}: ` +
                                    `${damageChartQuantityFormatter.format(value)} ` +
                                    `(${percentage.toLocaleString("pt-BR", {
                                        minimumFractionDigits: 1,
                                        maximumFractionDigits: 1,
                                    })}%)`
                                );
                            },
                        },
                    },
                },
            },

            plugins: [
                damageCompositionCenterPlugin,
            ],
        },
    );
}

function createDamageLastSevenDaysChart(
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
                        label:
                            "Avarias do Soc",
                        data: [],
                        backgroundColor:
                            DAMAGE_SOC_COLOR,
                        borderWidth: 0,
                        borderSkipped: false,
                        stack: "damage",
                    },
                    {
                        label:
                            "Avarias do Hub",
                        data: [],
                        backgroundColor:
                            DAMAGE_HUB_COLOR,
                        borderWidth: 0,
                        borderSkipped: false,
                        stack: "damage",
                    },
                ],
            },

            options: {
                responsive: true,
                maintainAspectRatio: false,

                animation: {
                    duration: 350,
                },

                layout: {
                    padding: {
                        top: 24,
                        right: 105,
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
                        callbacks: {
                            footer(items) {
                                const index =
                                    items[0]
                                        ?.dataIndex;

                                const day =
                                    damageLastSevenDaysChart
                                        ?.$damageChartDays
                                        ?.[index];

                                return day
                                    ? `Total: ${damageChartQuantityFormatter.format(day.soc + day.hub)}`
                                    : "";
                            },
                        },
                    },
                },

                scales: {
                    x: {
                        stacked: true,

                        ticks: {
                            color: "#bfc2c8",
                            font: {
                                size: 14,
                            },
                        },

                        grid: {
                            color:
                                "rgba(82, 82, 82, 0.35)",
                        },

                        border: {
                            color: "#525252",
                        },
                    },

                    y: {
                        stacked: true,
                        beginAtZero: true,

                        ticks: {
                            color: "#bfc2c8",
                            precision: 0,
                            font: {
                                size: 14,
                            },
                        },

                        grid: {
                            color:
                                "rgba(82, 82, 82, 0.35)",
                        },

                        border: {
                            color: "#525252",
                        },
                    },
                },
            },

            plugins: [
                damageChartAveragePlugin,
                damageChartLabelsPlugin,
            ],
        },
    );
}

function renderDamageAndLossesCharts(
    state = getDamageAndLossesState(),
) {
    if (
        !damageLastSevenDaysChart ||
        !damageCompositionChart
    ) {
        return false;
    }

    const summary =
        getDamageAndLossesSummary(
            state,
        );

    const maximumTotal =
        Math.max(
            ...summary.chartDays.map(
                function (day) {
                    return day.soc +
                        day.hub;
                },
            ),
            0,
        );

    damageLastSevenDaysChart
        .$damageChartDays =
            summary.chartDays;

    damageLastSevenDaysChart
        .$damageDailyAverage =
            summary.dailyAverage;

    damageLastSevenDaysChart
        .data.labels =
            summary.chartDays.map(
                function (day) {
                    return formatDamageChartDate(
                        day.date,
                    );
                },
            );

    damageLastSevenDaysChart
        .data.datasets[0]
        .data =
            summary.chartDays.map(
                function (day) {
                    return day.soc;
                },
            );

    damageLastSevenDaysChart
        .data.datasets[1]
        .data =
            summary.chartDays.map(
                function (day) {
                    return day.hub;
                },
            );

    damageLastSevenDaysChart
        .options.scales.y
        .suggestedMax =
            maximumTotal > 0
                ? Math.ceil(
                    maximumTotal * 1.2,
                )
                : 5;

    damageLastSevenDaysChart.update();

    damageCompositionChart
        .$damageCompositionTotal =
            summary.compositionTotal;

    damageCompositionChart
        .data.datasets[0]
        .data = [
            summary.solid,
            summary.liquid,
            summary.glass,
        ];

    damageCompositionChart.update();

    return true;
}

function observeDamageChartVisibility(
    rootElement,
) {
    const observer =
        new MutationObserver(
            function () {
                if (
                    !rootElement
                        .classList
                        .contains(
                            "is-active",
                        )
                ) {
                    return;
                }

                window.requestAnimationFrame(
                    function () {
                        damageLastSevenDaysChart
                            ?.resize();

                        damageLastSevenDaysChart
                            ?.update("none");

                        damageCompositionChart
                            ?.resize();

                        damageCompositionChart
                            ?.update("none");
                    },
                );
            },
        );

    observer.observe(
        rootElement,
        {
            attributes: true,
            attributeFilter: [
                "class",
            ],
        },
    );
}

function initializeDamageAndLossesCharts(
    rootElement =
        document.getElementById(
            "damage-and-losses",
        ),
) {
    const panel =
        rootElement instanceof HTMLElement
            ? rootElement
            : null;

    const lastSevenDaysCanvas =
        panel?.querySelector(
            "#damageLastSevenDaysChart",
        );

    const compositionCanvas =
        panel?.querySelector(
            "#damageCompositionChart",
        );

    if (
        !(panel instanceof HTMLElement) ||
        !(lastSevenDaysCanvas instanceof HTMLCanvasElement) ||
        !(compositionCanvas instanceof HTMLCanvasElement) ||
        typeof window.Chart !== "function"
    ) {
        return false;
    }

    if (
        lastSevenDaysCanvas.dataset
            .damageChartInitialized ===
        "true"
    ) {
        return true;
    }

    lastSevenDaysCanvas.dataset
        .damageChartInitialized =
            "true";

    compositionCanvas.dataset
        .damageChartInitialized =
            "true";

    damageLastSevenDaysChart =
        createDamageLastSevenDaysChart(
            lastSevenDaysCanvas,
        );

    damageCompositionChart =
        createDamageCompositionChart(
            compositionCanvas,
        );

    subscribeDamageAndLossesState(
        renderDamageAndLossesCharts,
    );

    renderDamageAndLossesCharts();
    observeDamageChartVisibility(
        panel,
    );

    return true;
}

export {
    initializeDamageAndLossesCharts,
    renderDamageAndLossesCharts,
};
