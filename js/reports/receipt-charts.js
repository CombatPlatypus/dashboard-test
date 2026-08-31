import {
    getReceiptState,
    getReceiptSummary,
    subscribeReceiptState,
} from "./receipt-state.js";

let receiptVolumeComparisonChart =
    null;

let receiptErrorComparisonChart =
    null;

/* FORMATADORES */

const receiptProgressQuantityFormatter =
    new Intl.NumberFormat(
        "pt-BR",
    );

const receiptProgressPercentageFormatter =
    new Intl.NumberFormat(
        "pt-BR",
        {
            style: "percent",
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
        },
    );

const receiptComparisonPercentageFormatter =
    new Intl.NumberFormat(
        "pt-BR",
        {
            style: "percent",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        },
    );

/* FORMATA UMA QUANTIDADE */

function formatReceiptProgressQuantity(
    value,
) {
    if (
        value === null ||
        value === undefined
    ) {
        return "—";
    }

    return receiptProgressQuantityFormatter
        .format(
            value,
        );
}

function formatReceiptComparisonPercentage(
    value,
) {
    if (
        value === null ||
        value === undefined
    ) {
        return "—";
    }

    return receiptComparisonPercentageFormatter
        .format(
            value,
        );
}

function getReceiptComparisonReceiverName(
    value,
) {
    const receivedValue =
        String(
            value ?? "",
        ).trim();

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

    return (
        name
            .trim()
            .split(/\s+/)[0] ||
        "—"
    );
}

/* LOCALIZA OS ELEMENTOS */

function getReceiptProgressElements() {
    return {
        received:
            document.getElementById(
                "receiptProgressReceived",
            ),

        expected:
            document.getElementById(
                "receiptProgressExpected",
            ),

        percentage:
            document.getElementById(
                "receiptProgressPercentage",
            ),

        bar:
            document.getElementById(
                "receiptProgressBar",
            ),

        fill:
            document.getElementById(
                "receiptProgressFill",
            ),
    };
}

/* VERIFICA OS ELEMENTOS */

function hasReceiptProgressElements(
    elements,
) {
    return Object.values(
        elements,
    ).every(
        function (element) {
            return element instanceof
                HTMLElement;
        },
    );
}

/* RENDERIZA O INDICADOR */

function renderReceiptProgress(
    elements,
    state,
) {
    const summary =
        getReceiptSummary();

    const expectedVolume =
        state.expectedVolume;

    const receivedVolume =
        state.operators.length > 0
            ? summary.receivedVolume
            : null;

    elements.received.textContent =
        formatReceiptProgressQuantity(
            receivedVolume,
        );

    elements.expected.textContent =
        formatReceiptProgressQuantity(
            expectedVolume,
        );

    const canCalculate =
        expectedVolume !== null &&
        expectedVolume !== undefined &&
        expectedVolume > 0 &&
        receivedVolume !== null &&
        receivedVolume !== undefined;

    if (!canCalculate) {
        elements.percentage.textContent =
            "—";

        elements.fill.style.width =
            "0%";

        elements.bar.setAttribute(
            "aria-valuenow",
            "0",
        );

        elements.bar.setAttribute(
            "aria-valuetext",
            "Aguardando os volumes esperado e recebido.",
        );

        return;
    }

    const progressRatio =
        receivedVolume /
        expectedVolume;

    const progressPercentage =
        progressRatio * 100;

    /*
     * A barra visual para em 100%,
     * mas o texto pode mostrar valores superiores.
     */

    const visiblePercentage =
        Math.min(
            Math.max(
                progressPercentage,
                0,
            ),
            100,
        );

    const formattedPercentage =
        receiptProgressPercentageFormatter
            .format(
                progressRatio,
            );

    elements.percentage.textContent =
        formattedPercentage;

    elements.fill.style.width =
        `${visiblePercentage}%`;

    elements.bar.setAttribute(
        "aria-valuenow",
        String(
            visiblePercentage,
        ),
    );

    elements.bar.setAttribute(
        "aria-valuetext",
        `${formattedPercentage} do volume esperado foi recebido.`,
    );
}

/* COMPARAÇÃO DE RECEBEDORES */

function getReceiptComparisonElements() {
    return {
        panel:
            document.getElementById(
                "receipt-charts",
            ),

        windowLabel:
            document.getElementById(
                "receiptComparisonWindow",
            ),

        topReceiver:
            document.getElementById(
                "receiptComparisonTopReceiver",
            ),

        topVolume:
            document.getElementById(
                "receiptComparisonTopVolume",
            ),

        topRateLabel:
            document.getElementById(
                "receiptComparisonTopRateLabel",
            ),

        topRate:
            document.getElementById(
                "receiptComparisonTopRate",
            ),

        topRateDetails:
            document.getElementById(
                "receiptComparisonTopRateDetails",
            ),

        errorChartTitle:
            document.getElementById(
                "receiptComparisonErrorChartTitle",
            ),

        errorChartSubtitle:
            document.getElementById(
                "receiptComparisonErrorChartSubtitle",
            ),

        volumeCanvas:
            document.getElementById(
                "receiptVolumeComparisonChart",
            ),

        errorCanvas:
            document.getElementById(
                "receiptErrorComparisonChart",
            ),
    };
}

function hasReceiptComparisonElements(
    elements,
) {
    return (
        elements.panel instanceof
            HTMLElement &&

        elements.windowLabel instanceof
            HTMLElement &&

        elements.topReceiver instanceof
            HTMLElement &&

        elements.topVolume instanceof
            HTMLElement &&

        elements.topRateLabel instanceof
            HTMLElement &&

        elements.topRate instanceof
            HTMLElement &&

        elements.topRateDetails instanceof
            HTMLElement &&

        elements.errorChartTitle instanceof
            HTMLElement &&

        elements.errorChartSubtitle instanceof
            HTMLElement &&

        elements.volumeCanvas instanceof
            HTMLCanvasElement &&

        elements.errorCanvas instanceof
            HTMLCanvasElement
    );
}

function createReceiptComparisonChart(
    canvas,
    metric,
) {
    const percentageMetric =
        metric === "error";

    return new window.Chart(
        canvas,
        {
            type: "bar",

            data: {
                labels: [],

                datasets: [
                    {
                        data: [],

                        backgroundColor:
                            metric === "volume"
                                ? "#f0ad4e"
                                : [],

                        borderWidth: 0,
                        barThickness: 22,
                        maxBarThickness: 25,

                        receiptMode:
                            "rate",

                        receiptDetails:
                            [],
                    },
                ],
            },

            options: {
                indexAxis: "y",

                responsive: true,
                maintainAspectRatio: false,

                devicePixelRatio:
                    Math.max(
                        window.devicePixelRatio ||
                            1,
                        2,
                    ),

                animation: {
                    duration: 250,
                },

                interaction: {
                    intersect: false,
                    mode: "nearest",
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
                                if (
                                    metric ===
                                    "volume"
                                ) {
                                    return (
                                        "Pacotes recebidos: " +
                                        formatReceiptProgressQuantity(
                                            context.raw,
                                        )
                                    );
                                }

                                const label =
                                    context
                                        .dataset
                                        .receiptMode ===
                                    "participation"
                                        ? "Participação nos erros: "
                                        : "Taxa de erros: ";

                                return (
                                    label +
                                    formatReceiptComparisonPercentage(
                                        context.raw,
                                    )
                                );
                            },

                            afterLabel(
                                context,
                            ) {
                                const details =
                                    context
                                        .dataset
                                        .receiptDetails[
                                            context
                                                .dataIndex
                                        ];

                                if (!details) {
                                    return "";
                                }

                                if (
                                    metric ===
                                    "volume"
                                ) {
                                    return details.labeler
                                        ? `Etiquetador: ${details.labeler}`
                                        : "Etiquetador: —";
                                }

                                if (
                                    context
                                        .dataset
                                        .receiptMode ===
                                    "participation"
                                ) {
                                    return (
                                        "Erros: " +
                                        formatReceiptProgressQuantity(
                                            details
                                                .errorQuantity,
                                        ) +
                                        " de " +
                                        formatReceiptProgressQuantity(
                                            details
                                                .totalErrors,
                                        )
                                    );
                                }

                                return (
                                    "Erros: " +
                                    formatReceiptProgressQuantity(
                                        details
                                            .errorQuantity,
                                    ) +
                                    " de " +
                                    formatReceiptProgressQuantity(
                                        details
                                            .packagesReceived,
                                    ) +
                                    " pacotes"
                                );
                            },
                        },
                    },
                },

                scales: {
                    x: {
                        beginAtZero: true,
                        grace: percentageMetric
                            ? "18%"
                            : "12%",

                        ticks: {
                            color: "#e4e6eb",

                            callback(
                                value,
                            ) {
                                return percentageMetric
                                    ? formatReceiptComparisonPercentage(
                                        value,
                                    )
                                    : formatReceiptProgressQuantity(
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

function createReceiptComparisonData(
    state,
) {
    const summary =
        getReceiptSummary(
            state,
        );

    const useParticipation =
        state
            .useTotalErrorParticipation;

    const operators =
        state.operators.map(
            function (
                operator,
            ) {
                const denominator =
                    useParticipation
                        ? summary.totalErrors
                        : operator
                            .packagesReceived;

                const canCalculate =
                    operator.errorQuantity !==
                        null &&

                    denominator !== null &&
                    denominator !==
                        undefined &&
                    denominator > 0;

                return {
                    receiver:
                        getReceiptComparisonReceiverName(
                            operator.receiver,
                        ),

                    labeler:
                        operator
                            .labeler
                            ?.trim() ||
                        "",

                    packagesReceived:
                        operator
                            .packagesReceived,

                    errorQuantity:
                        operator
                            .errorQuantity,

                    errorMetric:
                        canCalculate
                            ? (
                                operator
                                    .errorQuantity /
                                denominator
                            )
                            : null,
                };
            },
        );

    const completedErrors =
        operators.filter(
            function (
                operator,
            ) {
                return (
                    operator.errorQuantity !==
                    null
                );
            },
        ).length;

    const completeErrorData =
        operators.length > 0 &&
        completedErrors ===
            operators.length;

    const generalErrorRate =
        summary.totalErrors !==
            null &&

        summary.receivedVolume !==
            null &&

        summary.receivedVolume > 0
            ? (
                summary.totalErrors /
                summary.receivedVolume
            )
            : null;

    return {
        operators,
        summary,
        useParticipation,
        completedErrors,
        completeErrorData,
        generalErrorRate,
    };
}

function renderReceiptComparison(
    elements,
    state,
) {
    const data =
        createReceiptComparisonData(
            state,
        );

    elements.windowLabel.textContent =
        state.window.trim() ||
        "—";

    const volumeRanking =
        data.operators
            .filter(
                function (
                    operator,
                ) {
                    return (
                        operator
                            .packagesReceived !==
                        null
                    );
                },
            )
            .sort(
                function (
                    first,
                    second,
                ) {
                    return (
                        second
                            .packagesReceived -
                        first
                            .packagesReceived
                    );
                },
            );

    const topVolumeOperator =
        volumeRanking[0] ||
        null;

    elements.topReceiver.textContent =
        topVolumeOperator
            ?.receiver ||
        "—";

    elements.topVolume.textContent =
        topVolumeOperator
            ? (
                formatReceiptProgressQuantity(
                    topVolumeOperator
                        .packagesReceived,
                ) +
                " Pacotes"
            )
            : "— Pacotes";

    const errorRanking =
        data.operators
            .filter(
                function (
                    operator,
                ) {
                    return (
                        operator.errorMetric !==
                        null
                    );
                },
            )
            .sort(
                function (
                    first,
                    second,
                ) {
                    return (
                        second.errorMetric -
                        first.errorMetric
                    );
                },
            );

    const topErrorOperator =
        errorRanking[0] ||
        null;

    elements.topRateLabel.textContent =
        data.useParticipation
            ? "Maior Participação nos Erros"
            : "Maior Taxa de Erros";

    elements.topRate.textContent =
        topErrorOperator
            ? formatReceiptComparisonPercentage(
                topErrorOperator
                    .errorMetric,
            )
            : "—";

    if (!topErrorOperator) {
        elements
            .topRateDetails
            .textContent =
                "—";
    } else if (
        data.useParticipation
    ) {
        elements
            .topRateDetails
            .textContent =
                (
                    `${topErrorOperator.receiver}: ` +
                    `${formatReceiptProgressQuantity(
                        topErrorOperator
                            .errorQuantity,
                    )} de ` +
                    `${formatReceiptProgressQuantity(
                        data.summary
                            .totalErrors,
                    )} erros`
                );
    } else {
        elements
            .topRateDetails
            .textContent =
                (
                    `${topErrorOperator.receiver}: ` +
                    `${formatReceiptProgressQuantity(
                        topErrorOperator
                            .errorQuantity,
                    )} de ` +
                    `${formatReceiptProgressQuantity(
                        topErrorOperator
                            .packagesReceived,
                    )} pacotes`
                );
    }

    elements
        .errorChartTitle
        .textContent =
            data.useParticipation
                ? "Participação nos Erros por Recebedor"
                : "Taxa de Erros por Recebedor";

    const coverageText =
        data.operators.length > 0
            ? (
                `${data.completedErrors} de ` +
                `${data.operators.length} preenchidos`
            )
            : "Aguardando importação";

    elements
        .errorChartSubtitle
        .textContent =
            data.useParticipation
                ? (
                    "Erros do recebedor ÷ total de erros • " +
                    coverageText
                )
                : (
                    "Erros de etiqueta ÷ pacotes recebidos • " +
                    coverageText
                );

    const volumeDataset =
        receiptVolumeComparisonChart
            .data
            .datasets[0];

    receiptVolumeComparisonChart
        .data
        .labels =
            volumeRanking.map(
                function (
                    operator,
                ) {
                    return operator.receiver;
                },
            );

    volumeDataset.data =
        volumeRanking.map(
            function (
                operator,
            ) {
                return (
                    operator
                        .packagesReceived
                );
            },
        );

    volumeDataset.receiptDetails =
        volumeRanking;

    receiptVolumeComparisonChart
        .update();

    const errorDataset =
        receiptErrorComparisonChart
            .data
            .datasets[0];

    receiptErrorComparisonChart
        .data
        .labels =
            errorRanking.map(
                function (
                    operator,
                ) {
                    return operator.receiver;
                },
            );

    errorDataset.data =
        errorRanking.map(
            function (
                operator,
            ) {
                return operator.errorMetric;
            },
        );

    errorDataset.receiptMode =
        data.useParticipation
            ? "participation"
            : "rate";

    errorDataset.receiptDetails =
        errorRanking.map(
            function (
                operator,
            ) {
                return {
                    ...operator,

                    totalErrors:
                        data.summary
                            .totalErrors,
                };
            },
        );

    errorDataset.backgroundColor =
        errorRanking.map(
            function (
                operator,
            ) {
                if (
                    data.useParticipation ||
                    !data.completeErrorData
                ) {
                    return "#f0ad4e";
                }

                return (
                    data.generalErrorRate !==
                        null &&

                    operator.errorMetric >
                        data.generalErrorRate
                )
                    ? "#d9534f"
                    : "#8b8d91";
            },
        );

    receiptErrorComparisonChart
        .update();
}

function observeReceiptComparisonVisibility(
    elements,
) {
    const receiptPanel =
        document.getElementById(
            "receipt",
        );

    const observer =
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

                window.requestAnimationFrame(
                    function () {
                        receiptVolumeComparisonChart
                            ?.resize();

                        receiptErrorComparisonChart
                            ?.resize();
                    },
                );
            },
        );

    [
        receiptPanel,
        elements.panel,
    ].forEach(
        function (
            element,
        ) {
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

function initializeReceiptComparisonCharts() {
    const elements =
        getReceiptComparisonElements();

    if (
        !hasReceiptComparisonElements(
            elements,
        ) ||

        typeof window.Chart !==
            "function"
    ) {
        return false;
    }

    if (
        elements
            .panel
            .dataset
            .receiptComparisonInitialized ===
        "true"
    ) {
        return true;
    }

    elements
        .panel
        .dataset
        .receiptComparisonInitialized =
            "true";

    receiptVolumeComparisonChart =
        createReceiptComparisonChart(
            elements.volumeCanvas,
            "volume",
        );

    receiptErrorComparisonChart =
        createReceiptComparisonChart(
            elements.errorCanvas,
            "error",
        );

    subscribeReceiptState(
        function (
            state,
        ) {
            renderReceiptComparison(
                elements,
                state,
            );
        },
    );

    renderReceiptComparison(
        elements,
        getReceiptState(),
    );

    observeReceiptComparisonVisibility(
        elements,
    );

    return true;
}

/* INICIALIZAÇÃO */

function initializeReceiptCharts() {
    const comparisonInitialized =
        initializeReceiptComparisonCharts();

    const elements =
        getReceiptProgressElements();

    if (
        !hasReceiptProgressElements(
            elements,
        )
    ) {
        return comparisonInitialized;
    }

    if (
        elements
            .bar
            .dataset
            .receiptProgressInitialized ===
        "true"
    ) {
        return true;
    }

    elements
        .bar
        .dataset
        .receiptProgressInitialized =
            "true";

    subscribeReceiptState(
        function (
            state,
        ) {
            renderReceiptProgress(
                elements,
                state,
            );
        },
    );

    renderReceiptProgress(
        elements,
        getReceiptState(),
    );

    return true;
}

export {
    initializeReceiptCharts,
};
