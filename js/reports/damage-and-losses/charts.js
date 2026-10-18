import { CHART_TEXT_COLOR } from "../../charts/theme.js";

import {
    DAMAGE_AND_LOSSES_RED,
    DAMAGE_AND_LOSSES_YELLOW,
    getDamageAndLossesPixelRatio,
} from "./chart-style.js";

import {
    getDamageAndLossesState,
    getDamageAndLossesSummary,
    subscribeDamageAndLossesState,
} from "./state.js";

import {
    DOUGHNUT_3D_PADDING,
    drawDoughnut3D,
    drawDoughnut3DCenterText,
} from "../core/doughnut-3d.js";

import {
    STACKED_BAR_3D_DEPTH,
    createStackedBars3DPlugin,
} from "../core/stacked-bars-3d.js";

import {
    HORIZONTAL_BAR_3D_DEPTH,
    createHorizontalBars3DPlugin,
    horizontalBarGridColor,
    getHorizontalBarLabelPosition,
} from "../core/horizontal-bars-3d.js";

const DAMAGE_SOC_COLOR =
    DAMAGE_AND_LOSSES_YELLOW;

const DAMAGE_HUB_COLOR =
    DAMAGE_AND_LOSSES_RED;

const DAMAGE_SOLID_COLOR =
    DAMAGE_AND_LOSSES_RED;

const DAMAGE_LIQUID_COLOR =
    DAMAGE_AND_LOSSES_YELLOW;

const DAMAGE_GLASS_COLOR =
    "#3F51B5";

const damageChartQuantityFormatter =
    new Intl.NumberFormat(
        "pt-BR",
        {
            maximumFractionDigits: 0,
        },
    );

const damageCompositionPercentageFormatter =
    new Intl.NumberFormat(
        "pt-BR",
        {
            style: "percent",
            maximumFractionDigits: 0,
        },
    );

let damageLastSevenDaysChart = null;
let damageCompositionChart = null;
let damageSocChart = null;
let damageChartPeriodTitle = null;
let damageChartPeriodSelector = null;
let activeDamageChartPeriod =
    "last7";

function formatDamageSocName(
    value,
) {
    return String(value ?? "")
        .trim()
        .replace(
            /^soc[\s_]+sp[\s_]+/i,
            "",
        )
        .replace(/_+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

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
        color = CHART_TEXT_COLOR,
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

        const labelPositionX =
            chartArea.right + 52;

        drawDamageChartText(
            context,
            "Média Diária",
            labelPositionX,
            positionY - 9,
            {
                align: "center",
                font:
                    '500 13px "Open Sans", sans-serif',
            },
        );

        drawDamageChartText(
            context,
            damageChartQuantityFormatter.format(average),
            labelPositionX,
            positionY + 10,
            {
                align: "center",
                font:
                    '600 14px "Open Sans", sans-serif',
            },
        );

        context.restore();
    },
};

const damagePeriodBars3DPlugin =
    createStackedBars3DPlugin({
        id: "damagePeriodBars3D",
    });

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
                        positionX +
                            STACKED_BAR_3D_DEPTH.x /
                            2,
                        yScale.getPixelForValue(
                            total,
                        ) -
                            STACKED_BAR_3D_DEPTH.y -
                            11,
                    );
                }
            },
        );

        context.restore();
    },
};

const damageCompositionProjection = {
    id: "damage-composition-3d",

    beforeDatasetDraw(chart, args) {
        if (args.index !== 0) {
            return;
        }

        const dataset = chart.data.datasets[0];
        chart.$damageCompositionGeometry = drawDoughnut3D({
            context: chart.ctx,
            area: chart.chartArea,
            values: dataset.data,
            colors: dataset.backgroundColor,
        });

        return false;
    },
};

const damageCompositionCenterPlugin = {
    id: "damageCompositionCenter",

    afterDraw(
        chart,
        args,
        options,
    ) {
        const geometry =
            chart.$damageCompositionGeometry;

        drawDoughnut3DCenterText(chart, geometry, {
            text: options.text || "—",
            label: options.label || "Classificadas",
        });
    },
};

const damageSocBars3DPlugin =
    createHorizontalBars3DPlugin({
        id: "damageSocBars3D",
    });

const damageSocLabelsPlugin = {
    id: "damageSocLabels",

    afterDatasetsDraw(chart) {
        const values =
            chart.data.datasets[0]
                ?.data || [];

        const bars =
            chart.getDatasetMeta(0)
                .data;

        const chartArea =
            chart.chartArea;

        if (!chartArea) {
            return;
        }

        const context = chart.ctx;

        context.save();

        bars.forEach(
            function (bar, index) {
                const value =
                    Number(values[index]) ||
                    0;

                if (value <= 0) {
                    return;
                }

                const position =
                    getHorizontalBarLabelPosition(bar);

                drawDamageChartText(
                    context,
                    damageChartQuantityFormatter
                        .format(value),
                    position.x,
                    position.y,
                    {
                        align: "left",
                    },
                );
            },
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
                    },
                ],
            },

            options: {
                responsive: true,
                maintainAspectRatio: false,

                devicePixelRatio:
                    getDamageAndLossesPixelRatio(),

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

                    damageCompositionCenter: {
                        text: "—",
                        label: "Classificadas",
                    },
                },
            },

            plugins: [
                damageCompositionProjection,
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
                devicePixelRatio:
                    getDamageAndLossesPixelRatio(),

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
                        enabled: false,

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
                            color: CHART_TEXT_COLOR,
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
                            color: CHART_TEXT_COLOR,
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
                damagePeriodBars3DPlugin,
                damageChartAveragePlugin,
                damageChartLabelsPlugin,
            ],
        },
    );
}

function createDamageSocChart(
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
                        data: [],
                        backgroundColor: [],
                        borderWidth: 0,
                        borderSkipped: false,
                        inflateAmount: 0,
                        barThickness: 24,
                    },
                ],
            },

            options: {
                indexAxis: "y",
                responsive: true,
                maintainAspectRatio: false,
                devicePixelRatio:
                    getDamageAndLossesPixelRatio(),

                animation: {
                    duration: 350,
                },

                layout: {
                    padding: {
                        top: HORIZONTAL_BAR_3D_DEPTH.y,
                        bottom: HORIZONTAL_BAR_3D_DEPTH.y,
                        right: 64,
                    },
                },

                plugins: {
                    legend: {
                        display: false,
                    },

                    tooltip: {
                        enabled: false,

                        callbacks: {
                            label(context) {
                                return `Avarias: ${damageChartQuantityFormatter.format(context.raw)}`;
                            },
                        },
                    },
                },

                scales: {
                    x: {
                        beginAtZero: true,

                        ticks: {
                            color: CHART_TEXT_COLOR,
                            precision: 0,
                            padding: 10,
                            font: {
                                size: 14,
                            },
                        },

                        grid: {
                            color: horizontalBarGridColor,
                        },

                        border: {
                            color: "#525252",
                        },
                    },

                    y: {
                        ticks: {
                            color: CHART_TEXT_COLOR,
                            padding: 22,
                            font: {
                                size: 14,
                            },
                        },

                        grid: {
                            display: false,
                        },

                        border: {
                            display: false,
                        },
                    },
                },
            },

            plugins: [
                damageSocBars3DPlugin,
                damageSocLabelsPlugin,
            ],
        },
    );
}

function getActiveDamageChartPeriod(
    summary,
) {
    const periods =
        Array.isArray(
            summary.chartPeriods,
        )
            ? summary.chartPeriods
            : [];

    const preferredPeriod =
        periods.find(
            function (period) {
                return period.id ===
                    activeDamageChartPeriod;
            },
        );

    const selectedPeriod =
        (
            preferredPeriod
                ?.days.length > 0
                ? preferredPeriod
                : periods.find(
                    function (period) {
                        return period.days.length >
                            0;
                    },
                )
        ) || preferredPeriod || {
            id: "last7",
            title: "Últimos 7 dias",
            days: [],
            hub: 0,
            soc: 0,
            solid: 0,
            liquid: 0,
            glass: 0,
            total: 0,
            compositionTotal: 0,
            socStations: [],
            dailyAverage: 0,
        };

    activeDamageChartPeriod =
        selectedPeriod.id;

    return selectedPeriod;
}

function renderDamageChartPeriodSelector(
    summary,
    selectedPeriod,
) {
    if (
        !damageChartPeriodSelector ||
        !damageChartPeriodTitle
    ) {
        return;
    }

    damageChartPeriodTitle.textContent =
        selectedPeriod.title;

    damageChartPeriodSelector
        .querySelectorAll(
            "[data-damage-chart-period]",
        )
        .forEach(
            function (button) {
                const period =
                    summary.chartPeriods
                        ?.find(
                            function (
                                receivedPeriod,
                            ) {
                                return receivedPeriod.id ===
                                    button.dataset
                                        .damageChartPeriod;
                            },
                        );

                const isSelected =
                    button.dataset
                        .damageChartPeriod ===
                    selectedPeriod.id;

                button.classList.toggle(
                    "is-active",
                    isSelected,
                );

                button.setAttribute(
                    "aria-selected",
                    String(isSelected),
                );

                button.disabled =
                    !period ||
                    period.days.length === 0;
            },
        );
}

function renderDamageCompositionValues(
    selectedPeriod,
) {
    const hasComposition =
        selectedPeriod
            .compositionTotal > 0;

    [
        [
            "damageSolidValue",
            selectedPeriod.solid,
        ],
        [
            "damageLiquidValue",
            selectedPeriod.liquid,
        ],
        [
            "damageGlassValue",
            selectedPeriod.glass,
        ],
    ].forEach(
        function ([elementId, value]) {
            const element =
                document.getElementById(
                    elementId,
                );

            if (element) {
                element.textContent =
                    hasComposition
                        ? `${damageChartQuantityFormatter.format(value)} ` +
                            `(${damageCompositionPercentageFormatter.format(
                                value / selectedPeriod.compositionTotal,
                            )})`
                        : "—";
            }
        },
    );
}

function renderDamageAndLossesCharts(
    state = getDamageAndLossesState(),
) {
    if (
        !damageLastSevenDaysChart ||
        !damageCompositionChart ||
        !damageSocChart
    ) {
        return false;
    }

    const summary =
        getDamageAndLossesSummary(
            state,
        );

    const selectedPeriod =
        getActiveDamageChartPeriod(
            summary,
        );

    const chartDays =
        selectedPeriod.days;

    renderDamageChartPeriodSelector(
        summary,
        selectedPeriod,
    );

    const maximumTotal =
        Math.max(
            ...chartDays.map(
                function (day) {
                    return day.soc +
                        day.hub;
                },
            ),
            0,
        );

    damageLastSevenDaysChart
        .$damageChartDays =
            chartDays;

    damageLastSevenDaysChart
        .$damageDailyAverage =
            selectedPeriod
                .dailyAverage;

    damageLastSevenDaysChart
        .data.labels =
            chartDays.map(
                function (day) {
                    return formatDamageChartDate(
                        day.date,
                    );
                },
            );

    damageLastSevenDaysChart
        .data.datasets[0]
        .data =
            chartDays.map(
                function (day) {
                    return day.soc;
                },
            );

    damageLastSevenDaysChart
        .data.datasets[1]
        .data =
            chartDays.map(
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

    damageLastSevenDaysChart.canvas
        .setAttribute(
            "aria-label",
            `Avarias do Soc e do Hub: ${selectedPeriod.title}`,
        );

    damageLastSevenDaysChart.update();

    damageCompositionChart
        .options.plugins
        .damageCompositionCenter
        .text =
            selectedPeriod
                .compositionTotal > 0
                ? damageChartQuantityFormatter
                    .format(
                        selectedPeriod
                            .compositionTotal,
                    )
                : "—";

    damageCompositionChart
        .data.datasets[0]
        .data = [
            selectedPeriod.solid,
            selectedPeriod.liquid,
            selectedPeriod.glass,
        ];

    damageCompositionChart.canvas
        .setAttribute(
            "aria-label",
            `Composição das avarias: ${selectedPeriod.title}`,
        );

    damageCompositionChart.update();

    renderDamageCompositionValues(
        selectedPeriod,
    );

    const socStations =
        selectedPeriod.socStations;

    const maximumSocCount =
        Math.max(
            ...socStations.map(
                function (station) {
                    return station.count;
                },
            ),
            0,
        );

    const socChartContainer =
        damageSocChart.canvas
            .parentElement;

    if (socChartContainer) {
        socChartContainer.style.height =
            `${Math.max(270, socStations.length * 52 + 45)}px`;
    }

    damageSocChart.data.labels =
        socStations.map(
            function (station) {
                return formatDamageSocName(
                    station.name,
                );
            },
        );

    damageSocChart
        .data.datasets[0]
        .data =
            socStations.map(
                function (station) {
                    return station.count;
                },
            );

    damageSocChart
        .data.datasets[0]
        .backgroundColor =
            socStations.map(
                function () {
                    return DAMAGE_SOC_COLOR;
                },
            );

    damageSocChart
        .options.scales.x
        .suggestedMax =
            maximumSocCount > 0
                ? Math.ceil(
                    maximumSocCount * 1.15,
                )
                : 5;

    damageSocChart.canvas
        .setAttribute(
            "aria-label",
            `Quantidade de avarias por Soc: ${selectedPeriod.title}`,
        );

    damageSocChart.resize();
    damageSocChart.update();

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

                        damageSocChart
                            ?.resize();

                        damageSocChart
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

    const socCanvas =
        panel?.querySelector(
            "#damageSocChart",
        );

    damageChartPeriodTitle =
        panel?.querySelector(
            "#damageChartPeriodTitle",
        );

    damageChartPeriodSelector =
        panel?.querySelector(
            "#damageChartPeriodSelector",
        );

    if (
        !(panel instanceof HTMLElement) ||
        !(lastSevenDaysCanvas instanceof HTMLCanvasElement) ||
        !(compositionCanvas instanceof HTMLCanvasElement) ||
        !(socCanvas instanceof HTMLCanvasElement) ||
        !(damageChartPeriodTitle instanceof HTMLElement) ||
        !(damageChartPeriodSelector instanceof HTMLElement) ||
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

    socCanvas.dataset
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

    damageSocChart =
        createDamageSocChart(
            socCanvas,
        );

    damageChartPeriodSelector
        .addEventListener(
            "click",
            function (event) {
                const button =
                    event.target.closest(
                        "[data-damage-chart-period]",
                    );

                if (
                    !(button instanceof HTMLButtonElement) ||
                    button.disabled
                ) {
                    return;
                }

                activeDamageChartPeriod =
                    button.dataset
                        .damageChartPeriod;

                renderDamageAndLossesCharts(
                    getDamageAndLossesState(),
                );
            },
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
    createDamageCompositionChart,
    formatDamageSocName,
    initializeDamageAndLossesCharts,
    renderDamageAndLossesCharts,
};
