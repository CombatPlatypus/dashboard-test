/* LIMITES DOS GRÁFICOS */

const MAX_CHART_ITEMS = 25;

const MAX_PIE_ITEMS = 10;

/* ELEMENTOS DA MONTAGEM DE GRÁFICOS */

const chartPanel = document.getElementById("statisticsChartPanel");
const chartEmpty = document.getElementById("statisticsChartEmpty");
const chartSummary = document.getElementById("statisticsChartSummary");
const chartCategory = document.getElementById("statisticsChartCategory");
const chartValue = document.getElementById("statisticsChartValue");
const chartOperation = document.getElementById("statisticsChartOperation");
const chartTypes = document.getElementById("statisticsChartTypes");
const chartColors = document.getElementById("statisticsChartColors");
const chartCanvas = document.getElementById("statisticsChartCanvas");
const chartDownloadButton = document.getElementById("statisticsChartDownload");
const chartShowValues = document.getElementById("statisticsChartShowValues");

/* ESTADO DO GRÁFICO */

const chartState = {
    instance: null,

    type: "bar",

    showValues: true,

    color: "#ff5533",
};

/* FUNDO DO GRÁFICO E DA IMAGEM PNG */

const chartBackgroundPlugin = {
    id: "statisticsChartBackground",

    beforeDraw(chart, unusedArguments, options) {
        const context = chart.ctx;

        context.save();

        context.globalCompositeOperation = "destination-over";

        context.fillStyle = options.color ?? "#18191a";

        context.fillRect(0, 0, chart.width, chart.height);

        context.restore();
    },
};


/* MOSTRA PERCENTUAIS NO GRÁFICO DE PIZZA */

const chartPercentagePlugin = {
    id: "statisticsChartPercentage",

    afterDatasetsDraw(chart) {
        if (
            chart.config.type !==
            "pie"
        ) {
            return;
        }

        const dataset =
            chart.data.datasets[0];

        const values =
            dataset?.data ?? [];

        const total =
            getChartDataTotal(
                values,
            );

        if (!total) {
            return;
        }

        const metadata =
            chart.getDatasetMeta(0);

        const context =
            chart.ctx;

        context.save();

        context.font =
            '600 13px "Open Sans", sans-serif';

        context.textAlign =
            "center";

        context.textBaseline =
            "middle";

        context.fillStyle =
            "#ffffff";

        context.strokeStyle =
            "rgba(24, 25, 26, 0.85)";

        context.lineWidth =
            3;

        metadata.data.forEach(
            function (
                arc,
                index,
            ) {
                if (
                    !chart.getDataVisibility(
                        index,
                    )
                ) {
                    return;
                }

                const numericValue =
                    Math.abs(
                        Number(
                            values[index],
                        ) || 0,
                    );

                const percentage =
                    (
                        numericValue /
                        total
                    ) *
                    100;

                /*
                 * Evita textos sobrepostos
                 * dentro de fatias pequenas.
                 */

                if (
                    percentage < 4
                ) {
                    return;
                }

                const position =
                    arc.tooltipPosition();

                const percentageText =
                    formatChartPercentage(
                        percentage,
                    );

                context.strokeText(
                    percentageText,
                    position.x,
                    position.y,
                );

                context.fillText(
                    percentageText,
                    position.x,
                    position.y,
                );
            },
        );

        context.restore();
    },
};

const chartValueLabelsPlugin = {
    id: "statisticsChartValues",

    afterDatasetsDraw(chart) {
        if (
            !chartState.showValues ||
            !["bar", "line"].includes(chart.config.type)
        ) {
            return;
        }

        const dataset = chart.data.datasets[0];
        const metadata = chart.getDatasetMeta(0);
        const context = chart.ctx;

        context.save();
        context.font = "600 12px 'Open Sans', sans-serif";
        context.textAlign = "center";
        context.lineWidth = 3;

        metadata.data.forEach(function (element, index) {
            const value = Number(dataset.data[index]);

            if (!Number.isFinite(value)) {
                return;
            }

            const text = formatAnalysisNumber(value);
            let textPosition;

            if (chart.config.type === "bar") {
                const positiveBar = element.y < element.base;

                textPosition = positiveBar
                    ? element.y - 8
                    : element.y + 8;

                context.textBaseline = positiveBar
                    ? "bottom"
                    : "top";
            } else {
                textPosition = element.y - 10;
                context.textBaseline = "bottom";
            }

            context.strokeStyle = "#18191a";
            context.fillStyle = "#e4e6eb";
            context.strokeText(text, element.x, textPosition);
            context.fillText(text, element.x, textPosition);
        });

        context.restore();
    },
};

/* MONTA A LEGENDA DO GRÁFICO DE PIZZA */

function createPieLegendLabels(chart) {
    const dataset =
        chart.data.datasets[0];

    const values =
        dataset?.data ?? [];

    const total =
        getChartDataTotal(
            values,
        );

    const colors =
        Array.isArray(
            dataset.backgroundColor,
        )
            ? dataset.backgroundColor
            : [];

    return chart.data.labels.map(
        function (
            label,
            index,
        ) {
            const numericValue =
                Math.abs(
                    Number(
                        values[index],
                    ) || 0,
                );

            const percentage =
                total > 0
                    ? (
                          numericValue /
                          total
                      ) *
                      100
                    : 0;

            return {
            text:
                `${shortenChartLabel(label, 28)} — ` +
                formatChartPercentage(
                    percentage,
                ),

                fillStyle:
                    colors[index] ??
                    dataset.backgroundColor,

                strokeStyle:
                    dataset.borderColor,

                fontColor: "#e4e6eb",

                lineWidth:
                    dataset.borderWidth,

                hidden:
                    !chart.getDataVisibility(
                        index,
                    ),

                index,
            };
        },
    );
}

/* ATUALIZA A APARÊNCIA DE UM SELECT2 */

function updateChartSelect2(select) {
    if (
        !window.jQuery ||
        typeof window.jQuery.fn.select2 !== "function" ||
        !select.classList.contains("select2-hidden-accessible")
    ) {
        return;
    }

    window.jQuery(select).trigger("change.select2");
}

/* CRIA UMA OPÇÃO DE COLUNA PARA O GRÁFICO */

function createChartColumnOption(columnIndex) {
    const option = document.createElement("option");

    option.value = String(columnIndex);

    option.textContent = tableState.headers[columnIndex];

    return option;
}

/* ATUALIZA OS CAMPOS CONFORME O AGRUPAMENTO */

function updateChartValueField() {
    const numericColumnsAvailable = chartValue.options.length > 1;

    const sumOption = chartOperation.querySelector('option[value="sum"]');

    const averageOption = chartOperation.querySelector('option[value="average"]');

    sumOption.disabled = !numericColumnsAvailable;

    averageOption.disabled = !numericColumnsAvailable;

    if (!numericColumnsAvailable && chartOperation.value !== "count") {
        chartOperation.value = "count";
    }

    const countOperation = chartOperation.value === "count";

    const placeholder = chartValue.options[0];

    if (countOperation) {
        chartValue.value = "";

        chartValue.disabled = true;

        placeholder.textContent = "Não necessário para contagem";
    } else {
        chartValue.disabled = !numericColumnsAvailable;

        placeholder.textContent = numericColumnsAvailable
            ? "Selecione uma coluna"
            : "Nenhuma coluna numérica";
    }

    updateChartSelect2(chartOperation);

    updateChartSelect2(chartValue);
}

/* AGRUPA OS DADOS SELECIONADOS PARA O GRÁFICO */

function createGroupedChartData() {
    if (chartCategory.value === "") {
        return null;
    }

    const operation = chartOperation.value;

    const valueRequired = operation !== "count";

    if (valueRequired && chartValue.value === "") {
        return null;
    }

    const categoryIndex = Number(chartCategory.value);

    const valueIndex = valueRequired
        ? Number(chartValue.value)
        : null;

    const groups = new Map();

    getFilteredRows().forEach(function (row) {
        const categoryText =
            formatCellValue(row[categoryIndex]).trim() || "Sem valor";

        const categoryKey =
            normalizeSearchValue(categoryText).trim() || "__empty__";

        const group = groups.get(categoryKey) ?? {
            label: categoryText,

            total: 0,

            quantity: 0,
        };

        if (operation === "count") {
            group.total += 1;

            group.quantity += 1;
        } else {
            const numericValue = parseNumericValue(row[valueIndex]);

            if (numericValue === null) {
                return;
            }

            group.total += numericValue;

            group.quantity += 1;
        }

        groups.set(categoryKey, group);
    });

    const groupedItems = Array.from(groups.values())
        .map(function (group) {
            const value =
                operation === "average"
                    ? group.total / group.quantity
                    : group.total;

            return {
                label: group.label,

                value,
            };
        })
        .filter(function (item) {
            return Number.isFinite(item.value);
        })
        .sort(function (firstItem, secondItem) {
            return (
                secondItem.value - firstItem.value ||
                naturalCollator.compare(firstItem.label, secondItem.label)
            );
        });

        const pieChart =
            chartState.type === "pie";

        const itemLimit =
            pieChart
                ? MAX_PIE_ITEMS
                : MAX_CHART_ITEMS;

        const hasOtherItems =
            pieChart &&
            groupedItems.length > itemLimit;

        let limitedItems;

        if (hasOtherItems) {
            const mainItems =
                groupedItems.slice(
                    0,
                    itemLimit - 1,
                );

            const otherValue =
                groupedItems
                    .slice(
                        itemLimit - 1,
                    )
                    .reduce(
                        function (
                            total,
                            item,
                        ) {
                            return (
                                total +
                                item.value
                            );
                        },
                        0,
                    );

            limitedItems = [
                ...mainItems,

                {
                    label: "Outros",

                    value: otherValue,
                },
            ];
        } else {
            limitedItems =
                groupedItems.slice(
                    0,
                    itemLimit,
                );
        }

    const categoryName = tableState.headers[categoryIndex];

    const valueName =
        valueIndex !== null
            ? tableState.headers[valueIndex]
            : "";

    const operationNames = {
        count: "Quantidade",

        sum: "Soma",

        average: "Média",
    };

    const title =
        operation === "count"
            ? `Quantidade por ${categoryName}`
            : `${operationNames[operation]} de ${valueName} por ${categoryName}`;

    return {
        labels: limitedItems.map(function (item) {
            return item.label;
        }),

        values: limitedItems.map(function (item) {
            return item.value;
        }),

    title:
        hasOtherItems
            ? `${title} — ${itemLimit - 1} maiores + Outros`
            : groupedItems.length > itemLimit
                ? `${title} — ${itemLimit} maiores resultados`
                : title,
    };
}

/* REMOVE O GRÁFICO ATUAL */

function destroyChart() {
    if (chartState.instance) {
        chartState.instance.destroy();
        chartState.instance = null;
    }

    chartDownloadButton.disabled = true;
}

/* MOSTRA OU OCULTA O ESTADO VAZIO */

function setChartEmptyState(empty) {
    chartEmpty.hidden =
        !empty;
}

/* MARCA O BOTÃO ATIVO */

function setActiveChartButton(container, activeButton) {
    container.querySelectorAll("button").forEach(function (button) {
        button.setAttribute(
            "aria-pressed",
            String(button === activeButton),
        );
    });
}

/* MONTA A PALETA DE CORES DO GRÁFICO */

function createChartColorPalette(quantity) {
    const availableColors = Array.from(
        chartColors.querySelectorAll("[data-chart-color]"),
    ).map(function (button) {
        return button.dataset.chartColor;
    });

    const selectedColorIndex = availableColors.indexOf(chartState.color);

    const orderedColors =
        selectedColorIndex >= 0
            ? [
                ...availableColors.slice(selectedColorIndex),
                ...availableColors.slice(0, selectedColorIndex),
            ]
            : [
                chartState.color,
                ...availableColors,
            ];

    return Array.from(
        {
            length: quantity,
        },
        function (unusedValue, colorIndex) {
            return orderedColors[colorIndex % orderedColors.length];
        },
    );
}

/* APLICA AS CORES NOS BOTÕES */

function prepareChartColorButtons() {
    chartColors
        .querySelectorAll(
            "[data-chart-color]",
        )
        .forEach(
            function (button) {
                const buttonColor =
                    button.dataset.chartColor;

                if (buttonColor) {
                    button.style.backgroundColor =
                        buttonColor;
                }
            },
        );
}

/* SOMA OS VALORES DO GRÁFICO */

function getChartDataTotal(values) {
    return values.reduce(
        function (
            total,
            value,
        ) {
            const numericValue =
                Number(value);

            return (
                total +
                (
                    Number.isFinite(
                        numericValue,
                    )
                        ? Math.abs(
                              numericValue,
                          )
                        : 0
                )
            );
        },
        0,
    );
}

/* FORMATA O PERCENTUAL DO GRÁFICO */

function formatChartPercentage(value) {
    return (
        new Intl.NumberFormat(
            "pt-BR",
            {
                minimumFractionDigits: 1,

                maximumFractionDigits: 1,
            },
        ).format(value) +
        "%"
    );
}

/* MONTA A APARÊNCIA DO CONJUNTO DE DADOS */

function createChartDataset(chartData) {
    const dataset = {
        label: chartData.title,

        data: chartData.values,
    };

    if (chartState.type === "pie") {
        return {
            ...dataset,

            backgroundColor: createChartColorPalette(
                chartData.values.length,
            ),

            borderColor: "#18191a",

            borderWidth: 2,

            hoverOffset: 8,
        };
    }

    if (chartState.type === "line") {
        return {
            ...dataset,

            backgroundColor: chartState.color,

            borderColor: chartState.color,

            borderWidth: 3,

            pointRadius: 4,

            pointHoverRadius: 6,

            pointBackgroundColor: chartState.color,

            tension: 0.25,

            fill: false,
        };
    }

    return {
        ...dataset,

        backgroundColor: chartState.color,

        borderColor: chartState.color,

        borderWidth: 1,

        borderRadius: 3,
    };
}

/* CALCULA O INTERVALO DO EIXO VERTICAL */

function getChartStepSize(values) {
    const largestValue =
        Math.max(
            ...values.map(
                function (value) {
                    return Math.abs(
                        Number(value),
                    );
                },
            ),
            0,
        );

    if (largestValue === 0) {
        return 1;
    }

    const approximateStep =
        largestValue / 12;

    const magnitude =
        10 **
        Math.floor(
            Math.log10(
                approximateStep,
            ),
        );

    const normalizedStep =
        approximateStep /
        magnitude;

    let multiplier;

    if (normalizedStep <= 1) {
        multiplier = 1;
    } else if (normalizedStep <= 2) {
        multiplier = 2;
    } else if (normalizedStep <= 2.5) {
        multiplier = 2.5;
    } else if (normalizedStep <= 5) {
        multiplier = 5;
    } else {
        multiplier = 10;
    }

    return multiplier * magnitude;
}

/* ABREVIA NOMES LONGOS NOS GRÁFICOS */

function shortenChartLabel(
    label,
    maximumLength,) {
    const labelText =
        String(
            label ?? "",
        ).trim();

    if (
        labelText.length <=
        maximumLength
    ) {
        return labelText;
    }

    return (
        labelText.slice(
            0,
            maximumLength - 1,
        ) +
        "…"
    );
}

/* DEFINE O TAMANHO DOS NOMES NO EIXO */

function getChartAxisLabelLength(
    quantity,) {
    if (quantity >= 20) {
        return 14;
    }

    if (quantity >= 12) {
        return 18;
    }

    return 25;
}

/* MONTA OS EIXOS DOS GRÁFICOS */

function createChartScales(chartData) {
    const stepSize = getChartStepSize(chartData.values);

    const labelLength = getChartAxisLabelLength(
        chartData.labels.length,
    );

    return {
        x: {
            ticks: {
                color: "#e4e6eb",
                padding: 12,
                maxRotation: 45,
                minRotation: 0,

                callback(value) {
                    const fullLabel = this.getLabelForValue(value);

                    return shortenChartLabel(
                        fullLabel,
                        labelLength,
                    );
                },
            },

            grid: {
                color: "#292a2b",
                lineWidth: 1,
            },

            border: {
                color: "#8b8d91",
            },
        },

        y: {
            beginAtZero: true,
            grace: "5%",

            ticks: {
                color: "#e4e6eb",
                padding: 12,
                stepSize,

                callback(value) {
                    return formatAnalysisNumber(
                        Number(value),
                    );
                },
            },

            grid: {
                color: "#292a2b",
                lineWidth: 1,
            },

            border: {
                color: "#8b8d91",
            },
        },
    };
}

/* MONTA O GRÁFICO */

function renderChart() {
    if (!window.Chart || !tableState.rows.length) {
        destroyChart();
        setChartEmptyState(true);
        return;
    }

    const chartData = createGroupedChartData();

    if (!chartData || !chartData.labels.length) {
        destroyChart();
        setChartEmptyState(true);
        return;
    }

    destroyChart();

    const pieChart = chartState.type === "pie";

    chartState.instance = new window.Chart(chartCanvas, {
        type: chartState.type,
        data: {
            labels: chartData.labels,
            datasets: [createChartDataset(chartData)],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            locale: "pt-BR",
            layout: {
                padding: {
                    top: 10,
                    right: 20,
                    bottom: 20,
                    left: 20,
                },
            },
            plugins: {
                statisticsChartBackground: {
                    color: "#18191a",
                },
                legend: {
                    display: pieChart,
                    position: "bottom",
                    labels: {
                        color: "#e4e6eb",
                        padding: 15,
                        usePointStyle: true,
                        generateLabels:
                        createPieLegendLabels,
                        font: {
                            family: "'Open Sans', sans-serif",
                            size: 12,
                        },
                    },
                },
                title: {
                    display: true,
                    text: chartData.title,
                    color: "#e4e6eb",
                    font: {
                        family: "'Open Sans', sans-serif",
                        size: 16,
                        style: "normal",
                        weight: 600,
                        lineHeight: 1.3,
                    },
                    padding: {
                        top: 20,
                        bottom: 30,
                    },
                },
                tooltip: {
                    displayColors:
                        pieChart,

                    callbacks:
                        pieChart
                            ? {
                                label(context) {
                                    const values =
                                        context.dataset
                                            .data;

                                    const total =
                                        getChartDataTotal(
                                            values,
                                        );

                                    const value =
                                        Number(
                                            context.raw,
                                        ) || 0;

                                    const percentage =
                                        total > 0
                                            ? (
                                                    Math.abs(
                                                        value,
                                                    ) /
                                                    total
                                                ) *
                                                100
                                            : 0;

                                    return (
                                        `${context.label}: ` +
                                        `${formatAnalysisNumber(value)} ` +
                                        `(${formatChartPercentage(percentage)})`
                                    );
                                },
                            }
                            : {},
                },
            },
            scales:
                pieChart
                    ? undefined
                    : createChartScales(
                        chartData,
                    ),
        },
        plugins: [
            chartBackgroundPlugin,
            chartPercentagePlugin,
            chartValueLabelsPlugin,
        ],
    });

    setChartEmptyState(false);
    chartDownloadButton.disabled = false;
}

/* BAIXA O GRÁFICO COMO IMAGEM PNG */

function downloadChartImage() {
    if (!chartState.instance) {
        return;
    }

    const fileBaseName = createSafeFileBaseName(
        tableState.sourceFileName || "grafico",
    );

    const downloadLink = document.createElement("a");

    downloadLink.download = `${fileBaseName}-grafico.png`;

    downloadLink.href = chartState.instance.toBase64Image(
        "image/png",
        1,
    );

    document.body.appendChild(downloadLink);

    downloadLink.click();

    downloadLink.remove();
}

/* PREENCHE OS CAMPOS DE COLUNAS DO GRÁFICO */

function renderChartColumnSelectors() {
    const previousCategory = chartCategory.value;

    const previousValue = chartValue.value;

    const visibleColumnIndexes = getVisibleColumnIndexes().filter(
        function (columnIndex) {
            return tableState.columnProfiles[columnIndex].type !== "empty";
        },
    );

    const numericColumnIndexes = visibleColumnIndexes.filter(
        function (columnIndex) {
            return tableState.columnProfiles[columnIndex].type === "number";
        },
    );

    const categoryPlaceholder = document.createElement("option");

    categoryPlaceholder.value = "";

    categoryPlaceholder.textContent = "Selecione uma coluna";

    chartCategory.replaceChildren(categoryPlaceholder);

    visibleColumnIndexes.forEach(function (columnIndex) {
        chartCategory.appendChild(createChartColumnOption(columnIndex));
    });

    const valuePlaceholder = document.createElement("option");

    valuePlaceholder.value = "";

    valuePlaceholder.textContent = "Selecione uma coluna";

    chartValue.replaceChildren(valuePlaceholder);

    numericColumnIndexes.forEach(function (columnIndex) {
        chartValue.appendChild(createChartColumnOption(columnIndex));
    });

    const categoryStillVisible = visibleColumnIndexes.some(
        function (columnIndex) {
            return String(columnIndex) === previousCategory;
        },
    );

    const valueStillVisible = numericColumnIndexes.some(
        function (columnIndex) {
            return String(columnIndex) === previousValue;
        },
    );

    chartCategory.value = categoryStillVisible ? previousCategory : "";

    chartValue.value = valueStillVisible ? previousValue : "";

    chartCategory.disabled = visibleColumnIndexes.length === 0;

    updateChartSelect2(chartCategory);

    updateChartValueField();
}

/* MOSTRA O PAINEL DE GRÁFICOS */

function showChartPanel() {
    const filteredRows = getFilteredRows();

    const visibleColumnIndexes = getVisibleColumnIndexes();

    chartSummary.textContent = `Página: ${tableState.sheetName} / ${filteredRows.length} linhas - ${visibleColumnIndexes.length} colunas`;

    renderChartColumnSelectors();

    renderChart();

    chartPanel.hidden = false;
}

/* LIMPA E OCULTA O PAINEL DE GRÁFICOS */

function clearChartPanel() {

    destroyChart();
    
    setChartEmptyState(true);
    
    const categoryPlaceholder = document.createElement("option");

    const valuePlaceholder = document.createElement("option");

    categoryPlaceholder.value = "";

    categoryPlaceholder.textContent = "Selecione uma coluna";

    valuePlaceholder.value = "";

    valuePlaceholder.textContent = "Selecione uma coluna";

    chartCategory.replaceChildren(categoryPlaceholder);

    chartValue.replaceChildren(valuePlaceholder);

    chartCategory.disabled = true;

    chartValue.disabled = true;

    chartOperation.value = "count";

    chartSummary.textContent = "Nenhuma planilha carregada.";

    chartDownloadButton.disabled = true;

    updateChartSelect2(chartCategory);

    updateChartSelect2(chartValue);

    updateChartSelect2(chartOperation);

    chartPanel.hidden = true;
}