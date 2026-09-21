import {
    getLossesState,
    getLossesSummary,
    subscribeLossesState,
} from "./losses-state.js";

const LOSSES_REVIEW_COLOR = "#ffc107";
const LOSSES_CONFIRMED_COLOR = "#F44336";
const LOSSES_RECOVERED_COLOR = "#66bb6a";
const LOSSES_NOT_RECOVERED_COLOR = "#ef5350";
const LOSSES_UNKNOWN_COLOR = "#a0a4aa";

const lossesQuantityFormatter =
    new Intl.NumberFormat("pt-BR", {
        maximumFractionDigits: 0,
    });

const lossesCurrencyFormatter =
    new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

const lossesPercentageFormatter =
    new Intl.NumberFormat("pt-BR", {
        style: "percent",
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
    });

let lossesPeriodChart = null;
let lossesPackRecoveryChart = null;
let lossesValueCompositionChart = null;
let lossesChartPeriodTitle = null;
let lossesChartPeriodSelector = null;
let activeLossesChartPeriod = "last7";

function formatLossesChartDate(dateKey) {
    const [, month, day] =
        String(dateKey ?? "").split("-");

    return month && day
        ? `${day}/${month}`
        : "—";
}

function drawLossesChartText(
    context,
    text,
    positionX,
    positionY,
    {
        color = "#e4e6eb",
        align = "center",
        font = '600 14px "Open Sans", sans-serif',
        outline = true,
    } = {},
) {
    if (
        "letterSpacing" in context
    ) {
        context.letterSpacing = "0px";
    }

    context.font = font;
    context.textAlign = align;
    context.textBaseline = "middle";
    context.fillStyle = color;

    if (outline) {
        context.lineWidth = 2;
        context.strokeStyle =
            "rgba(15, 15, 15, 0.7)";
        context.strokeText(text, positionX, positionY);
    }

    context.fillText(text, positionX, positionY);
}

const lossesAveragePlugin = {
    id: "lossesAverage",

    afterDatasetsDraw(chart) {
        const average =
            Number(chart.$lossesDailyAverage);
        const yScale = chart.scales.y;

        if (
            !Number.isFinite(average) ||
            average <= 0 ||
            !yScale
        ) {
            return;
        }

        const context = chart.ctx;
        const chartArea = chart.chartArea;
        const positionY =
            yScale.getPixelForValue(average);
        const labelPositionX =
            chartArea.right + 52;

        context.save();
        context.strokeStyle = "#e4e6eb";
        context.lineWidth = 1;
        context.setLineDash([8, 6]);
        context.beginPath();
        context.moveTo(chartArea.left, positionY);
        context.lineTo(chartArea.right, positionY);
        context.stroke();
        context.setLineDash([]);

        drawLossesChartText(
            context,
            "Média Diária",
            labelPositionX,
            positionY - 9,
            {
                align: "center",
                font: '500 13px "Open Sans", sans-serif',
            },
        );

        drawLossesChartText(
            context,
            lossesQuantityFormatter.format(average),
            labelPositionX,
            positionY + 10,
            {
                align: "center",
                font: '600 14px "Open Sans", sans-serif',
            },
        );

        context.restore();
    },
};

const lossesPeriodLabelsPlugin = {
    id: "lossesPeriodLabels",

    afterDatasetsDraw(chart) {
        const days = chart.$lossesChartDays || [];

        if (days.length === 0) {
            return;
        }

        const context = chart.ctx;
        const yScale = chart.scales.y;
        const reviewBars =
            chart.getDatasetMeta(0).data;
        const confirmedBars =
            chart.getDatasetMeta(1).data;

        context.save();

        days.forEach(
            function (day, index) {
                const values = [
                    day.underReview,
                    day.confirmedLosses,
                ];
                const bars = [
                    reviewBars[index],
                    confirmedBars[index],
                ];

                values.forEach(
                    function (value, valueIndex) {
                        const bar = bars[valueIndex];

                        if (value <= 0 || !bar) {
                            return;
                        }

                        const properties =
                            bar.getProps(
                                ["x", "y", "base"],
                                true,
                            );

                        if (
                            Math.abs(
                                properties.base - properties.y,
                            ) >= 12
                        ) {
                            drawLossesChartText(
                                context,
                                lossesQuantityFormatter.format(value),
                                properties.x,
                                (
                                    properties.base + properties.y
                                ) / 2,
                            );
                        }
                    },
                );

                const total =
                    day.underReview +
                    day.confirmedLosses;
                const topBar =
                    confirmedBars[index] ||
                    reviewBars[index];

                if (total > 0 && topBar) {
                    const positionX =
                        topBar.getProps(["x"], true).x;

                    drawLossesChartText(
                        context,
                        lossesQuantityFormatter.format(total),
                        positionX,
                        yScale.getPixelForValue(total) - 11,
                    );
                }
            },
        );

        context.restore();
    },
};

const lossesHorizontalTrackPlugin = {
    id: "lossesHorizontalTrack",

    beforeDatasetsDraw(chart) {
        const chartArea = chart.chartArea;
        const bars =
            chart.getDatasetMeta(0).data;

        if (!chartArea || bars.length === 0) {
            return;
        }

        const context = chart.ctx;
        context.save();
        context.fillStyle =
            "rgba(82, 82, 82, 0.34)";

        bars.forEach(
            function (bar) {
                const properties =
                    bar.getProps(
                        ["y", "height"],
                        true,
                    );

                context.fillRect(
                    chartArea.left,
                    properties.y - properties.height / 2,
                    chartArea.right - chartArea.left,
                    properties.height,
                );
            },
        );

        context.restore();
    },
};

const lossesHorizontalTextStylePlugin = {
    id: "lossesHorizontalTextStyle",

    beforeDraw(chart) {
        if (
            "letterSpacing" in chart.ctx
        ) {
            chart.ctx.letterSpacing =
                "0px";
        }
    },
};

const lossesRecoveryLabelsPlugin = {
    id: "lossesRecoveryLabels",

    afterDatasetsDraw(chart) {
        const values =
            chart.data.datasets[0]?.data || [];
        const bars =
            chart.getDatasetMeta(0).data;
        const chartArea = chart.chartArea;

        if (!chartArea) {
            return;
        }

        const context = chart.ctx;
        context.save();

        bars.forEach(
            function (bar, index) {
                const properties =
                    bar.getProps(["y"], true);

                drawLossesChartText(
                    context,
                    lossesQuantityFormatter.format(
                        Number(values[index]) || 0,
                    ),
                    chartArea.right + 12,
                    properties.y,
                    {
                        align: "left",
                        outline: false,
                    },
                );
            },
        );

        context.restore();
    },
};

const lossesValueLabelsPlugin = {
    id: "lossesValueLabels",

    afterDatasetsDraw(chart) {
        const values =
            chart.data.datasets[0]?.data || [];
        const bars =
            chart.getDatasetMeta(0).data;
        const chartArea = chart.chartArea;
        const total =
            values.reduce(
                function (sum, value) {
                    return sum + (Number(value) || 0);
                },
                0,
            );

        if (!chartArea) {
            return;
        }

        const context = chart.ctx;
        context.save();

        bars.forEach(
            function (bar, index) {
                const value =
                    Number(values[index]) || 0;
                const properties =
                    bar.getProps(["x", "y"], true);
                const barWidth =
                    Math.max(
                        0,
                        properties.x - chartArea.left,
                    );
                const currencyPositionX =
                    barWidth >= 115
                        ? properties.x - 10
                        : properties.x + 10;

                drawLossesChartText(
                    context,
                    lossesCurrencyFormatter.format(value),
                    currencyPositionX,
                    properties.y,
                    {
                        align:
                            barWidth >= 115
                                ? "right"
                                : "left",
                        font: '600 13px "Open Sans", sans-serif',
                    },
                );

                drawLossesChartText(
                    context,
                    total > 0
                        ? lossesPercentageFormatter.format(
                            value / total,
                        )
                        : "0,0%",
                    chartArea.right + 12,
                    properties.y,
                    {
                        align: "left",
                        outline: false,
                    },
                );
            },
        );

        context.restore();
    },
};

function createLossesPeriodChart(canvas) {
    return new window.Chart(canvas, {
        type: "bar",
        data: {
            labels: [],
            datasets: [
                {
                    label: "Pacotes Em Análise",
                    data: [],
                    backgroundColor: LOSSES_REVIEW_COLOR,
                    borderWidth: 0,
                    stack: "losses",
                },
                {
                    label: "Perdas Confirmadas",
                    data: [],
                    backgroundColor: LOSSES_CONFIRMED_COLOR,
                    borderWidth: 0,
                    stack: "losses",
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            layout: {
                padding: {
                    top: 22,
                    right: 105,
                },
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label(context) {
                            return `${context.dataset.label}: ${lossesQuantityFormatter.format(context.raw)}`;
                        },
                    },
                },
            },
            scales: {
                x: {
                    stacked: true,
                    ticks: {
                        color: "#bfc2c8",
                        font: { size: 13 },
                    },
                    grid: {
                        color: "rgba(82, 82, 82, 0.35)",
                    },
                    border: { color: "#525252" },
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    ticks: {
                        color: "#bfc2c8",
                        precision: 0,
                        font: { size: 13 },
                    },
                    grid: {
                        color: "rgba(82, 82, 82, 0.35)",
                    },
                    border: { color: "#525252" },
                },
            },
        },
        plugins: [
            lossesAveragePlugin,
            lossesPeriodLabelsPlugin,
        ],
    });
}

function createLossesPackRecoveryChart(canvas) {
    return new window.Chart(canvas, {
        type: "bar",
        data: {
            labels: ["Sim", "Não", "Não Informado"],
            datasets: [
                {
                    data: [0, 0, 0],
                    backgroundColor: [
                        LOSSES_RECOVERED_COLOR,
                        LOSSES_NOT_RECOVERED_COLOR,
                        LOSSES_UNKNOWN_COLOR,
                    ],
                    borderWidth: 0,
                    borderRadius: 3,
                    barThickness: 24,
                },
            ],
        },
        options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            layout: {
                padding: { right: 52 },
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label(context) {
                            return lossesQuantityFormatter.format(
                                context.raw,
                            );
                        },
                    },
                },
            },
            scales: {
                x: {
                    beginAtZero: true,
                    display: false,
                },
                y: {
                    ticks: {
                        color: "#e4e6eb",
                        font: { size: 14 },
                        padding: 12,
                    },
                    grid: { display: false },
                    border: { display: false },
                },
            },
        },
        plugins: [
            lossesHorizontalTextStylePlugin,
            lossesHorizontalTrackPlugin,
            lossesRecoveryLabelsPlugin,
        ],
    });
}

function createLossesValueCompositionChart(canvas) {
    return new window.Chart(canvas, {
        type: "bar",
        data: {
            labels: [
                "Perdas Confirmadas",
                "Em Análise",
            ],
            datasets: [
                {
                    data: [0, 0],
                    backgroundColor: [
                        LOSSES_CONFIRMED_COLOR,
                        LOSSES_REVIEW_COLOR,
                    ],
                    borderWidth: 0,
                    barThickness: 32,
                },
            ],
        },
        options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            layout: {
                padding: { right: 66 },
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label(context) {
                            const values =
                                context.chart.data.datasets[0].data;
                            const total = values.reduce(
                                function (sum, value) {
                                    return sum + (Number(value) || 0);
                                },
                                0,
                            );
                            const value = Number(context.raw) || 0;

                            return total > 0
                                ? `${lossesCurrencyFormatter.format(value)} (${lossesPercentageFormatter.format(value / total)})`
                                : lossesCurrencyFormatter.format(0);
                        },
                    },
                },
            },
            scales: {
                x: {
                    beginAtZero: true,
                    display: false,
                },
                y: {
                    ticks: {
                        color: "#e4e6eb",
                        font: { size: 14 },
                        padding: 12,
                    },
                    grid: { display: false },
                    border: { display: false },
                },
            },
        },
        plugins: [
            lossesHorizontalTextStylePlugin,
            lossesHorizontalTrackPlugin,
            lossesValueLabelsPlugin,
        ],
    });
}

function getActiveLossesChartPeriod(summary) {
    const periods =
        Array.isArray(summary.chartPeriods)
            ? summary.chartPeriods
            : [];
    const preferredPeriod =
        periods.find(
            function (period) {
                return period.id === activeLossesChartPeriod;
            },
        );
    const selectedPeriod =
        (
            preferredPeriod?.days.length > 0
                ? preferredPeriod
                : periods.find(
                    function (period) {
                        return period.days.length > 0;
                    },
                )
        ) || preferredPeriod || {
            id: "last7",
            title: "Últimos 7 Dias",
            days: [],
            underReview: 0,
            confirmedLosses: 0,
            recoveryYes: 0,
            recoveryNo: 0,
            recoveryUnknown: 0,
            confirmedValue: 0,
            underReviewValue: 0,
            dailyAverage: 0,
        };

    activeLossesChartPeriod =
        selectedPeriod.id;

    return selectedPeriod;
}

function renderLossesPeriodSelector(
    summary,
    selectedPeriod,
) {
    if (
        !lossesChartPeriodSelector ||
        !lossesChartPeriodTitle
    ) {
        return;
    }

    lossesChartPeriodTitle.textContent =
        selectedPeriod.title;

    lossesChartPeriodSelector
        .querySelectorAll("[data-losses-chart-period]")
        .forEach(
            function (button) {
                const period =
                    summary.chartPeriods?.find(
                        function (receivedPeriod) {
                            return receivedPeriod.id ===
                                button.dataset.lossesChartPeriod;
                        },
                    );
                const isSelected =
                    button.dataset.lossesChartPeriod ===
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
                    !period || period.days.length === 0;
            },
        );
}

function renderLossesCharts(
    state = getLossesState(),
) {
    if (
        !lossesPeriodChart ||
        !lossesPackRecoveryChart ||
        !lossesValueCompositionChart
    ) {
        return false;
    }

    const summary =
        getLossesSummary(state);
    const selectedPeriod =
        getActiveLossesChartPeriod(summary);
    const chartDays = selectedPeriod.days;

    renderLossesPeriodSelector(
        summary,
        selectedPeriod,
    );

    const maximumTotal =
        Math.max(
            ...chartDays.map(
                function (day) {
                    return day.underReview +
                        day.confirmedLosses;
                },
            ),
            0,
        );

    lossesPeriodChart.$lossesChartDays =
        chartDays;
    lossesPeriodChart.$lossesDailyAverage =
        selectedPeriod.dailyAverage;
    lossesPeriodChart.data.labels =
        chartDays.map(
            function (day) {
                return formatLossesChartDate(day.date);
            },
        );
    lossesPeriodChart.data.datasets[0].data =
        chartDays.map(
            function (day) {
                return day.underReview;
            },
        );
    lossesPeriodChart.data.datasets[1].data =
        chartDays.map(
            function (day) {
                return day.confirmedLosses;
            },
        );
    lossesPeriodChart.options.scales.y.suggestedMax =
        maximumTotal > 0
            ? Math.ceil(maximumTotal * 1.2)
            : 5;
    lossesPeriodChart.canvas.setAttribute(
        "aria-label",
        `Pacotes em análise e perdas confirmadas: ${selectedPeriod.title}`,
    );
    lossesPeriodChart.update();

    const recoveryValues = [
        selectedPeriod.recoveryYes,
        selectedPeriod.recoveryNo,
        selectedPeriod.recoveryUnknown,
    ];
    const maximumRecovery =
        Math.max(...recoveryValues, 0);

    lossesPackRecoveryChart.data.datasets[0].data =
        recoveryValues;
    lossesPackRecoveryChart.options.scales.x.suggestedMax =
        maximumRecovery > 0
            ? Math.ceil(maximumRecovery * 1.15)
            : 1;
    lossesPackRecoveryChart.canvas.setAttribute(
        "aria-label",
        `Pack Recovery: ${selectedPeriod.title}`,
    );
    lossesPackRecoveryChart.update();

    const valueComposition = [
        selectedPeriod.confirmedValue,
        selectedPeriod.underReviewValue,
    ];
    const maximumValue =
        Math.max(...valueComposition, 0);

    lossesValueCompositionChart
        .data.datasets[0].data =
            valueComposition;
    lossesValueCompositionChart
        .options.scales.x.suggestedMax =
            maximumValue > 0
                ? maximumValue * 1.15
                : 1;
    lossesValueCompositionChart.canvas.setAttribute(
        "aria-label",
        `Composição dos valores informados: ${selectedPeriod.title}`,
    );
    lossesValueCompositionChart.update();

    return true;
}

function resizeLossesCharts() {
    [
        lossesPeriodChart,
        lossesPackRecoveryChart,
        lossesValueCompositionChart,
    ].forEach(
        function (chart) {
            chart?.resize();
            chart?.update("none");
        },
    );
}

function observeLossesChartVisibility(
    rootElement,
    lossesPanel,
) {
    const observer =
        new MutationObserver(
            function () {
                if (
                    !rootElement.classList.contains("is-active") ||
                    !lossesPanel.classList.contains("is-active")
                ) {
                    return;
                }

                window.requestAnimationFrame(
                    resizeLossesCharts,
                );
            },
        );

    [rootElement, lossesPanel].forEach(
        function (element) {
            observer.observe(element, {
                attributes: true,
                attributeFilter: ["class"],
            });
        },
    );
}

function initializeLossesCharts(
    rootElement = document.getElementById(
        "damage-and-losses",
    ),
) {
    const panel =
        rootElement instanceof HTMLElement
            ? rootElement
            : null;
    const lossesPanel =
        panel?.querySelector("#losses");
    const periodCanvas =
        panel?.querySelector("#lossesLastSevenDaysChart");
    const recoveryCanvas =
        panel?.querySelector("#lossesPackRecoveryChart");
    const valueCanvas =
        panel?.querySelector("#lossesValueCompositionChart");

    lossesChartPeriodTitle =
        panel?.querySelector("#lossesChartPeriodTitle");
    lossesChartPeriodSelector =
        panel?.querySelector("#lossesChartPeriodSelector");

    if (
        !(panel instanceof HTMLElement) ||
        !(lossesPanel instanceof HTMLElement) ||
        !(periodCanvas instanceof HTMLCanvasElement) ||
        !(recoveryCanvas instanceof HTMLCanvasElement) ||
        !(valueCanvas instanceof HTMLCanvasElement) ||
        !(lossesChartPeriodTitle instanceof HTMLElement) ||
        !(lossesChartPeriodSelector instanceof HTMLElement) ||
        typeof window.Chart !== "function"
    ) {
        return false;
    }

    if (
        periodCanvas.dataset.lossesChartInitialized ===
        "true"
    ) {
        return true;
    }

    [periodCanvas, recoveryCanvas, valueCanvas]
        .forEach(
            function (canvas) {
                canvas.dataset.lossesChartInitialized =
                    "true";
            },
        );

    lossesPeriodChart =
        createLossesPeriodChart(periodCanvas);
    lossesPackRecoveryChart =
        createLossesPackRecoveryChart(recoveryCanvas);
    lossesValueCompositionChart =
        createLossesValueCompositionChart(valueCanvas);

    lossesChartPeriodSelector.addEventListener(
        "click",
        function (event) {
            const button =
                event.target.closest(
                    "[data-losses-chart-period]",
                );

            if (
                !(button instanceof HTMLButtonElement) ||
                button.disabled
            ) {
                return;
            }

            activeLossesChartPeriod =
                button.dataset.lossesChartPeriod;
            renderLossesCharts(getLossesState());
        },
    );

    subscribeLossesState(renderLossesCharts);
    renderLossesCharts();
    observeLossesChartVisibility(panel, lossesPanel);

    return true;
}

export {
    initializeLossesCharts,
    renderLossesCharts,
};
