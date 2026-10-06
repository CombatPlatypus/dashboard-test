import {
    LOSSES_RATE_MONTHS,
    getLossesRateMonthSummary,
    getLossesRateState,
    subscribeLossesRateState,
} from "./state.js";

import {
    drawDoughnut3D,
} from "../core/doughnut-3d.js";

/* INSTÂNCIAS DOS GRÁFICOS */

let lossesRateCompositionChart =
    null;

let lossesRateHistoryChart =
    null;

let lossesRateCompositionMonthElement =
    null;

let lossesRateCompositionIndicators = {};

let lossesRateHistoryYearElement =
    null;

/* LIMITES DO HISTÓRICO */

const LOSSES_RATE_HISTORY_INITIAL_MAXIMUM =
    0.04;

const LOSSES_RATE_MAXIMUM_REFERENCE =
    0.03;

/* FORMATADORES */

const lossesRateChartIntegerFormatter =
    new Intl.NumberFormat(
        "pt-BR",
    );

const lossesRateChartPercentageFormatter =
    new Intl.NumberFormat(
        "pt-BR",
        {
            minimumFractionDigits: 3,
            maximumFractionDigits: 3,
        },
    );

const lossesRateCompositionPercentageFormatter =
    new Intl.NumberFormat(
        "pt-BR",
        {
            style: "percent",
            maximumFractionDigits: 0,
        },
    );

/* PROJEÇÃO 3D DA COMPOSIÇÃO */

const lossesRateCompositionProjection = {
    id: "losses-rate-composition-3d",

    beforeDatasetDraw(chart, args) {
        if (args.index !== 0) {
            return;
        }

        const dataset = chart.data.datasets[0];
        chart.$lossesRateCompositionGeometry = drawDoughnut3D({
            context: chart.ctx,
            area: chart.chartArea,
            values: dataset.data,
            colors: dataset.backgroundColor,
        });

        // Substitui somente as fatias planas deste gráfico.
        return false;
    },
};

/* TEXTO CENTRAL DO GRÁFICO DE ROSCA */

const lossesRateCenterTextPlugin = {
    id: "lossesRateCenterText",

    afterDraw(
        chart,
        args,
        options,
    ) {
        const geometry =
            chart.$lossesRateCompositionGeometry;

        if (!geometry) {
            return;
        }

        const centerX =
            geometry.centerX;

        const centerY =
            geometry.textCenterY;

        const context =
            chart.ctx;

        const fontFamily =
            window
                .getComputedStyle(
                    chart.canvas,
                )
                .fontFamily ||
            "sans-serif";

        context.save();

        context.textAlign =
            "center";

        context.textBaseline =
            "middle";

        context.fillStyle =
            "#e4e6eb";

        context.font =
            `600 22px ${fontFamily}`;

        context.fillText(
            options.text || "—",
            centerX,
            centerY - 8,
        );

        context.fillStyle =
            "#8b8d91";

        context.font =
            `12px ${fontFamily}`;

        context.fillText(
            options.label ||
                "Ocorrências",
            centerX,
            centerY + 16,
        );

        context.restore();
    },
};

/* MOSTRA O LIMITE MÁXIMO NO HISTÓRICO */

const lossesRateMaximumReferencePlugin = {
    id: "lossesRateMaximumReference",

    afterDatasetsDraw(
        chart,
    ) {
        if (
            chart.config.type !==
            "line"
        ) {
            return;
        }

        const chartArea =
            chart.chartArea;

        const yScale =
            chart.scales.y;

        if (
            !chartArea ||
            !yScale
        ) {
            return;
        }

        const positionY =
            yScale.getPixelForValue(
                LOSSES_RATE_MAXIMUM_REFERENCE,
            );

        const context =
            chart.ctx;

        const label =
            "Máximo " +
            lossesRateChartPercentageFormatter.format(
                LOSSES_RATE_MAXIMUM_REFERENCE,
            ) +
            "%";

        context.save();

        context.strokeStyle =
            "#d9534f";

        context.lineWidth =
            1.5;

        context.setLineDash([
            6,
            5,
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

        context.font =
            '600 11px "Open Sans", sans-serif';

        context.textAlign =
            "right";

        context.textBaseline =
            "bottom";

        context.lineWidth =
            3;

        context.strokeStyle =
            "#18191a";

        context.fillStyle =
            "#d9534f";

        context.strokeText(
            label,
            chartArea.right - 6,
            positionY - 6,
        );

        context.fillText(
            label,
            chartArea.right - 6,
            positionY - 6,
        );

        context.restore();
    },
};

/* MOSTRA AS TAXAS ACIMA DOS PONTOS DO GRÁFICO */

const lossesRateHistoryLabelsPlugin = {
    id: "lossesRateHistoryLabels",

    afterDatasetsDraw(chart) {
        if (
            chart.config.type !==
            "line"
        ) {
            return;
        }

        const context =
            chart.ctx;

        context.save();

        context.font =
            '600 11px "Open Sans", sans-serif';

        context.textAlign =
            "center";

        context.textBaseline =
            "bottom";

        context.lineWidth =
            3;

        chart.data.datasets.forEach(
            function (
                dataset,
                datasetIndex,
            ) {
                const metadata =
                    chart.getDatasetMeta(
                        datasetIndex,
                    );

                if (metadata.hidden) {
                    return;
                }

                metadata.data.forEach(
                    function (
                        point,
                        index,
                    ) {
                        const originalValue =
                            dataset.data[index];

                        if (
                            originalValue ===
                                null ||
                            originalValue ===
                                undefined ||
                            originalValue ===
                                ""
                        ) {
                            return;
                        }

                        const value =
                            Number(
                                originalValue,
                            );

                        if (
                            !Number.isFinite(
                                value,
                            )
                        ) {
                            return;
                        }

                        const text =
                            lossesRateChartPercentageFormatter.format(
                                value,
                            ) +
                            "%";

                        context.strokeStyle =
                            "#18191a";

                        context.fillStyle =
                            "#e4e6eb";

                        context.strokeText(
                            text,
                            point.x,
                            point.y - 10,
                        );

                        context.fillText(
                            text,
                            point.x,
                            point.y - 10,
                        );
                    },
                );
            },
        );

        context.restore();
    },
};

/* CRIA O GRÁFICO DE COMPOSIÇÃO */

function createLossesRateCompositionChart(
    canvas,
) {
    return new window.Chart(
        canvas,
        {
            type: "doughnut",

            data: {
                labels: [
                    "LOST",
                    "AVARIA",
                    "POSSÍVEIS PERDAS",
                ],

                datasets: [
                    {
                        data: [
                            0,
                            0,
                            0,
                        ],

                        backgroundColor: [
                            "#d9534f",
                            "#f0ad4e",
                            "#8b8d91",
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
                    Math.max(
                        window.devicePixelRatio || 1,
                        2,
                    ),

                cutout: "66%",
                events: [],

                layout: {
                    padding: {
                        top: 10,
                        right: 20,
                        bottom: 5,
                        left: 20,
                    },
                },

                animation: false,

                plugins: {
                    legend: {
                        display: false,
                    },

                    tooltip: {
                        enabled: false,
                    },

                    lossesRateCenterText: {
                        text: "—",
                        label: "Ocorrências",

                    },
                },
            },

            plugins: [
                lossesRateCompositionProjection,
                lossesRateCenterTextPlugin,
            ],
        },
    );
}

/* CRIA O GRÁFICO DO HISTÓRICO */

function createLossesRateHistoryChart(
    canvas,
) {
    return new window.Chart(
        canvas,
        {
            type: "line",

            data: {
                labels:
                    LOSSES_RATE_MONTHS.map(
                        function (
                            month,
                        ) {
                            return month.slice(
                                0,
                                3,
                            );
                        },
                    ),

                datasets: [
                    {
                        data:
                            new Array(
                                LOSSES_RATE_MONTHS.length,
                            ).fill(null),

                        borderColor:
                            "#e4e6eb",

                        backgroundColor:
                            "rgba(228, 230, 235, 0.08)",

                        pointBackgroundColor:
                            "#e4e6eb",

                        pointBorderColor:
                            "#e4e6eb",

                        borderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 7,
                        tension: 0.25,
                        fill: true,
                        spanGaps: false,
                    },
                ],
            },

            plugins: [
                lossesRateMaximumReferencePlugin,
                lossesRateHistoryLabelsPlugin,
            ],

            options: {
                responsive: true,
                maintainAspectRatio: false,

                devicePixelRatio:
                    Math.max(
                        window.devicePixelRatio || 1,
                        2,
                    ),

                interaction: {
                    intersect: false,
                    mode: "index",
                },

                layout: {
                    padding: {
                        top: 24,
                    },
                },

                animation: {
                    duration: 250,
                },

                plugins: {
                    legend: {
                        display: false,
                    },

                    tooltip: {
                        enabled: false,

                        callbacks: {
                            label(
                                context,
                            ) {
                                const value =
                                    context.parsed.y;

                                if (
                                    value === null
                                ) {
                                    return "Sem dados";
                                }

                                return (
                                    "Taxa: " +
                                    lossesRateChartPercentageFormatter.format(
                                        value,
                                    ) +
                                    "%"
                                );
                            },
                        },
                    },
                },

                scales: {
                    x: {
                        ticks: {
                            color: "#e4e6eb",
                        },

                        grid: {
                            color:
                                "rgba(82, 82, 82, 0.45)",
                        },
                    },

                    y: {
                        beginAtZero: true,
                        suggestedMax:
                            LOSSES_RATE_HISTORY_INITIAL_MAXIMUM,

                        ticks: {
                            color: "#e4e6eb",
                            stepSize: 0.01,
                            precision: 3,

                            callback(
                                value,
                            ) {
                                return (
                                    lossesRateChartPercentageFormatter.format(
                                        value,
                                    ) +
                                    "%"
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

/* ATUALIZA O GRÁFICO DE COMPOSIÇÃO */

function updateLossesRateCompositionChart(
    state,
) {
    const summary =
        getLossesRateMonthSummary(
            state.activeMonth,
        );

    const possibleLosses =
        summary.possibleLosses || 0;

    const lost =
        summary.lost || 0;

    const damage =
        summary.damage || 0;

    const hasCompositionData =
        summary.possibleLosses !== null ||
        summary.lost !== null ||
        summary.damage !== null;

    const compositionTotal =
        hasCompositionData
            ? possibleLosses +
            lost +
            damage
            : null;

    lossesRateCompositionChart
        .data
        .datasets[0]
        .data = [
            lost,
            damage,
            possibleLosses,
        ];

    lossesRateCompositionChart
        .options
        .plugins
        .lossesRateCenterText
        .text =
            compositionTotal === null
                ? "—"
                : lossesRateChartIntegerFormatter.format(
                    compositionTotal,
                );
    lossesRateCompositionChart.update();

    Object.entries(lossesRateCompositionIndicators).forEach(
        function ([field, element]) {
            if (!(element instanceof HTMLElement)) {
                return;
            }

            const quantity = summary[field];
            if (quantity === null || quantity === undefined) {
                element.textContent = "—";
                return;
            }

            const percentage = compositionTotal > 0
                ? quantity / compositionTotal
                : 0;
            element.textContent = `${lossesRateChartIntegerFormatter.format(quantity)} ` +
                `(${lossesRateCompositionPercentageFormatter.format(percentage)})`;
        },
    );

    lossesRateCompositionMonthElement
        .textContent =
        LOSSES_RATE_MONTHS[
            state.activeMonth
        ];
}

/* ATUALIZA O GRÁFICO DO HISTÓRICO */

function updateLossesRateHistoryChart(
    state,
) {
    const monthlyRates =
        state.months.map(
            function (
                month,
                monthIndex,
            ) {
                const summary =
                    getLossesRateMonthSummary(
                        monthIndex,
                    );

                return summary.lossRate ===
                    null
                    ? null
                    : summary.lossRate *
                      100;
            },
        );

    const dataset =
        lossesRateHistoryChart
            .data
            .datasets[0];

    dataset.data =
        monthlyRates;

    dataset.pointRadius =
        monthlyRates.map(
            function (
                value,
                monthIndex,
            ) {
                if (
                    value === null
                ) {
                    return 0;
                }

                return monthIndex ===
                    state.activeMonth
                    ? 6
                    : 4;
            },
        );

    dataset.pointBackgroundColor =
        monthlyRates.map(
            function (
                value,
                monthIndex,
            ) {
                return monthIndex ===
                    state.activeMonth
                    ? "#f0ad4e"
                    : "#e4e6eb";
            },
        );

    dataset.pointBorderColor =
        dataset.pointBackgroundColor;

    lossesRateHistoryChart.update();

    lossesRateHistoryYearElement
        .textContent =
        String(state.year);
}

/* ATUALIZA OS DOIS GRÁFICOS */

function updateLossesRateCharts(
    state,
) {
    if (
        !lossesRateCompositionChart ||
        !lossesRateHistoryChart
    ) {
        return;
    }

    updateLossesRateCompositionChart(
        state,
    );

    updateLossesRateHistoryChart(
        state,
    );
}

/* REAJUSTA OS GRÁFICOS AO EXIBIR O PAINEL */

function observeLossesRateChartVisibility(
    rootElement,
) {
    const lossesRatePanel =
        rootElement.id ===
            "losses-rate"
            ? rootElement
            : rootElement.querySelector(
                "#losses-rate",
            );

    const reportsPanel =
        lossesRatePanel?.closest(
            "#reports",
        );

    const observer =
        new MutationObserver(
            function () {
                if (
                    !lossesRatePanel.classList.contains(
                        "is-active",
                    )
                ) {
                    return;
                }

                window.requestAnimationFrame(
                    function () {
                        lossesRateCompositionChart.resize();
                        lossesRateHistoryChart.resize();
                    },
                );
            },
        );

    [
        reportsPanel,
        lossesRatePanel,
    ].forEach(
        function (element) {
            if (!element) {
                return;
            }

            observer.observe(
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

/* INICIALIZA OS GRÁFICOS */

function initializeLossesRateCharts(
    rootElement = document,
) {
    const initializationElement =
        rootElement.id ===
            "losses-rate"
            ? rootElement
            : rootElement.querySelector(
                "#losses-rate",
            );

    const compositionCanvas =
        rootElement.querySelector(
            "#lossesRateCompositionChart",
        );

    const historyCanvas =
        rootElement.querySelector(
            "#lossesRateHistoryChart",
        );

    lossesRateCompositionMonthElement =
        rootElement.querySelector(
            "#lossesRateCompositionMonth",
        );

    lossesRateHistoryYearElement =
        rootElement.querySelector(
            "#lossesRateHistoryYear",
        );

    lossesRateCompositionIndicators = {
        possibleLosses: rootElement.querySelector(
            "#lossesRateCompositionPossibleLosses",
        ),
        lost: rootElement.querySelector(
            "#lossesRateCompositionLost",
        ),
        damage: rootElement.querySelector(
            "#lossesRateCompositionDamage",
        ),
    };

    if (
        !(compositionCanvas instanceof HTMLCanvasElement) ||
        !(historyCanvas instanceof HTMLCanvasElement) ||
        !(
            initializationElement instanceof
                HTMLElement
        ) ||
        !(
            lossesRateCompositionMonthElement instanceof
                HTMLElement
        ) ||
        !(
            lossesRateHistoryYearElement instanceof
                HTMLElement
        ) ||
        typeof window.Chart !==
            "function"
    ) {
        return false;
    }

    if (
        initializationElement.dataset
            .lossesRateChartsInitialized ===
        "true"
    ) {
        return true;
    }

    if (
        lossesRateCompositionChart ||
        lossesRateHistoryChart
    ) {
        initializationElement.dataset
            .lossesRateChartsInitialized =
                "true";

        return true;
    }

    lossesRateCompositionChart =
        createLossesRateCompositionChart(
            compositionCanvas,
        );

    lossesRateHistoryChart =
        createLossesRateHistoryChart(
            historyCanvas,
        );

    initializationElement.dataset
        .lossesRateChartsInitialized =
            "true";

    subscribeLossesRateState(
        function (state) {
            updateLossesRateCharts(
                state,
            );
        },
    );

    updateLossesRateCharts(
        getLossesRateState(),
    );

    observeLossesRateChartVisibility(
        rootElement,
    );

    return true;
}

export {
    createLossesRateCompositionChart,
    createLossesRateHistoryChart,
    initializeLossesRateCharts,
};
