import {
    LOSSES_RATE_MONTHS,
    getLossesRateMonthSummary,
    getLossesRateState,
    subscribeLossesRateState,
} from "./losses-rate-state.js";

/* INSTÂNCIAS DOS GRÁFICOS */

let lossesRateCompositionChart =
    null;

let lossesRateHistoryChart =
    null;

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

const lossesRateChartQuantityFormatter =
    new Intl.NumberFormat(
        "pt-BR",
        {
            maximumFractionDigits: 0,
        },
    );

/* TEXTO CENTRAL DO GRÁFICO DE ROSCA */

const lossesRateCenterTextPlugin = {
    id: "lossesRateCenterText",

    afterDraw(
        chart,
        args,
        options,
    ) {
        const chartArea =
            chart.chartArea;

        if (!chartArea) {
            return;
        }

        const centerX =
            (
                chartArea.left +
                chartArea.right
            ) / 2;

        const centerY =
            (
                chartArea.top +
                chartArea.bottom
            ) / 2;

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

/* MOSTRA OS VALORES NAS FATIAS DO GRÁFICO DE ROSCA */

const lossesRateCompositionLabelsPlugin = {
    id: "lossesRateCompositionLabels",

    afterDatasetsDraw(chart) {
        if (
            chart.config.type !==
            "doughnut"
        ) {
            return;
        }

        const dataset =
            chart.data.datasets[0];

        const metadata =
            chart.getDatasetMeta(0);

        const context =
            chart.ctx;

        context.save();

        context.font =
            '700 12px "Open Sans", sans-serif';

        context.textBaseline =
            "middle";

        context.lineWidth =
            3;

        metadata.data.forEach(
            function (
                arc,
                index,
            ) {
                if (
                    !chart.getDataVisibility(index)
                ) {
                    return;
                }

                const value =
                    Number(
                        dataset.data[index],
                    );

                if (
                    !Number.isFinite(value) ||
                    value <= 0
                ) {
                    return;
                }

                const angle =
                    (
                        arc.startAngle +
                        arc.endAngle
                    ) /
                    2;

                const smallSlice =
                    arc.circumference <
                    0.4;

                const radius =
                    smallSlice
                        ? arc.outerRadius + 16
                        : arc.innerRadius +
                          (
                              arc.outerRadius -
                              arc.innerRadius
                          ) *
                              0.55;

                const positionX =
                    arc.x +
                    Math.cos(angle) *
                        radius;

                const positionY =
                    arc.y +
                    Math.sin(angle) *
                        radius;

                const text =
                    lossesRateChartQuantityFormatter.format(
                        value,
                    );

                if (smallSlice) {
                    const edgeX =
                        arc.x +
                        Math.cos(angle) *
                            arc.outerRadius;

                    const edgeY =
                        arc.y +
                        Math.sin(angle) *
                            arc.outerRadius;

                    context.beginPath();

                    context.moveTo(
                        edgeX,
                        edgeY,
                    );

                    context.lineTo(
                        positionX,
                        positionY,
                    );

                    context.strokeStyle =
                        "#8a8d91";

                    context.lineWidth =
                        1;

                    context.stroke();

                    context.textAlign =
                        Math.cos(angle) >= 0
                            ? "left"
                            : "right";
                } else {
                    context.textAlign =
                        "center";
                }

                context.lineWidth =
                    3;

                context.strokeStyle =
                    "#18191a";

                context.fillStyle =
                    "#e4e6eb";

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
            },
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
                    "POSSÍVEIS PERDAS",
                    "LOST",
                    "AVARIA",
                ],

                datasets: [
                    {
                        data: [
                            0,
                            0,
                            0,
                        ],

                        backgroundColor: [
                            "#8b8d91",
                            "#d9534f",
                            "#f0ad4e",
                        ],

                        borderColor:
                            "#1f1f1f",

                        borderWidth: 3,
                    },
                ],
            },

            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: "68%",

                layout: {
                    padding: {
                        top: 20,
                        right: 28,
                        bottom: 10,
                        left: 28,
                    },
                },

                animation: {
                    duration: 250,
                },

                plugins: {
                    legend: {
                        position: "bottom",

                        labels: {
                            color: "#e4e6eb",
                            boxWidth: 14,
                            padding: 18,
                        },
                    },

                    tooltip: {
                        callbacks: {
                            label(
                                context,
                            ) {
                                const value =
                                    Number(
                                        context.raw,
                                    ) || 0;

                                const values =
                                    context.dataset.data;

                                const total =
                                    values.reduce(
                                        function (
                                            sum,
                                            item,
                                        ) {
                                            return (
                                                sum +
                                                (
                                                    Number(
                                                        item,
                                                    ) || 0
                                                )
                                            );
                                        },
                                        0,
                                    );

                                const proportion =
                                    total > 0
                                        ? value /
                                          total
                                        : 0;

                                return (
                                    `${context.label}: ` +
                                    `${lossesRateChartIntegerFormatter.format(value)} ` +
                                    `(${lossesRateChartPercentageFormatter.format(proportion * 100)}%)`
                                );
                            },
                        },
                    },

                    lossesRateCenterText: {
                        text: "—",
                        label: "Ocorrências",

                    },
                },
            },

            plugins: [
                lossesRateCenterTextPlugin,
                lossesRateCompositionLabelsPlugin,,
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
                lossesRateHistoryLabelsPlugin,
            ],

            options: {
                responsive: true,
                maintainAspectRatio: false,

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
                        suggestedMax: 0.05,

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
            possibleLosses,
            lost,
            damage,
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

    document.getElementById(
        "lossesRateCompositionMonth",
    ).textContent =
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

    document.getElementById(
        "lossesRateHistoryYear",
    ).textContent =
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

function observeLossesRateChartVisibility() {
    const reportsPanel =
        document.getElementById(
            "reports",
        );

    const lossesRatePanel =
        document.getElementById(
            "losses-rate",
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

function initializeLossesRateCharts() {
    const compositionCanvas =
        document.getElementById(
            "lossesRateCompositionChart",
        );

    const historyCanvas =
        document.getElementById(
            "lossesRateHistoryChart",
        );

    if (
        !(compositionCanvas instanceof HTMLCanvasElement) ||
        !(historyCanvas instanceof HTMLCanvasElement) ||
        typeof window.Chart !==
            "function"
    ) {
        return false;
    }

    if (
        lossesRateCompositionChart ||
        lossesRateHistoryChart
    ) {
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

    observeLossesRateChartVisibility();

    return true;
}

export {
    initializeLossesRateCharts,
};
