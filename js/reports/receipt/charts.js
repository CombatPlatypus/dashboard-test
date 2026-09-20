import {
    getReceiptState,
    getReceiptSummary,
    subscribeReceiptState,
} from "./state.js";

import {
    formatReportPersonFirstName,
} from "../core/person-name.js";

let receiptAlignedComparisonChart =
    null;

let receiptComparisonHeightObserver =
    null;

let receiptComparisonHeightFrame =
    null;

let receiptProgressElements = null;

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

const receiptDevicePixelRatio =
    typeof window === "undefined"
        ? 1
        : window.devicePixelRatio || 1;

const RECEIPT_CHART_PIXEL_RATIO =
    Math.max(
        receiptDevicePixelRatio,
        3,
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
    return formatReportPersonFirstName(
        value,
        "—",
    );
}

/* LOCALIZA OS ELEMENTOS */

function getReceiptChartElementById(
    rootElement,
    id,
) {
    return rootElement.querySelector(
        `#${id}`,
    );
}

function getReceiptProgressElements(
    rootElement,
) {
    return {
        received:
            getReceiptChartElementById(
                rootElement,
                "receiptProgressReceived",
            ),

        expected:
            getReceiptChartElementById(
                rootElement,
                "receiptProgressExpected",
            ),

        percentage:
            getReceiptChartElementById(
                rootElement,
                "receiptProgressPercentage",
            ),

        bar:
            getReceiptChartElementById(
                rootElement,
                "receiptProgressBar",
            ),

        fill:
            getReceiptChartElementById(
                rootElement,
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

function renderReceiptCharts(
    state = getReceiptState(),
) {
    if (!receiptProgressElements) {
        return false;
    }

    renderReceiptProgress(
        receiptProgressElements,
        state,
    );

    return true;
}

/* COMPARAÇÃO DE RECEBEDORES */

function getReceiptComparisonElements(
    rootElement,
) {
    return {
        panel:
            getReceiptChartElementById(
                rootElement,
                "receipt-charts",
            ),

        topReceiver:
            getReceiptChartElementById(
                rootElement,
                "receiptComparisonTopReceiver",
            ),

        topVolume:
            getReceiptChartElementById(
                rootElement,
                "receiptComparisonTopVolume",
            ),

        topRateLabel:
            getReceiptChartElementById(
                rootElement,
                "receiptComparisonTopRateLabel",
            ),

        topRate:
            getReceiptChartElementById(
                rootElement,
                "receiptComparisonTopRate",
            ),

        topRateDetails:
            getReceiptChartElementById(
                rootElement,
                "receiptComparisonTopRateDetails",
            ),

        chartContainer:
            getReceiptChartElementById(
                rootElement,
                "receiptAlignedComparisonChartContainer",
            ),

        comparisonCanvas:
            getReceiptChartElementById(
                rootElement,
                "receiptAlignedComparisonChart",
            ),
    };
}

function hasReceiptComparisonElements(
    elements,
) {
    return (
        elements.panel instanceof
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

        elements.chartContainer instanceof
            HTMLElement &&

        elements.comparisonCanvas instanceof
            HTMLCanvasElement
    );
}

/* VALORES AO FINAL DAS BARRAS */

const receiptComparisonBarValuesPlugin = {
    id: "receiptComparisonBarValues",

    afterDatasetsDraw(
        chart,
        args,
        options,
    ) {
        if (
            options.display === false ||
            !chart.chartArea
        ) {
            return;
        }

        const dataset =
            chart.data.datasets[0];

        const metadata =
            chart.getDatasetMeta(
                0,
            );

        const context =
            chart.ctx;

        const chartArea =
            chart.chartArea;

        context.save();

        if (
            "letterSpacing" in
            context
        ) {
            context.letterSpacing =
                "1px";
        }

        context.font =
            '600 13px "Open Sans", sans-serif';

        context.textBaseline =
            "middle";

        context.lineWidth =
            3;

        context.strokeStyle =
            "#1c1c1c";

        context.fillStyle =
            "#e4e6eb";

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

                const formattedValue =
                    dataset.receiptMetric ===
                    "error"
                        ? formatReceiptComparisonPercentage(
                            value,
                        )
                        : formatReceiptProgressQuantity(
                            value,
                        );

                const textWidth =
                    context
                        .measureText(
                            formattedValue,
                        )
                        .width;

                let positionX =
                    bar.x + 8;

                let textAlign =
                    "left";

                /*
                 * Se o texto ultrapassar o gráfico,
                 * ele será mostrado antes do fim
                 * da barra.
                 */

                if (
                    positionX +
                        textWidth >
                    chartArea.right
                ) {
                    positionX =
                        bar.x - 8;

                    textAlign =
                        "right";
                }

                context.textAlign =
                    textAlign;

                context.strokeText(
                    formattedValue,
                    positionX,
                    bar.y,
                );

                context.fillText(
                    formattedValue,
                    positionX,
                    bar.y,
                );
            },
        );

        context.restore();
    },
};

/* ESPAÇAMENTO DOS TEXTOS DO CANVAS */

function applyReceiptCanvasTextSpacing(
    chart,
) {
    const context =
        chart.ctx;

    /*
     * Suportado pelos navegadores
     * modernos baseados em Chromium.
     */

    if (
        "letterSpacing" in
        context
    ) {
        context.letterSpacing =
            "1px";
    }
}

const receiptComparisonTextSpacingPlugin = {
    id: "receiptComparisonTextSpacing",

    beforeDraw(
        chart,
    ) {
        applyReceiptCanvasTextSpacing(
            chart,
        );
    },

    beforeDatasetsDraw(
        chart,
    ) {
        applyReceiptCanvasTextSpacing(
            chart,
        );
    },

    beforeTooltipDraw(
        chart,
    ) {
        applyReceiptCanvasTextSpacing(
            chart,
        );
    },
};

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

                        receiptMetric:
                            metric,

                        backgroundColor:
                            metric === "volume"
                            ? "#4CAF50"
                            : "#F44336",

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

            plugins: [
                receiptComparisonTextSpacingPlugin,
                receiptComparisonBarValuesPlugin,
            ],

            options: {
                indexAxis: "y",

                responsive: true,
                maintainAspectRatio: false,

                devicePixelRatio:
                    RECEIPT_CHART_PIXEL_RATIO,

                layout: {
                    padding: {
                        top: 5,
                        right: 20,
                        bottom: 5,
                        left: 20,
                    },
                },

                animation: {
                    duration: 250,
                },

                interaction: {
                    intersect: false,
                    mode: "nearest",
                },

                plugins: {
                    receiptComparisonBarValues: {
                        display: true,
                    },

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
                                    return (
                                        "Etiquetador: " +
                                        formatReportPersonFirstName(
                                            details.labeler,
                                            "—",
                                        )
                                    );
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

/* COMPARAÇÃO ALINHADA DE RECEBEDORES */

const RECEIPT_ALIGNED_COLUMN_GAP = 30;
const RECEIPT_ALIGNED_VOLUME_INTERVALS = 5;
const RECEIPT_ALIGNED_ERROR_INTERVAL = 0.2;
const RECEIPT_ALIGNED_INITIAL_ERROR_MAXIMUM = 1;
const RECEIPT_ALIGNED_VOLUME_COLOR = "#4caf50";
const RECEIPT_ALIGNED_ERROR_COLOR = "#f44336";

const receiptAlignedVolumeAxisFormatter =
    new Intl.NumberFormat(
        "pt-BR",
        {
            maximumFractionDigits: 1,
        },
    );

function formatReceiptAlignedVolumeAxisTick(
    value,
) {
    const numericValue =
        Number(value);

    if (!Number.isFinite(numericValue)) {
        return "—";
    }

    if (Math.abs(numericValue) >= 1000) {
        return (
            receiptAlignedVolumeAxisFormatter
                .format(
                    numericValue / 1000,
                ) +
            "K"
        );
    }

    return formatReceiptProgressQuantity(
        numericValue,
    );
}

function getReceiptAlignedVolumeMaximum(
    value,
) {
    const maximum = Math.max(
        Math.ceil(Number(value) || 0),
        1,
    );
    const roughStep =
        maximum /
        RECEIPT_ALIGNED_VOLUME_INTERVALS;
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

    return (
        step *
        RECEIPT_ALIGNED_VOLUME_INTERVALS
    );
}

function getReceiptAlignedErrorMaximum(
    value,
) {
    return Math.max(
        RECEIPT_ALIGNED_INITIAL_ERROR_MAXIMUM,
        Math.ceil(
            (Number(value) || 0) /
            RECEIPT_ALIGNED_ERROR_INTERVAL,
        ) *
            RECEIPT_ALIGNED_ERROR_INTERVAL,
    );
}

function normalizeReceiptAlignedMetric(
    value,
    maximum,
    start,
    end,
) {
    const ratio = Math.max(
        0,
        Math.min(
            (Number(value) || 0) /
                maximum,
            1,
        ),
    );

    return start +
        (end - start) * ratio;
}

function drawReceiptAlignedRoundedBar(
    context,
    positionX,
    positionY,
    width,
    height,
    fillStyle,
) {
    const safeWidth = Math.max(
        Number(width) || 0,
        0,
    );

    if (safeWidth === 0) {
        return;
    }

    const radius = Math.min(
        3,
        safeWidth / 2,
        height / 2,
    );

    context.fillStyle =
        fillStyle;
    context.beginPath();
    context.moveTo(
        positionX + radius,
        positionY,
    );
    context.lineTo(
        positionX + safeWidth - radius,
        positionY,
    );
    context.quadraticCurveTo(
        positionX + safeWidth,
        positionY,
        positionX + safeWidth,
        positionY + radius,
    );
    context.lineTo(
        positionX + safeWidth,
        positionY + height - radius,
    );
    context.quadraticCurveTo(
        positionX + safeWidth,
        positionY + height,
        positionX + safeWidth - radius,
        positionY + height,
    );
    context.lineTo(
        positionX + radius,
        positionY + height,
    );
    context.quadraticCurveTo(
        positionX,
        positionY + height,
        positionX,
        positionY + height - radius,
    );
    context.lineTo(
        positionX,
        positionY + radius,
    );
    context.quadraticCurveTo(
        positionX,
        positionY,
        positionX + radius,
        positionY,
    );
    context.fill();
}

function drawReceiptAlignedMetricLabel(
    context,
    label,
    barEnd,
    panelEnd,
    positionY,
) {
    const labelWidth =
        context.measureText(
            label,
        ).width;
    let positionX =
        barEnd + 10;

    context.textAlign =
        "left";

    if (
        positionX + labelWidth >
        panelEnd - 4
    ) {
        positionX =
            panelEnd - 8;
        context.textAlign =
            "right";
    }

    context.strokeStyle =
        "#18191a";
    context.lineWidth = 1;
    context.fillStyle =
        "#e4e6eb";
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

function drawReceiptAlignedComparison(
    chart,
) {
    const rows =
        chart.$receiptAlignedRows || [];
    const context =
        chart.ctx;
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

    applyReceiptCanvasTextSpacing(
        chart,
    );

    const volumeMaximum =
        chart.$receiptAlignedVolumeMaximum ||
        1;
    const errorMaximum =
        chart.$receiptAlignedErrorMaximum ||
        RECEIPT_ALIGNED_INITIAL_ERROR_MAXIMUM;
    const comparisonWidth =
        chartArea.right -
        chartArea.left;
    const columnWidth =
        (
            comparisonWidth -
            RECEIPT_ALIGNED_COLUMN_GAP
        ) / 2;
    const volumeStart =
        chartArea.left;
    const volumeEnd =
        volumeStart +
        columnWidth;
    const errorStart =
        volumeEnd +
        RECEIPT_ALIGNED_COLUMN_GAP;
    const errorEnd =
        errorStart +
        columnWidth;
    const nameStart =
        volumeStart + 5;
    const volumeBarStart = Math.min(
        volumeStart + 115,
        volumeEnd - 80,
    );
    const axisY =
        chartArea.bottom + 8;
    const barHeight = 20;

    context.save();
    context.textBaseline =
        "middle";
    context.font =
        '500 14px "Open Sans", sans-serif';
    context.fillStyle =
        "#bfc2c8";
    context.strokeStyle =
        "rgba(82, 82, 82, 0.45)";
    context.lineWidth = 1;

    for (
        let index = 0;
        index <= RECEIPT_ALIGNED_VOLUME_INTERVALS;
        index += 1
    ) {
        const ratio =
            index /
            RECEIPT_ALIGNED_VOLUME_INTERVALS;
        const value =
            volumeMaximum *
            ratio;
        const positionX =
            volumeBarStart +
            (
                volumeEnd -
                volumeBarStart
            ) * ratio;

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
        context.textAlign =
            index === 0
                ? "left"
                : index ===
                    RECEIPT_ALIGNED_VOLUME_INTERVALS
                    ? "right"
                    : "center";
        context.fillText(
            formatReceiptAlignedVolumeAxisTick(
                value,
            ),
            positionX,
            axisY + 16,
        );
    }

    const errorIntervalCount = Math.round(
        errorMaximum /
        RECEIPT_ALIGNED_ERROR_INTERVAL,
    );

    for (
        let index = 0;
        index <= errorIntervalCount;
        index += 1
    ) {
        const value = Math.min(
            index *
                RECEIPT_ALIGNED_ERROR_INTERVAL,
            errorMaximum,
        );
        const ratio =
            value /
            errorMaximum;
        const positionX =
            errorStart +
            (errorEnd - errorStart) *
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
        context.textAlign =
            index === 0
                ? "left"
                : index ===
                    errorIntervalCount
                    ? "right"
                    : "center";
        context.fillText(
            `${Math.round(value * 100)}%`,
            positionX,
            axisY + 16,
        );
    }

    context.strokeStyle =
        "rgba(82, 82, 82, 0.7)";
    [
        chartArea.top,
        chartArea.bottom,
    ].forEach(
        function (positionY) {
            context.beginPath();
            context.moveTo(
                volumeStart,
                positionY,
            );
            context.lineTo(
                errorEnd,
                positionY,
            );
            context.stroke();
        },
    );

    if (rows.length === 0) {
        context.font =
            '600 14px "Open Sans", sans-serif';
        context.fillStyle =
            "#bfc2c8";
        context.textAlign =
            "center";
        context.fillText(
            "Importe os dados para comparar os recebedores.",
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
            const positionY =
                yScale.getPixelForValue(
                    index,
                );
            const rowBottom =
                yScale.getPixelForValue(
                    index + 0.5,
                );
            const volumeValue =
                operator.packagesReceived ??
                0;
            const errorValue =
                operator.errorMetric;
            const volumeBarEnd =
                volumeBarStart +
                (
                    volumeEnd -
                    volumeBarStart
                ) *
                Math.min(
                    volumeValue /
                        volumeMaximum,
                    1,
                );
            const errorBarEnd =
                errorValue === null
                    ? errorStart
                    : errorStart +
                        (
                            errorEnd -
                            errorStart
                        ) *
                        Math.min(
                            errorValue /
                                errorMaximum,
                            1,
                        );

            context.strokeStyle =
                "rgba(82, 82, 82, 0.4)";
            context.lineWidth = 1;
            context.beginPath();
            context.moveTo(
                volumeStart,
                rowBottom,
            );
            context.lineTo(
                errorEnd,
                rowBottom,
            );
            context.stroke();

            context.font =
                '600 14px "Open Sans", sans-serif';
            context.fillStyle =
                "#e4e6eb";
            context.textAlign =
                "left";
            context.fillText(
                operator.receiver,
                nameStart,
                positionY,
            );

            drawReceiptAlignedRoundedBar(
                context,
                volumeBarStart,
                positionY -
                    barHeight / 2,
                volumeEnd -
                    volumeBarStart,
                barHeight,
                "rgba(228, 230, 235, 0.07)",
            );
            drawReceiptAlignedRoundedBar(
                context,
                volumeBarStart,
                positionY -
                    barHeight / 2,
                volumeBarEnd -
                    volumeBarStart,
                barHeight,
                RECEIPT_ALIGNED_VOLUME_COLOR,
            );
            drawReceiptAlignedRoundedBar(
                context,
                errorStart,
                positionY -
                    barHeight / 2,
                errorEnd - errorStart,
                barHeight,
                "rgba(228, 230, 235, 0.07)",
            );

            if (errorValue !== null) {
                drawReceiptAlignedRoundedBar(
                    context,
                    errorStart,
                    positionY -
                        barHeight / 2,
                    errorBarEnd -
                        errorStart,
                    barHeight,
                    RECEIPT_ALIGNED_ERROR_COLOR,
                );
            }

            context.font =
                '600 14px "Open Sans", sans-serif';
            drawReceiptAlignedMetricLabel(
                context,
                formatReceiptProgressQuantity(
                    volumeValue,
                ),
                volumeBarEnd,
                volumeEnd,
                positionY,
            );

            if (errorValue === null) {
                context.fillStyle =
                    "#bfc2c8";
                context.textAlign =
                    "left";
                context.fillText(
                    "—",
                    errorStart + 8,
                    positionY,
                );
            } else {
                drawReceiptAlignedMetricLabel(
                    context,
                    formatReceiptComparisonPercentage(
                        errorValue,
                    ),
                    errorBarEnd,
                    errorEnd,
                    positionY,
                );
            }
        },
    );

    context.restore();
}

const receiptAlignedComparisonPlugin = {
    id: "receiptAlignedComparison",

    beforeDatasetsDraw(chart) {
        drawReceiptAlignedComparison(
            chart,
        );
    },
};

function createReceiptAlignedComparisonChart(
    canvas,
) {
    return new window.Chart(
        canvas,
        {
            type: "scatter",
            data: {
                datasets: [
                    {
                        label: "Volume recebido",
                        receiptMetric: "volume",
                        data: [],
                        pointRadius: 0,
                        pointHoverRadius: 0,
                        pointHitRadius: 12,
                        pointBackgroundColor:
                            "transparent",
                        pointBorderWidth: 0,
                    },
                    {
                        label: "Taxa de erros",
                        receiptMetric: "error",
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
                receiptAlignedComparisonPlugin,
            ],
            options: {
                responsive: true,
                maintainAspectRatio: false,
                devicePixelRatio:
                    RECEIPT_CHART_PIXEL_RATIO,
                parsing: false,
                layout: {
                    padding: {
                        top: 16,
                        right: 16,
                        bottom: 46,
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
                                    ?.receiver ||
                                    "";
                            },
                            label(context) {
                                const data =
                                    context.raw;

                                if (
                                    context
                                        .dataset
                                        .receiptMetric ===
                                    "volume"
                                ) {
                                    return (
                                        "Pacotes recebidos: " +
                                        formatReceiptProgressQuantity(
                                            data.actualValue,
                                        )
                                    );
                                }

                                return (
                                    (
                                        data.useParticipation
                                            ? "Participação nos erros: "
                                            : "Taxa de erros: "
                                    ) +
                                    formatReceiptComparisonPercentage(
                                        data.actualValue,
                                    )
                                );
                            },
                            afterLabel(context) {
                                const data =
                                    context.raw;
                                const details =
                                    data.details;

                                if (
                                    context
                                        .dataset
                                        .receiptMetric ===
                                    "volume"
                                ) {
                                    return (
                                        "Etiquetador: " +
                                        formatReportPersonFirstName(
                                            details.labeler,
                                            "—",
                                        )
                                    );
                                }

                                return data.useParticipation
                                    ? (
                                        "Erros: " +
                                        formatReceiptProgressQuantity(
                                            details.errorQuantity,
                                        ) +
                                        " de " +
                                        formatReceiptProgressQuantity(
                                            data.totalErrors,
                                        )
                                    )
                                    : (
                                        "Erros: " +
                                        formatReceiptProgressQuantity(
                                            details.errorQuantity,
                                        ) +
                                        " de " +
                                        formatReceiptProgressQuantity(
                                            details.packagesReceived,
                                        ) +
                                        " pacotes"
                                    );
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

function updateReceiptAlignedComparisonChart(
    chart,
    rows,
    useParticipation,
    totalErrors,
) {
    const volumeMaximum =
        getReceiptAlignedVolumeMaximum(
            Math.max(
                0,
                ...rows.map(
                    function (operator) {
                        return operator
                            .packagesReceived ??
                            0;
                    },
                ),
            ),
        );
    const errorMaximum =
        getReceiptAlignedErrorMaximum(
            Math.max(
                0,
                ...rows.map(
                    function (operator) {
                        return operator
                            .errorMetric ??
                            0;
                    },
                ),
            ),
        );

    chart.$receiptAlignedRows =
        rows;
    chart.$receiptAlignedVolumeMaximum =
        volumeMaximum;
    chart.$receiptAlignedErrorMaximum =
        errorMaximum;
    chart.options.scales.y.max =
        Math.max(
            rows.length - 0.5,
            0.5,
        );

    chart.data.datasets[0].data =
        rows.map(
            function (operator, index) {
                return {
                    x: normalizeReceiptAlignedMetric(
                        operator.packagesReceived,
                        volumeMaximum,
                        0,
                        49,
                    ),
                    y: index,
                    actualValue:
                        operator.packagesReceived,
                    receiver:
                        operator.receiver,
                    details: operator,
                };
            },
        );
    chart.data.datasets[1].data =
        rows.flatMap(
            function (operator, index) {
                if (
                    operator.errorMetric ===
                    null
                ) {
                    return [];
                }

                return [
                    {
                        x: normalizeReceiptAlignedMetric(
                            operator.errorMetric,
                            errorMaximum,
                            51,
                            100,
                        ),
                        y: index,
                        actualValue:
                            operator.errorMetric,
                        receiver:
                            operator.receiver,
                        details: operator,
                        useParticipation,
                        totalErrors,
                    },
                ];
            },
        );

    const chartHeight = Math.max(
        470,
        rows.length * 58 +
            85,
    );

    chart.canvas
        .parentElement
        .style.height =
            `${chartHeight}px`;
    chart.resize();
    chart.update();
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

    const selectedOperators =
        state.operators
            .filter(
                function (operator) {
                    return operator.selected !==
                        false;
                },
            );

    const operators =
        selectedOperators.map(
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

    const topErrorOperatorName =
        formatReportPersonFirstName(
            topErrorOperator
                ?.labeler ||
                topErrorOperator
                    ?.receiver,
            "—",
        );

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
                        `${topErrorOperatorName}: ` +
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
                        `${topErrorOperatorName}: ` +
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

    updateReceiptAlignedComparisonChart(
        receiptAlignedComparisonChart,
        volumeRanking,
        data.useParticipation,
        data.summary.totalErrors,
    );
}

function observeReceiptComparisonVisibility(
    elements,
    receiptPanel,
) {
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
                        [
                            receiptAlignedComparisonChart,
                        ].forEach(
                            function (
                                chart,
                            ) {
                                if (!chart) {
                                    return;
                                }

                                chart.resize();

                                chart.update(
                                    "none",
                                );
                            },
                        );
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

function initializeReceiptComparisonHeight(
    elements,
    receiptPanel,
) {
    const reportControls =
        receiptPanel.querySelector(
            ".report-controls",
        );

    const comparisonPreview =
        elements.panel.querySelector(
            ".preview-style",
        );

    if (
        !(
            reportControls instanceof
            HTMLElement
        ) ||
        !(
            comparisonPreview instanceof
            HTMLElement
        )
    ) {
        console.error(
            "Não foi possível sincronizar a altura da comparação.",
        );

        return;
    }

    function synchronizeComparisonHeight() {
        if (
            receiptComparisonHeightFrame !==
            null
        ) {
            window.cancelAnimationFrame(
                receiptComparisonHeightFrame,
            );
        }

        receiptComparisonHeightFrame =
            window.requestAnimationFrame(
                function () {
                    receiptComparisonHeightFrame =
                        null;

                    const controlsHeight =
                        Math.ceil(
                            reportControls
                                .getBoundingClientRect()
                                .height,
                        );

                    /*
                     * O painel pode estar oculto durante
                     * a inicialização.
                     */

                    if (controlsHeight <= 0) {
                        return;
                    }

                    const cssHeight =
                        `${controlsHeight}px`;

                    const currentHeight =
                        comparisonPreview
                            .style
                            .getPropertyValue(
                                "--receipt-comparison-height",
                            );

                    if (
                        currentHeight ===
                        cssHeight
                    ) {
                        return;
                    }

                    comparisonPreview
                        .style
                        .setProperty(
                            "--receipt-comparison-height",
                            cssHeight,
                        );

                    window.requestAnimationFrame(
                        function () {
                            [
                                receiptAlignedComparisonChart,
                            ].forEach(
                                function (
                                    chart,
                                ) {
                                    if (!chart) {
                                        return;
                                    }

                                    chart.resize();

                                    chart.update(
                                        "none",
                                    );
                                },
                            );
                        },
                    );
                },
            );
    }

    receiptComparisonHeightObserver
        ?.disconnect();

    receiptComparisonHeightObserver =
        new ResizeObserver(
            synchronizeComparisonHeight,
        );

    receiptComparisonHeightObserver.observe(
        reportControls,
    );

    window.addEventListener(
        "resize",
        synchronizeComparisonHeight,
    );

    synchronizeComparisonHeight();
}

function initializeReceiptComparisonCharts(
    receiptPanel,
) {
    const elements =
        getReceiptComparisonElements(
            receiptPanel,
        );

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

    receiptAlignedComparisonChart =
        createReceiptAlignedComparisonChart(
            elements.comparisonCanvas,
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
        receiptPanel,
    );

    initializeReceiptComparisonHeight(
        elements,
        receiptPanel,
    );

    return true;
}

/* INICIALIZAÇÃO */

function initializeReceiptCharts(
    rootElement =
        document.getElementById(
            "receipt",
        ),
) {
    const receiptPanel =
        rootElement instanceof HTMLElement
            ? rootElement
            : null;

    if (!receiptPanel) {
        return false;
    }

    const comparisonInitialized =
        initializeReceiptComparisonCharts(
            receiptPanel,
        );

    const elements =
        getReceiptProgressElements(
            receiptPanel,
        );

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

    receiptProgressElements =
        elements;

    subscribeReceiptState(
        renderReceiptCharts,
    );

    renderReceiptCharts();

    return true;
}

export {
    initializeReceiptCharts,
    renderReceiptCharts,
};
