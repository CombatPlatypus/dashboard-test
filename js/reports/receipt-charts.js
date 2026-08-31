import {
    getReceiptState,
    getReceiptSummary,
    subscribeReceiptState,
} from "./receipt-state.js";

/* INSTÂNCIA DO GRÁFICO */

let receiptSummaryChart =
    null;

/* FORMATAÇÃO */

const receiptChartNumberFormatter =
    new Intl.NumberFormat(
        "pt-BR",
    );

function formatReceiptChartQuantity(
    value,
) {
    const numericValue =
        Number(value);

    if (
        !Number.isFinite(
            numericValue,
        )
    ) {
        return "—";
    }

    return receiptChartNumberFormatter
        .format(
            numericValue,
        );
}

/* MOSTRA OS VALORES ACIMA DAS BARRAS */

const receiptBarLabelsPlugin = {
    id: "receiptBarLabels",

    afterDatasetsDraw(chart) {
        const dataset =
            chart.data.datasets[0];

        const metadata =
            chart.getDatasetMeta(0);

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

        metadata.data.forEach(
            function (
                bar,
                index,
            ) {
                const value =
                    dataset.data[index];

                if (
                    value === null ||
                    value === undefined ||
                    !Number.isFinite(
                        Number(value),
                    )
                ) {
                    return;
                }

                const position =
                    bar.tooltipPosition();

                const text =
                    formatReceiptChartQuantity(
                        value,
                    );

                context.strokeStyle =
                    "#18191a";

                context.fillStyle =
                    "#e4e6eb";

                context.strokeText(
                    text,
                    position.x,
                    position.y - 7,
                );

                context.fillText(
                    text,
                    position.x,
                    position.y - 7,
                );
            },
        );

        context.restore();
    },
};

/* DADOS DO GRÁFICO */

function getReceiptChartValues(
    state,
) {
    const summary =
        getReceiptSummary();

    const hasOperators =
        state.operators.length > 0;

    return [
        state.expectedVolume,

        hasOperators
            ? summary.receivedVolume
            : null,

        hasOperators
            ? summary.totalErrors
            : null,
    ];
}

/* CRIA O GRÁFICO */

function createReceiptSummaryChart(
    canvas,
    state,
) {
    const context =
        canvas.getContext(
            "2d",
        );

    if (!context) {
        return null;
    }

    /*
     * Mantém o canvas com resolução superior,
     * melhorando a exportação pelo html2canvas.
     */

    const pixelRatio =
        Math.min(
            Math.max(
                window.devicePixelRatio ||
                    1,
                2,
            ),
            3,
        );

    return new window.Chart(
        context,
        {
            type: "bar",

            data: {
                labels: [
                    "Esperado",
                    "Recebido",
                    "Erros",
                ],

                datasets: [
                    {
                        data:
                            getReceiptChartValues(
                                state,
                            ),

                        backgroundColor: [
                            "#9a9da1",
                            "#f5b042",
                            "#d9534f",
                        ],

                        borderColor: [
                            "#b7b9bd",
                            "#ffc15c",
                            "#ef6965",
                        ],

                        borderWidth: 1,
                        borderRadius: 4,
                        borderSkipped: false,
                        barPercentage: 0.72,
                        categoryPercentage: 0.8,
                        maxBarThickness: 52,
                    },
                ],
            },

            options: {
                responsive: true,

                maintainAspectRatio:
                    false,

                animation: false,

                devicePixelRatio:
                    pixelRatio,

                layout: {
                    padding: {
                        top: 24,
                        right: 8,
                        bottom: 0,
                        left: 4,
                    },
                },

                plugins: {
                    legend: {
                        display: false,
                    },

                    title: {
                        display: true,

                        text:
                            "Resumo do Recebimento",

                        color:
                            "#e4e6eb",

                        font: {
                            family:
                                "Open Sans",

                            size: 13,

                            weight:
                                "600",
                        },

                        padding: {
                            bottom: 18,
                        },
                    },

                    tooltip: {
                        displayColors:
                            false,

                        callbacks: {
                            label(context) {
                                return (
                                    `${context.label}: ` +
                                    formatReceiptChartQuantity(
                                        context.raw,
                                    )
                                );
                            },
                        },
                    },
                },

                scales: {
                    x: {
                        grid: {
                            display:
                                false,
                        },

                        border: {
                            color:
                                "#525252",
                        },

                        ticks: {
                            color:
                                "#e4e6eb",

                            font: {
                                family:
                                    "Open Sans",

                                size: 11,
                            },
                        },
                    },

                    y: {
                        beginAtZero: true,

                        /*
                         * Reserva espaço para os números
                         * mostrados acima das barras.
                         */

                        grace: "15%",

                        grid: {
                            color:
                                "#343536",
                        },

                        border: {
                            color:
                                "#525252",
                        },

                        ticks: {
                            color:
                                "#c8c9cc",

                            precision: 0,

                            font: {
                                family:
                                    "Open Sans",

                                size: 10,
                            },

                            callback(value) {
                                return formatReceiptChartQuantity(
                                    value,
                                );
                            },
                        },
                    },
                },
            },

            plugins: [
                receiptBarLabelsPlugin,
            ],
        },
    );
}

/* ATUALIZA O GRÁFICO */

function updateReceiptSummaryChart(
    state,
) {
    if (!receiptSummaryChart) {
        return;
    }

    receiptSummaryChart
        .data
        .datasets[0]
        .data =
            getReceiptChartValues(
                state,
            );

    receiptSummaryChart.update(
        "none",
    );
}

/* CORRIGE O TAMANHO AO ABRIR A ABA */

function bindReceiptChartResize() {
    const receiptTabLink =
        document.querySelector(
            '#report-choice a[href="#receipt"]',
        );

    if (!receiptTabLink) {
        return;
    }

    receiptTabLink.addEventListener(
        "click",
        function () {
            /*
             * Aguarda o Foundation deixar
             * o painel visível.
             */

            window.requestAnimationFrame(
                function () {
                    window.requestAnimationFrame(
                        function () {
                            receiptSummaryChart
                                ?.resize();
                        },
                    );
                },
            );
        },
    );
}

/* INICIALIZAÇÃO */

function initializeReceiptCharts() {
    const canvas =
        document.getElementById(
            "receiptSummaryChart",
        );

    if (
        !(
            canvas instanceof
            HTMLCanvasElement
        )
    ) {
        return false;
    }

    if (
        canvas.dataset
            .receiptChartInitialized ===
        "true"
    ) {
        return true;
    }

    if (
        typeof window.Chart !==
        "function"
    ) {
        console.error(
            "A biblioteca Chart.js não foi carregada.",
        );

        return false;
    }

    canvas.dataset
        .receiptChartInitialized =
            "true";

    receiptSummaryChart =
        createReceiptSummaryChart(
            canvas,
            getReceiptState(),
        );

    if (!receiptSummaryChart) {
        return false;
    }

    subscribeReceiptState(
        function (state) {
            updateReceiptSummaryChart(
                state,
            );
        },
    );

    bindReceiptChartResize();

    return true;
}

export {
    initializeReceiptCharts,
};