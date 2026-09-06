import {
    getExpeditionOperatorRanking,
    getExpeditionState,
    subscribeExpeditionState,
} from "./expedition-state.js";

let routesChart = null;
let averageTimeChart = null;
let controlsHeightObserver = null;
let visibilityObserver = null;
let heightFrame = null;
let resizeFrame = null;

const CHART_PIXEL_RATIO = Math.max(
    window.devicePixelRatio || 1,
    3,
);

const quantityFormatter =
    new Intl.NumberFormat("pt-BR");

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

    return name.trim() || "—";
}

function getCompactOperatorName(
    value,
) {
    const fullName =
        getOperatorName(value);

    if (
        fullName === "—" ||
        fullName.length <= 22
    ) {
        return fullName;
    }

    const nameParts =
        fullName.split(/\s+/);

    const compactName =
        nameParts.length > 1
            ? (
                nameParts[0] +
                " " +
                nameParts[
                    nameParts.length - 1
                ]
            )
            : fullName;

    return compactName.length <= 22
        ? compactName
        : `${compactName.slice(0, 21)}…`;
}

/* ELEMENTOS */

function getChartElements() {
    return {
        expeditionPanel:
            document.getElementById(
                "expedition",
            ),

        panel:
            document.getElementById(
                "expedition-charts",
            ),

        preview:
            document.getElementById(
                "expeditionChartsExportArea",
            ),

        topRoutesOperator:
            document.getElementById(
                "expeditionTopRoutesOperator",
            ),

        topRoutesDetails:
            document.getElementById(
                "expeditionTopRoutesDetails",
            ),

        fastestOperator:
            document.getElementById(
                "expeditionFastestOperator",
            ),

        fastestOperatorDetails:
            document.getElementById(
                "expeditionFastestOperatorDetails",
            ),

        routesCanvas:
            document.getElementById(
                "expeditionVolumeComparisonChart",
            ),

        timeCanvas:
            document.getElementById(
                "expeditionTimeComparisonChart",
            ),
    };
}

function hasChartElements(
    elements,
) {
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

        elements.routesCanvas instanceof
            HTMLCanvasElement &&

        elements.timeCanvas instanceof
            HTMLCanvasElement
    );
}

/* ESPAÇAMENTO DOS TEXTOS */

function applyTextSpacing(
    chart,
) {
    if (
        "letterSpacing" in
        chart.ctx
    ) {
        chart.ctx.letterSpacing =
            "1px";
    }
}

const textSpacingPlugin = {
    id: "expeditionTextSpacing",

    beforeDraw(
        chart,
    ) {
        applyTextSpacing(
            chart,
        );
    },

    beforeDatasetsDraw(
        chart,
    ) {
        applyTextSpacing(
            chart,
        );
    },

    beforeTooltipDraw(
        chart,
    ) {
        applyTextSpacing(
            chart,
        );
    },
};

/* VALORES NO FINAL DAS BARRAS */

const barValuesPlugin = {
    id: "expeditionBarValues",

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
            '600 11px "Open Sans", sans-serif';

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
                    !Number.isFinite(
                        Number(value),
                    )
                ) {
                    return;
                }

                const formattedValue =
                    dataset
                        .expeditionMetric ===
                    "time"
                        ? formatDuration(
                            value,
                        )
                        : formatQuantity(
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
                 * Se o valor ultrapassar a área
                 * do gráfico, ele será mostrado
                 * antes do final da barra.
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

/* CRIAÇÃO DOS GRÁFICOS */

function createChart(
    canvas,
    metric,
) {
    const isTimeMetric =
        metric === "time";

    return new window.Chart(
        canvas,
        {
            type: "bar",

            data: {
                labels: [],

                datasets: [
                    {
                        data: [],

                        expeditionMetric:
                            metric,

                        expeditionDetails:
                            [],

                        backgroundColor:
                            isTimeMetric
                                ? "#2196F3"
                                : "#4CAF50",

                        borderWidth:
                            0,

                        maxBarThickness:
                            20,

                        categoryPercentage:
                            0.82,

                        barPercentage:
                            0.8,
                    },
                ],
            },

            plugins: [
                textSpacingPlugin,
                barValuesPlugin,
            ],

            options: {
                indexAxis:
                    "y",

                responsive:
                    true,

                maintainAspectRatio:
                    false,

                devicePixelRatio:
                    CHART_PIXEL_RATIO,

                layout: {
                    padding: {
                        top:
                            5,

                        right:
                            35,

                        bottom:
                            5,

                        left:
                            5,
                    },
                },

                animation: {
                    duration:
                        250,
                },

                interaction: {
                    intersect:
                        false,

                    mode:
                        "nearest",
                },

                plugins: {
                    expeditionBarValues: {
                        display:
                            true,
                    },

                    legend: {
                        display:
                            false,
                    },

                    tooltip: {
                        callbacks: {
                            title(
                                contexts,
                            ) {
                                const context =
                                    contexts[0];

                                const details =
                                    context
                                        ?.dataset
                                        ?.expeditionDetails[
                                            context
                                                .dataIndex
                                        ];

                                return (
                                    details
                                        ?.operatorName ||

                                    context
                                        ?.label ||

                                    ""
                                );
                            },

                            label(
                                context,
                            ) {
                                if (
                                    isTimeMetric
                                ) {
                                    return (
                                        "Tempo médio: " +
                                        formatDuration(
                                            context.raw,
                                        )
                                    );
                                }

                                return (
                                    "Rotas conferidas: " +
                                    formatQuantity(
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
                                        .expeditionDetails[
                                            context
                                                .dataIndex
                                        ];

                                if (!details) {
                                    return "";
                                }

                                if (
                                    !isTimeMetric
                                ) {
                                    return (
                                        "Volume conferido: " +
                                        formatQuantity(
                                            details
                                                .volumeChecked,
                                        )
                                    );
                                }

                                return [
                                    (
                                        "Melhor tempo: " +
                                        formatDuration(
                                            details
                                                .bestDurationSeconds,
                                        )
                                    ),

                                    (
                                        "Pior tempo: " +
                                        formatDuration(
                                            details
                                                .worstDurationSeconds,
                                        )
                                    ),

                                    (
                                        "Rotas conferidas: " +
                                        formatQuantity(
                                            details
                                                .routesChecked,
                                        )
                                    ),
                                ];
                            },
                        },
                    },
                },

                scales: {
                    x: {
                        beginAtZero:
                            true,

                        grace:
                            "18%",

                        ticks: {
                            color:
                                "#e4e6eb",

                            precision:
                                isTimeMetric
                                    ? undefined
                                    : 0,

                            callback(
                                value,
                            ) {
                                return isTimeMetric
                                    ? formatDuration(
                                        value,
                                    )
                                    : formatQuantity(
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
                            color:
                                "#e4e6eb",

                            autoSkip:
                                false,

                            callback(
                                value,
                            ) {
                                return (
                                    getCompactOperatorName(
                                        this
                                            .getLabelForValue(
                                                value,
                                            ),
                                    )
                                );
                            },
                        },

                        grid: {
                            display:
                                false,
                        },
                    },
                },
            },
        },
    );
}

/* ATUALIZA UM GRÁFICO */

function updateChart(
    chart,
    operators,
    metric,
    animate,
) {
    const dataset =
        chart.data.datasets[0];

    chart.data.labels =
        operators.map(
            function (
                operator,
            ) {
                return (
                    getOperatorName(
                        operator
                            .operator,
                    )
                );
            },
        );

    dataset.data =
        operators.map(
            function (
                operator,
            ) {
                return metric ===
                    "time"
                    ? operator
                        .averageDurationSeconds
                    : operator
                        .routesChecked;
            },
        );

    dataset.expeditionDetails =
        operators.map(
            function (
                operator,
            ) {
                return {
                    ...operator,

                    operatorName:
                        getOperatorName(
                            operator
                                .operator,
                        ),
                };
            },
        );

    chart.update(
        animate
            ? undefined
            : "none",
    );
}

/* ATUALIZA OS CARDS */

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

/* RENDERIZA O RANKING */

function renderCharts(
    elements,
    state,
) {
    const operators =
        getExpeditionOperatorRanking(
            state,
        );

    /*
     * Maior quantidade de rotas
     * aparece primeiro.
     */

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

    /*
     * Menor tempo médio
     * aparece primeiro.
     */

    const timeRanking =
        operators
            .filter(
                function (
                    operator,
                ) {
                    return (
                        operator
                            .averageDurationSeconds !==
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

    const animate =
        elements
            .panel
            .classList
            .contains(
                "is-active",
            );

    updateChart(
        routesChart,
        routesRanking,
        "routes",
        animate,
    );

    updateChart(
        averageTimeChart,
        timeRanking,
        "time",
        animate,
    );
}

/* REDIMENSIONA OS GRÁFICOS */

function resizeCharts() {
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
                resizeFrame =
                    null;

                [
                    routesChart,
                    averageTimeChart,
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
}

/* SINCRONIZA A ALTURA */

function initializeHeightSync(
    elements,
) {
    const reportControls =
        document.querySelector(
            "#expedition > div.flex-box-start > .report-controls",
        );

    if (
        !(
            reportControls instanceof
            HTMLElement
        )
    ) {
        console.error(
            "Não foi possível sincronizar a altura dos gráficos de expedição.",
        );

        return function () {};
    }

    function synchronizeHeight() {
        if (
            heightFrame !==
            null
        ) {
            window.cancelAnimationFrame(
                heightFrame,
            );
        }

        heightFrame =
            window.requestAnimationFrame(
                function () {
                    heightFrame =
                        null;

                    const controlsHeight =
                        Math.ceil(
                            reportControls
                                .getBoundingClientRect()
                                .height,
                        );

                    /*
                     * O painel pode estar oculto
                     * durante a inicialização.
                     */

                    if (
                        controlsHeight <=
                        0
                    ) {
                        return;
                    }

                    const cssHeight =
                        `${controlsHeight}px`;

                    const currentHeight =
                        elements
                            .preview
                            .style
                            .getPropertyValue(
                                "--expedition-charts-height",
                            );

                    if (
                        currentHeight ===
                        cssHeight
                    ) {
                        return;
                    }

                    elements
                        .preview
                        .style
                        .setProperty(
                            "--expedition-charts-height",
                            cssHeight,
                        );

                    resizeCharts();
                },
            );
    }

    controlsHeightObserver
        ?.disconnect();

    if (
        typeof window
            .ResizeObserver ===
        "function"
    ) {
        controlsHeightObserver =
            new ResizeObserver(
                synchronizeHeight,
            );

        controlsHeightObserver
            .observe(
                reportControls,
            );
    }

    window.addEventListener(
        "resize",
        synchronizeHeight,
    );

    synchronizeHeight();

    return synchronizeHeight;
}

/* OBSERVA A EXIBIÇÃO DA GUIA */

function observeVisibility(
    elements,
    synchronizeHeight,
) {
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

                synchronizeHeight();
                resizeCharts();
            },
        );

    [
        elements.expeditionPanel,
        elements.panel,
    ].forEach(
        function (
            element,
        ) {
            visibilityObserver
                .observe(
                    element,
                    {
                        attributes:
                            true,

                        attributeFilter: [
                            "class",
                        ],
                    },
                );
        },
    );
}

/* INICIALIZAÇÃO */

function initializeExpeditionCharts() {
    const elements =
        getChartElements();

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
            "O Chart.js não está disponível para os gráficos de expedição.",
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

    routesChart =
        createChart(
            elements
                .routesCanvas,
            "routes",
        );

    averageTimeChart =
        createChart(
            elements
                .timeCanvas,
            "time",
        );

    subscribeExpeditionState(
        function (
            state,
        ) {
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

    const synchronizeHeight =
        initializeHeightSync(
            elements,
        );

    observeVisibility(
        elements,
        synchronizeHeight,
    );

    return true;
}

export {
    initializeExpeditionCharts,
};