const MAX_FREQUENCY_ROWS = 25;

const MAX_CHART_ITEMS = 25;

const MAX_PIE_ITEMS = 10;

const SUPPORTED_EXTENSIONS = new Set(["xlsx", "xls", "csv"]);

/* LOCALIZA OS ELEMENTOS DO PAINEL */

const fileInput = document.getElementById("statisticsFileInput");

const clearButton = document.getElementById("statisticsClearFile");

const downloadCsvButton =
    document.getElementById(
        "statisticsDownloadCsv",
    );

const downloadXlsxButton =
    document.getElementById(
        "statisticsDownloadXlsx",
    );

const fileStatus = document.getElementById("statisticsFileStatus");

const preview = document.getElementById("statisticsLocalPreview");

const previewSummary = document.getElementById(
    "statisticsPreviewSummary",
);

const previewLimit = document.getElementById(
    "statisticsPreviewLimit",
);

const table = document.getElementById("statisticsLocalTable");

/* ELEMENTOS DO CONTROLE DE COLUNAS VISÍVEIS */

const visibleColumns = document.getElementById(
    "statisticsVisibleColumns",
);

const visibleColumnCount = document.getElementById(
    "statisticsVisibleColumnCount",
);

const showAllColumnsButton = document.getElementById(
    "statisticsShowAllColumns",
);

const hideAllColumnsButton = document.getElementById(
    "statisticsHideAllColumns",
);

const hideEmptyColumnsButton = document.getElementById(
    "statisticsHideEmptyColumns",
);

const quickAnalysis = document.getElementById(
    "statisticsQuickAnalysis",
);

const analysisColumns = document.getElementById(
    "statisticsAnalysisColumns",
);

const selectAllColumnsButton = document.getElementById(
    "statisticsSelectAllColumns",
);

const clearColumnsButton = document.getElementById(
    "statisticsClearColumns",
);

const totalRecords = document.getElementById(
    "statisticsTotalRecords",
);

const analysisCards = document.getElementById(
    "statisticsAnalysisCards",
);

const analysisResults = document.getElementById(
    "statisticsAnalysisResults",
);

const analysisEmpty = document.getElementById(
    "statisticsAnalysisEmpty",
);

const clearFiltersButton = document.getElementById(
    "statisticsClearFilters",
);

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
const statisticsPanel = document.getElementById("statistics");
const chartShowValues = document.getElementById("statisticsChartShowValues");

/* ESTADO DA TABELA INTERATIVA */

const tableState = {
    sourceFileName: "",

    sheetName: "",

    headers: [],

    rows: [],

    columnProfiles: [],

    visibleColumns: new Set(),

    analysisModes: new Map(),

    selectedAnalysisColumns: new Set(),

    filters: [],

    columnValueCounts: [],

    columnCount: 0,

    sortColumn: null,

    sortDirection: "asc",
};

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

const naturalCollator = new Intl.Collator("pt-BR", {
    numeric: true,

    sensitivity: "base",
});

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
                const barHeight = Math.abs(element.base - element.y);
                const positiveBar = element.y < element.base;
                const textInside = barHeight >= 28;

                if (textInside) {
                    textPosition = positiveBar ? element.y + 8 : element.y - 8;
                    context.textBaseline = positiveBar ? "top" : "bottom";
                } else {
                    textPosition = positiveBar ? element.y - 6 : element.y + 6;
                    context.textBaseline = positiveBar ? "bottom" : "top";
                }
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

/* CRIA O ESTADO INICIAL DE UM FILTRO */

function createEmptyColumnFilter() {
    return {
        text: "",

        occurrence: "all",

        numericOperator: "",

        numericValue: "",
    };
}

/* VERIFICA SE UM FILTRO ESTÁ ATIVO */

function isColumnFilterActive(filter) {
    const hasTextFilter =
        normalizeSearchValue(
            filter.text,
        ).trim().length > 0;

    const hasNumericFilter =
        filter.numericOperator !== "" &&
        parseNumericValue(
            filter.numericValue,
        ) !== null;

    return (
        hasTextFilter ||
        filter.occurrence !== "all" ||
        hasNumericFilter
    );
}

/* CONTA OS VALORES DE UMA COLUNA */

function createColumnValueCounts(columnIndex) {
    const valueCounts = new Map();

    tableState.rows.forEach(function (row) {
        const normalizedValue =
            normalizeSearchValue(
                row[columnIndex],
            ).trim();

        /*
         * Células vazias não são consideradas duplicadas.
         */

        if (!normalizedValue) {
            return;
        }

        const currentCount =
            valueCounts.get(
                normalizedValue,
            ) ?? 0;

        valueCounts.set(
            normalizedValue,
            currentCount + 1,
        );
    });

    return valueCounts;
}

/* CRIA UMA OPÇÃO DO FILTRO NUMÉRICO */

function createFilterOption(
    value,
    label,
) {
    const option =
        document.createElement("option");

    option.value = value;

    option.textContent = label;

    return option;
}

/* APLICA UMA COMPARAÇÃO NUMÉRICA */

function matchesNumericFilter(
    cellValue,
    operator,
    comparisonValue,
) {
    const numericCellValue =
        parseNumericValue(cellValue);

    if (numericCellValue === null) {
        return false;
    }

    switch (operator) {
        case "greaterThan":
            return (
                numericCellValue >
                comparisonValue
            );

        case "greaterThanOrEqual":
            return (
                numericCellValue >=
                comparisonValue
            );

        case "lessThan":
            return (
                numericCellValue <
                comparisonValue
            );

        case "lessThanOrEqual":
            return (
                numericCellValue <=
                comparisonValue
            );

        case "equal":
            return (
                numericCellValue ===
                comparisonValue
            );

        case "notEqual":
            return (
                numericCellValue !==
                comparisonValue
            );

        default:
            return true;
    }
}

/* ATUALIZA A MENSAGEM DO IMPORTADOR */

function setStatus(
    message,
    isError = false,
) {
    fileStatus.textContent = message;

    fileStatus.classList.toggle(
        "is-error",
        isError,
    );
}

/* ATUALIZA O ESTADO DOS BOTÕES DE DOWNLOAD */

function setDownloadButtonsDisabled(
    disabled,
) {
    downloadCsvButton.disabled =
        disabled;

    downloadXlsxButton.disabled =
        disabled;
}

/* VERIFICA A EXTENSÃO DO ARQUIVO */

function isSupportedFile(file) {
    const extension =
        file.name
            .split(".")
            .pop()
            ?.toLowerCase();

    return SUPPORTED_EXTENSIONS.has(
        extension,
    );
}

/* PREPARA O VALOR PARA EXIBIÇÃO */

function formatCellValue(value) {
    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value);
}

/* CRIA UMA CÉLULA */

function createCell(tagName, value) {
    const cell =
        document.createElement(tagName);

    cell.textContent =
        formatCellValue(value);

    return cell;
}

/* NORMALIZA UM VALOR PARA PESQUISA */

function normalizeSearchValue(value) {
    return formatCellValue(value)
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            "",
        )
        .toLowerCase();
}

/* AGRUPA OS VALORES DE UMA COLUNA */

function createFrequencyData(
    rows,
    columnIndex,
) {
    if (columnIndex < 0) {
        return [];
    }

    const groups = new Map();

    rows.forEach(function (row) {
        const displayValue =
            formatCellValue(
                row[columnIndex],
            ).trim();

        if (!displayValue) {
            return;
        }

        const normalizedValue =
            normalizeSearchValue(
                displayValue,
            ).trim();

        if (
            groups.has(
                normalizedValue,
            )
        ) {
            groups.get(
                normalizedValue,
            ).count += 1;

            return;
        }

        groups.set(
            normalizedValue,
            {
                label: displayValue,

                count: 1,
            },
        );
    });

    return Array.from(
        groups.values(),
    ).sort(
        function (
            firstGroup,
            secondGroup,
        ) {
            return (
                secondGroup.count -
                    firstGroup.count ||
                naturalCollator.compare(
                    firstGroup.label,
                    secondGroup.label,
                )
            );
        },
    );
}

/* MONTA UMA TABELA DE AGRUPAMENTO */

function renderFrequencyTable(
    tableBody,
    frequencyData,
    emptyMessage,
    totalOccurrences,
) {
    tableBody.replaceChildren();

    if (
        frequencyData.length === 0
    ) {
        const row =
            document.createElement("tr");

        const cell = createCell(
            "td",
            emptyMessage,
        );

        cell.colSpan = 3;

        cell.classList.add(
            "statistics-summary-empty",
        );

        row.appendChild(cell);

        tableBody.appendChild(row);

        return;
    }

    const fragment =
        document.createDocumentFragment();

    frequencyData.forEach(
        function (group) {
            const row =
                document.createElement(
                    "tr",
                );

            const valueCell =
                createCell(
                    "td",
                    group.label,
                );

            const quantityCell =
                createCell(
                    "td",
                    group.count,
                );

            const percentageCell =
                createCell(
                    "td",
                    formatAnalysisPercentage(
                        group.count,
                        totalOccurrences,
                    ),
                );

            quantityCell.classList.add(
                "statistics-summary-number",
            );

            percentageCell.classList.add(
                "statistics-summary-number",
            );

            row.append(
                valueCell,
                quantityCell,
                percentageCell,
            );

            fragment.appendChild(row);
        },
    );

    tableBody.appendChild(fragment);
}

/* VERIFICA SE UMA CÉLULA ESTÁ VAZIA */

function isEmptyCell(value) {
    return (
        formatCellValue(
            value,
        ).trim() === ""
    );
}

/* CONVERTE UM VALOR NUMÉRICO */

function parseNumericValue(value) {
    if (
        typeof value === "number" &&
        Number.isFinite(value)
    ) {
        return value;
    }

    if (
        value instanceof Date ||
        isEmptyCell(value)
    ) {
        return null;
    }

    let normalizedValue =
        formatCellValue(value)
            .trim()
            .replace(
                /\s|\u00a0/g,
                "",
            )
            .replace(
                /^R\$/i,
                "",
            )
            .replace(
                /%$/,
                "",
            );

    if (
        !/^[+-]?\d[\d.,]*$/.test(
            normalizedValue,
        )
    ) {
        return null;
    }

    const lastComma =
        normalizedValue.lastIndexOf(
            ",",
        );

    const lastDot =
        normalizedValue.lastIndexOf(
            ".",
        );

    if (
        lastComma >= 0 &&
        lastDot >= 0
    ) {
        const decimalSeparator =
            lastComma > lastDot
                ? ","
                : ".";

        const thousandsSeparator =
            decimalSeparator === ","
                ? "."
                : ",";

        normalizedValue =
            normalizedValue
                .replaceAll(
                    thousandsSeparator,
                    "",
                )
                .replace(
                    decimalSeparator,
                    ".",
                );
    } else if (lastComma >= 0) {
        normalizedValue =
            normalizedValue
                .replaceAll(".", "")
                .replace(",", ".");
    } else {
        normalizedValue =
            normalizedValue.replaceAll(
                ",",
                "",
            );
    }

    const numericValue =
        Number(normalizedValue);

    return Number.isFinite(
        numericValue,
    )
        ? numericValue
        : null;
}

/* CONVERTE UMA DATA OU DATA/HORA */

function parseDateValue(value) {
    if (
        value instanceof Date &&
        !Number.isNaN(
            value.getTime(),
        )
    ) {
        return value;
    }

    const displayValue =
        formatCellValue(
            value,
        ).trim();

    if (!displayValue) {
        return null;
    }

    const dateMatch =
        displayValue.match(
            /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
        ) ||
        displayValue.match(
            /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
        );

    if (!dateMatch) {
        return null;
    }

    const startsWithYear =
        dateMatch[1].length === 4;

    let year = Number(
        startsWithYear
            ? dateMatch[1]
            : dateMatch[3],
    );

    if (year < 100) {
        year +=
            year >= 70
                ? 1900
                : 2000;
    }

    const month =
        Number(dateMatch[2]);

    const day = Number(
        startsWithYear
            ? dateMatch[3]
            : dateMatch[1],
    );

    const hour =
        Number(dateMatch[4] ?? 0);

    const minute =
        Number(dateMatch[5] ?? 0);

    const second =
        Number(dateMatch[6] ?? 0);

    const parsedDate = new Date(
        year,
        month - 1,
        day,
        hour,
        minute,
        second,
    );

    if (
        parsedDate.getFullYear() !==
            year ||
        parsedDate.getMonth() !==
            month - 1 ||
        parsedDate.getDate() !==
            day ||
        parsedDate.getHours() !==
            hour ||
        parsedDate.getMinutes() !==
            minute ||
        parsedDate.getSeconds() !==
            second
    ) {
        return null;
    }

    return parsedDate;
}

/* RETORNA O NOME VISÍVEL DO TIPO */

function getColumnTypeLabel(type) {
    const labels = {
        category: "Categoria",

        identifier: "Identificador",

        number: "Número",

        datetime: "Data/hora",

        empty: "Vazia",
    };

    return (
        labels[type] ??
        "Texto"
    );
}

/* RETORNA OS MODOS COMPATÍVEIS COM A COLUNA */

function getAvailableAnalysisModes(
    detectedType,
) {
    const modesByType = {
        category: [
            "category",
            "identifier",
        ],

        identifier: [
            "identifier",
            "category",
        ],

        number: [
            "number",
            "category",
            "identifier",
        ],

        datetime: [
            "datetime",
            "category",
        ],

        empty: ["empty"],
    };

    return (
        modesByType[
            detectedType
        ] ?? ["category"]
    );
}

/* DETECTA O TIPO DE UMA COLUNA */

function detectColumnProfile(
    columnIndex,
) {
    const filledValues =
        tableState.rows
            .map(function (row) {
                return row[
                    columnIndex
                ];
            })
            .filter(
                function (value) {
                    return !isEmptyCell(
                        value,
                    );
                },
            );

    if (
        filledValues.length === 0
    ) {
        return {
            type: "empty",

            hasTime: false,
        };
    }

    const dateValues =
        filledValues.filter(
            function (value) {
                return (
                    parseDateValue(
                        value,
                    ) !== null
                );
            },
        );

    const numericValues =
        filledValues.filter(
            function (value) {
                return (
                    parseNumericValue(
                        value,
                    ) !== null
                );
            },
        );

    const uniqueValues =
        new Set(
            filledValues.map(
                function (value) {
                    return normalizeSearchValue(
                        value,
                    ).trim();
                },
            ),
        );

    const uniqueRatio =
        uniqueValues.size /
        filledValues.length;

    const headerValue =
        normalizeSearchValue(
            tableState.headers[
                columnIndex
            ],
        ).trim();

    /* VERIFICA SE O NOME INDICA UM IDENTIFICADOR */

    const identifierHeader =
        /(^|[\s_-])(id|codigo|code|uuid|chave|key|referencia|reference|pacotes?|packages?|pedidos?|orders?)([\s_-]|$)/.test(
            headerValue,
        ) ||
        /(^|[\s_-])(tracking|serial)(?:[\s_-]+number)?([\s_-]|$)/.test(
            headerValue,
        ) ||
        headerValue === "at/to";

    /* VERIFICA SE OS VALORES PARECEM CÓDIGOS */

    const identifierLikeValues =
        filledValues.filter(
            function (value) {
                const textValue =
                    formatCellValue(
                        value,
                    ).trim();

                return (
                    textValue.length >=
                        6 &&
                    !/\s/.test(
                        textValue,
                    ) &&
                    /[a-z]/i.test(
                        textValue,
                    ) &&
                    /\d/.test(
                        textValue,
                    )
                );
            },
        );

    const identifierValueRatio =
        identifierLikeValues.length /
        filledValues.length;

    const isLikelyIdentifier =
        identifierHeader ||
        identifierValueRatio >= 0.8;

    if (
        dateValues.length /
            filledValues.length >=
        0.8
    ) {
        return {
            type: "datetime",

            hasTime:
                filledValues.some(
                    function (value) {
                        return /\d{1,2}:\d{2}/.test(
                            formatCellValue(
                                value,
                            ),
                        );
                    },
                ),
        };
    }

    if (
        numericValues.length /
            filledValues.length >=
        0.8
    ) {
        return {
            type:
                isLikelyIdentifier &&
                uniqueRatio >= 0.8
                    ? "identifier"
                    : "number",

            hasTime: false,
        };
    }

    return {
        type:
            uniqueRatio >= 0.8 &&
            isLikelyIdentifier
                ? "identifier"
                : "category",

        hasTime: false,
    };
}

/* FORMATA UM NÚMERO DA ANÁLISE */

function formatAnalysisNumber(value) {
    if (
        !Number.isFinite(value)
    ) {
        return "—";
    }

    return new Intl.NumberFormat(
        "pt-BR",
        {
            maximumFractionDigits: 2,
        },
    ).format(value);
}

/* FORMATA UM PERCENTUAL DA ANÁLISE */

function formatAnalysisPercentage(
    quantity,
    total,
) {
    if (
        !Number.isFinite(
            quantity,
        ) ||
        !Number.isFinite(
            total,
        ) ||
        total <= 0
    ) {
        return "0,0%";
    }

    return new Intl.NumberFormat(
        "pt-BR",
        {
            style: "percent",

            minimumFractionDigits: 1,

            maximumFractionDigits: 1,
        },
    ).format(
        quantity / total,
    );
}

/* FORMATA UMA DATA DA ANÁLISE */

function formatAnalysisDate(
    value,
    hasTime,
) {
    if (
        !(value instanceof Date)
    ) {
        return "—";
    }

    return new Intl.DateTimeFormat(
        "pt-BR",

        hasTime
            ? {
                  dateStyle: "short",

                  timeStyle: "medium",
              }
            : {
                  dateStyle: "short",
              },
    ).format(value);
}

/* CRIA UM CARTÃO DA ANÁLISE */

function createAnalysisCard(
    title,
    columnName,
    value,
) {
    const card =
        document.createElement("div");

    const cardTitle =
        document.createElement("span");

    const cardSource =
        document.createElement("span");

    const cardValue =
        document.createElement("strong");

    card.classList.add(
        "statistics-summary-card",
    );

    cardTitle.classList.add(
        "statistics-summary-card-title",
    );

    cardSource.classList.add(
        "statistics-summary-card-source",
    );

    cardTitle.textContent = title;

    cardSource.textContent =
        `De: ${columnName}`;

    cardValue.textContent = value;

    card.append(
        cardTitle,
        cardSource,
        cardValue,
    );

    return card;
}

/* CRIA UM BLOCO DA ANÁLISE */

function createAnalysisBlock(title) {
    const block =
        document.createElement("div");

    const heading =
        document.createElement("h4");

    block.classList.add(
        "statistics-summary-block",
    );

    heading.textContent = title;

    block.appendChild(heading);

    return block;
}

/* ADICIONA MÉTRICAS A UM BLOCO */

function appendAnalysisMetrics(
    block,
    metrics,
) {
    const metricsContainer =
        document.createElement("div");

    metricsContainer.classList.add(
        "statistics-analysis-metrics",
    );

    metrics.forEach(
        function (metric) {
            const metricElement =
                document.createElement(
                    "div",
                );

            const metricLabel =
                document.createElement(
                    "span",
                );

            const metricValue =
                document.createElement(
                    "strong",
                );

            metricElement.classList.add(
                "statistics-analysis-metric",
            );

            metricLabel.textContent =
                metric.label;

            metricValue.textContent =
                metric.value;

            metricValue.title =
                metric.value;

            metricElement.append(
                metricLabel,
                metricValue,
            );

            metricsContainer.appendChild(
                metricElement,
            );
        },
    );

    block.appendChild(
        metricsContainer,
    );
}

/* ADICIONA UMA TABELA DE FREQUÊNCIA A UM BLOCO */

function appendFrequencyAnalysis(
    block,
    frequencyData,
    emptyMessage,
    totalOccurrences,
) {
    const frequencyTable =
        document.createElement(
            "table",
        );

    const tableHead =
        document.createElement(
            "thead",
        );

    const headerRow =
        document.createElement(
            "tr",
        );

    const tableBody =
        document.createElement(
            "tbody",
        );

    const valueHeader =
        createCell(
            "th",
            "Valores da Coluna",
        );

    const quantityHeader =
        createCell(
            "th",
            "Quantidade",
        );

    const percentageHeader =
        createCell(
            "th",
            "Percentual",
        );

    frequencyTable.classList.add(
        "statistics-summary-table",
    );

    quantityHeader.classList.add(
        "statistics-summary-number",
    );

    percentageHeader.classList.add(
        "statistics-summary-number",
    );

    headerRow.append(
        valueHeader,
        quantityHeader,
        percentageHeader,
    );

    tableHead.appendChild(
        headerRow,
    );

    frequencyTable.append(
        tableHead,
        tableBody,
    );

    const percentageBase =
        Number.isFinite(
            totalOccurrences,
        )
            ? totalOccurrences
            : frequencyData.reduce(
                  function (
                      total,
                      group,
                  ) {
                      return (
                          total +
                          group.count
                      );
                  },
                  0,
              );

    renderFrequencyTable(
        tableBody,
        frequencyData.slice(
            0,
            MAX_FREQUENCY_ROWS,
        ),
        emptyMessage,
        percentageBase,
    );

    block.appendChild(
        frequencyTable,
    );

    if (
        frequencyData.length >
        MAX_FREQUENCY_ROWS
    ) {
        const note =
            document.createElement(
                "p",
            );

        note.classList.add(
            "statistics-analysis-note",
        );

        note.textContent =
            `Exibindo ${MAX_FREQUENCY_ROWS} de ${frequencyData.length} valores.`;

        block.appendChild(note);
    }
}

/* RETORNA OS ÍNDICES DAS COLUNAS VISÍVEIS */

function getVisibleColumnIndexes() {
    return Array.from(
        tableState.visibleColumns,
    )
        .filter(
            function (
                columnIndex,
            ) {
                return (
                    columnIndex >= 0 &&
                    columnIndex <
                        tableState.columnCount
                );
            },
        )
        .sort(
            function (
                firstColumn,
                secondColumn,
            ) {
                return (
                    firstColumn -
                    secondColumn
                );
            },
        );
}

/* MONTA OS CHECKBOXES DAS COLUNAS VISÍVEIS */

function renderVisibleColumnSelector() {
    visibleColumns.replaceChildren();

    const fragment =
        document.createDocumentFragment();

    const visibleColumnIndexes =
        getVisibleColumnIndexes();

    /* ATUALIZA O CONTADOR */

    visibleColumnCount.textContent =
        `${visibleColumnIndexes.length} de ${tableState.columnCount}`;

    /* ATUALIZA OS BOTÕES */

    showAllColumnsButton.disabled =
        tableState.columnCount === 0 ||
        visibleColumnIndexes.length ===
            tableState.columnCount;

    hideAllColumnsButton.disabled =
        visibleColumnIndexes.length ===
        0;

    hideEmptyColumnsButton.disabled =
        !tableState.columnProfiles.some(
            function (
                profile,
                columnIndex,
            ) {
                return (
                    profile.type ===
                        "empty" &&
                    tableState.visibleColumns.has(
                        columnIndex,
                    )
                );
            },
        );

    /* CRIA UM CHECKBOX PARA CADA COLUNA */

    tableState.headers.forEach(
        function (
            header,
            columnIndex,
        ) {
            const option =
                document.createElement(
                    "div",
                );

            const label =
                document.createElement(
                    "label",
                );

            const checkbox =
                document.createElement(
                    "input",
                );

            const columnName =
                document.createElement(
                    "span",
                );

            const profile =
                tableState.columnProfiles[
                    columnIndex
                ];

            option.classList.add(
                "statistics-visible-column-option",
            );

            option.classList.toggle(
                "is-empty",
                profile.type === "empty",
            );

            checkbox.type =
                "checkbox";

            checkbox.checked =
                tableState.visibleColumns.has(
                    columnIndex,
                );

            checkbox.setAttribute(
                "aria-label",
                `Exibir coluna ${header}`,
            );

            checkbox.addEventListener(
                "change",
                function () {
                    if (
                        checkbox.checked
                    ) {
                        tableState.visibleColumns.add(
                            columnIndex,
                        );
                    } else {
                        tableState.visibleColumns.delete(
                            columnIndex,
                        );
                    }

                    refreshVisibleColumns();
                },
            );

            columnName.classList.add(
                "statistics-visible-column-name",
            );

            columnName.textContent =
                header;

            columnName.title =
                profile.type === "empty"
                    ? `${header} — coluna vazia`
                    : header;

            label.append(
                checkbox,
                columnName,
            );

            option.appendChild(label);

            fragment.appendChild(
                option,
            );
        },
    );

    visibleColumns.appendChild(
        fragment,
    );
}

/* ATUALIZA A INTERFACE APÓS MUDAR A VISIBILIDADE */

function refreshVisibleColumns() {
    tableState.headers.forEach(
        function (
            unusedHeader,
            columnIndex,
        ) {
            const isVisible =
                tableState.visibleColumns.has(
                    columnIndex,
                );

            if (isVisible) {
                return;
            }

            /*
             * Remove filtros de colunas ocultadas.
             * Isso impede filtros invisíveis.
             */

            tableState.filters[
                columnIndex
            ] =
                createEmptyColumnFilter();

            /*
             * Remove a coluna da análise.
             */

            tableState.selectedAnalysisColumns.delete(
                columnIndex,
            );
        },
    );

    /*
     * Cancela a ordenação se a coluna
     * usada para ordenar foi ocultada.
     */

    if (
        tableState.sortColumn !==
            null &&
        !tableState.visibleColumns.has(
            tableState.sortColumn,
        )
    ) {
        tableState.sortColumn =
            null;

        tableState.sortDirection =
            "asc";
    }

    renderVisibleColumnSelector();

    renderAnalysisColumnSelector();

    renderTableHeader();

    renderTableBody();

    showChartPanel();
}

/* MONTA OS CHECKBOXES E MODOS DAS COLUNAS PARA ANÁLISE */

function renderAnalysisColumnSelector() {
    analysisColumns.replaceChildren();

    const fragment =
        document.createDocumentFragment();

    tableState.headers.forEach(
        function (
            header,
            columnIndex,
        ) {
            if (
                !tableState.visibleColumns.has(
                    columnIndex,
                )
            ) {
                return;
            }

            const option =
                document.createElement(
                    "div",
                );

            const label =
                document.createElement(
                    "label",
                );

            const checkbox =
                document.createElement(
                    "input",
                );

            const columnName =
                document.createElement(
                    "span",
                );

            const columnModes =
                document.createElement(
                    "div",
                );

            const profile =
                tableState.columnProfiles[
                    columnIndex
                ];

            const availableModes =
                getAvailableAnalysisModes(
                    profile.type,
                );

            const selectedMode =
                tableState.analysisModes.get(
                    columnIndex,
                ) ?? profile.type;

            option.classList.add(
                "statistics-column-option",
            );

            checkbox.type =
                "checkbox";

            checkbox.checked =
                tableState.selectedAnalysisColumns.has(
                    columnIndex,
                );

            checkbox.setAttribute(
                "aria-label",
                `Analisar coluna ${header}`,
            );

            checkbox.addEventListener(
                "change",
                function () {
                    if (
                        checkbox.checked
                    ) {
                        tableState.selectedAnalysisColumns.add(
                            columnIndex,
                        );
                    } else {
                        tableState.selectedAnalysisColumns.delete(
                            columnIndex,
                        );
                    }

                    renderQuickAnalysis(
                        getFilteredRows(),
                    );
                },
            );

            columnName.classList.add(
                "statistics-column-name",
            );

            columnName.textContent =
                header;

            columnName.title =
                header;

            columnModes.classList.add(
                "statistics-column-modes",
            );

            label.append(
                checkbox,
                columnName,
            );

            availableModes.forEach(
                function (mode) {
                    const modeButton =
                        document.createElement(
                            "button",
                        );

                    const isActive =
                        selectedMode ===
                        mode;

                    modeButton.type =
                        "button";

                    modeButton.classList.add(
                        "statistics-analysis-mode-button",
                    );

                    modeButton.classList.toggle(
                        "is-active",
                        isActive,
                    );

                    modeButton.textContent =
                        getColumnTypeLabel(
                            mode,
                        );

                    modeButton.setAttribute(
                        "aria-pressed",
                        String(isActive),
                    );

                    modeButton.setAttribute(
                        "aria-label",
                        `Analisar ${header} como ${getColumnTypeLabel(mode)}`,
                    );

                    modeButton.disabled =
                        mode === "empty";

                    modeButton.addEventListener(
                        "click",
                        function () {
                            tableState.analysisModes.set(
                                columnIndex,
                                mode,
                            );

                            renderAnalysisColumnSelector();

                            renderQuickAnalysis(
                                getFilteredRows(),
                            );
                        },
                    );

                    columnModes.appendChild(
                        modeButton,
                    );
                },
            );

            option.append(
                label,
                columnModes,
            );

            fragment.appendChild(
                option,
            );
        },
    );

    analysisColumns.appendChild(
        fragment,
    );

    const hasColumns =
        getVisibleColumnIndexes()
            .length > 0;

    selectAllColumnsButton.disabled =
        !hasColumns;

    clearColumnsButton.disabled =
        !hasColumns;
}

/* ANALISA UMA COLUNA SELECIONADA */

function renderSelectedColumnAnalysis(
    rows,
    columnIndex,
) {
    const header =
        tableState.headers[
            columnIndex
        ];

    const profile =
        tableState.columnProfiles[
            columnIndex
        ];

    const analysisMode =
        tableState.analysisModes.get(
            columnIndex,
        ) ?? profile.type;

    const filledValues = rows
        .map(function (row) {
            return row[columnIndex];
        })
        .filter(
            function (value) {
                return !isEmptyCell(
                    value,
                );
            },
        );

    const emptyCount =
        rows.length -
        filledValues.length;

    const block =
        createAnalysisBlock(
            header,
        );

    if (analysisMode === "number") {
        const numericValues =
            filledValues
                .map(
                    parseNumericValue,
                )
                .filter(
                    function (value) {
                        return (
                            value !==
                            null
                        );
                    },
                );

        const total =
            numericValues.reduce(
                function (
                    sum,
                    value,
                ) {
                    return (
                        sum + value
                    );
                },
                0,
            );

        const average =
            numericValues.length > 0
                ? total /
                  numericValues.length
                : NaN;

        let minimum = NaN;

        let maximum = NaN;

        numericValues.forEach(
            function (value) {
                minimum =
                    Number.isNaN(
                        minimum,
                    )
                        ? value
                        : Math.min(
                              minimum,
                              value,
                          );

                maximum =
                    Number.isNaN(
                        maximum,
                    )
                        ? value
                        : Math.max(
                              maximum,
                              value,
                          );
            },
        );

        analysisCards.appendChild(
            createAnalysisCard(
                "Total da Coluna",
                header,
                formatAnalysisNumber(
                    total,
                ),
            ),
        );

        appendAnalysisMetrics(
            block,
            [
                {
                    label: "Total",

                    value:
                        formatAnalysisNumber(
                            total,
                        ),
                },
                {
                    label: "Média",

                    value:
                        formatAnalysisNumber(
                            average,
                        ),
                },
                {
                    label:
                        "Menor valor",

                    value:
                        formatAnalysisNumber(
                            minimum,
                        ),
                },
                {
                    label:
                        "Maior valor",

                    value:
                        formatAnalysisNumber(
                            maximum,
                        ),
                },
                {
                    label:
                        "Valores válidos",

                    value:
                        formatAnalysisNumber(
                            numericValues.length,
                        ),
                },
                {
                    label:
                        "Células vazias",

                    value:
                        formatAnalysisNumber(
                            emptyCount,
                        ),
                },
            ],
        );
    } else if (
        analysisMode === "datetime"
    ) {
        const dateValues =
            filledValues
                .map(parseDateValue)
                .filter(
                    function (value) {
                        return (
                            value !==
                            null
                        );
                    },
                );

        const firstDate =
            dateValues.reduce(
                function (
                    earliestDate,
                    currentDate,
                ) {
                    return (
                        !earliestDate ||
                        currentDate <
                            earliestDate
                            ? currentDate
                            : earliestDate
                    );
                },
                null,
            );

        const lastDate =
            dateValues.reduce(
                function (
                    latestDate,
                    currentDate,
                ) {
                    return (
                        !latestDate ||
                        currentDate >
                            latestDate
                            ? currentDate
                            : latestDate
                    );
                },
                null,
            );

        analysisCards.appendChild(
            createAnalysisCard(
                "Datas Válidas",
                header,
                formatAnalysisNumber(
                    dateValues.length,
                ),
            ),
        );

        appendAnalysisMetrics(
            block,
            [
                {
                    label:
                        "Data inicial",

                    value:
                        formatAnalysisDate(
                            firstDate,
                            profile.hasTime,
                        ),
                },
                {
                    label:
                        "Data final",

                    value:
                        formatAnalysisDate(
                            lastDate,
                            profile.hasTime,
                        ),
                },
                {
                    label:
                        "Valores válidos",

                    value:
                        formatAnalysisNumber(
                            dateValues.length,
                        ),
                },
                {
                    label:
                        "Células vazias",

                    value:
                        formatAnalysisNumber(
                            emptyCount,
                        ),
                },
            ],
        );
    } else if (
        analysisMode ===
            "category" ||
        analysisMode ===
            "identifier"
    ) {
        const frequencyData =
            createFrequencyData(
                rows,
                columnIndex,
            );

        const duplicateCount =
            filledValues.length -
            frequencyData.length;

        analysisCards.appendChild(
            createAnalysisCard(
                "Valores Únicos",
                header,
                formatAnalysisNumber(
                    frequencyData.length,
                ),
            ),
        );

        if (
            analysisMode ===
            "identifier"
        ) {
            appendAnalysisMetrics(
                block,
                [
                    {
                        label:
                            "Valores Preenchidos",

                        value:
                            formatAnalysisNumber(
                                filledValues.length,
                            ),
                    },
                    {
                        label:
                            "Valores únicos",

                        value:
                            formatAnalysisNumber(
                                frequencyData.length,
                            ),
                    },
                    {
                        label:
                            "Duplicidades na Coluna",

                        value:
                            formatAnalysisNumber(
                                duplicateCount,
                            ),
                    },
                    {
                        label:
                            "Células vazias",

                        value:
                            formatAnalysisNumber(
                                emptyCount,
                            ),
                    },
                ],
            );

            const duplicatedValues =
                frequencyData.filter(
                    function (
                        group,
                    ) {
                        return (
                            group.count >
                            1
                        );
                    },
                );

            if (
                duplicatedValues.length >
                0
            ) {
                appendFrequencyAnalysis(
                    block,
                    duplicatedValues,
                    "Nenhum valor repetido.",
                );
            }
        } else {
            appendFrequencyAnalysis(
                block,
                frequencyData,
                "Nenhum valor preenchido.",
            );
        }
    } else {
        analysisCards.appendChild(
            createAnalysisCard(
                "Valores Preenchidos",
                header,
                "0",
            ),
        );

        appendAnalysisMetrics(
            block,
            [
                {
                    label:
                        "Valores preenchidos",

                    value: "0",
                },
                {
                    label:
                        "Células vazias",

                    value:
                        formatAnalysisNumber(
                            rows.length,
                        ),
                },
            ],
        );
    }

    analysisResults.appendChild(
        block,
    );
}

/* ATUALIZA A ANÁLISE RÁPIDA */

function renderQuickAnalysis(rows) {
    totalRecords.textContent =
        formatAnalysisNumber(
            rows.length,
        );

    analysisCards.replaceChildren();

    analysisResults.replaceChildren();

    const selectedColumns =
        Array.from(
            tableState.selectedAnalysisColumns,
        )
            .filter(
                function (
                    columnIndex,
                ) {
                    return tableState.visibleColumns.has(
                        columnIndex,
                    );
                },
            )
            .sort(
                function (
                    firstColumn,
                    secondColumn,
                ) {
                    return (
                        firstColumn -
                        secondColumn
                    );
                },
            );

    analysisEmpty.hidden =
        selectedColumns.length > 0;

    selectedColumns.forEach(
        function (columnIndex) {
            renderSelectedColumnAnalysis(
                rows,
                columnIndex,
            );
        },
    );

    quickAnalysis.hidden =
        false;
}

/* RETORNA O ÍCONE DA ORDENAÇÃO */

function getSortIndicator(
    columnIndex,
) {
    if (
        tableState.sortColumn !==
        columnIndex
    ) {
        return "↕";
    }

    return tableState.sortDirection ===
        "asc"
        ? "↑"
        : "↓";
}

/* ALTERA A ORDENAÇÃO */

function changeSort(columnIndex) {
    if (
        tableState.sortColumn ===
        columnIndex
    ) {
        tableState.sortDirection =
            tableState.sortDirection ===
            "asc"
                ? "desc"
                : "asc";
    } else {
        tableState.sortColumn =
            columnIndex;

        tableState.sortDirection =
            "asc";
    }

    renderTableHeader();

    renderTableBody();
}

/* MONTA OS CABEÇALHOS E FILTROS */

function renderTableHeader() {
    const tableHead =
        table.querySelector("thead");

    const headerRow =
        document.createElement("tr");

    const filterRow =
        document.createElement("tr");

    const visibleColumnIndexes =
        getVisibleColumnIndexes();

    filterRow.classList.add(
        "statistics-filter-row",
    );

    if (
        typeof window.destroySelect2Fields ===
        "function"
    ) {
        window.destroySelect2Fields(
            tableHead,
        );
    }

    tableHead.replaceChildren();

    for (
        const columnIndex
        of visibleColumnIndexes
    ) {
        const headerCell =
            document.createElement(
                "th",
            );

        const sortButton =
            document.createElement(
                "button",
            );

        const sortIndicator =
            document.createElement(
                "span",
            );

        const filterCell =
            document.createElement(
                "th",
            );

        const filterControls =
            document.createElement(
                "div",
            );

        const advancedFilters =
            document.createElement(
                "div",
            );

        const filterInput =
            document.createElement(
                "input",
            );

        const headerValue =
            tableState.headers[
                columnIndex
            ];

        const columnProfile =
            tableState.columnProfiles[
                columnIndex
            ];

        const columnFilter =
            tableState.filters[
                columnIndex
            ];

        /* ORDENAÇÃO */

        sortButton.type =
            "button";

        sortButton.classList.add(
            "statistics-sort-button",
        );

        sortButton.setAttribute(
            "aria-label",
            `Ordenar pela coluna ${headerValue}`,
        );

        sortButton.append(
            document.createTextNode(
                headerValue,
            ),
        );

        sortIndicator.classList.add(
            "statistics-sort-indicator",
        );

        sortIndicator.textContent =
            getSortIndicator(
                columnIndex,
            );

        sortButton.appendChild(
            sortIndicator,
        );

        sortButton.addEventListener(
            "click",
            function () {
                changeSort(
                    columnIndex,
                );
            },
        );

        headerCell.appendChild(
            sortButton,
        );

        headerRow.appendChild(
            headerCell,
        );

        /* CONTAINER DOS FILTROS */

        filterControls.classList.add(
            "statistics-column-filter-controls",
        );

        advancedFilters.classList.add(
            "statistics-advanced-filters",
        );

        /* FILTRO POR TEXTO */

        filterInput.type =
            "search";

        filterInput.classList.add(
            "statistics-column-filter",
        );

        filterInput.placeholder =
            "Filtrar...";

        filterInput.value =
            columnFilter.text;

        filterInput.setAttribute(
            "aria-label",
            `Filtrar coluna ${headerValue}`,
        );

        filterInput.addEventListener(
            "input",
            function () {
                columnFilter.text =
                    filterInput.value;

                renderTableBody();
            },
        );

        filterControls.appendChild(
            filterInput,
        );

        /* FILTRO POR FREQUÊNCIA */

        if (
            columnProfile.type !==
            "empty"
        ) {
            const occurrenceFilter =
                document.createElement(
                    "select",
                );

            occurrenceFilter.classList.add(
                "statistics-occurrence-filter",
                "standard-select",
            );

            occurrenceFilter.append(
                createFilterOption(
                    "all",
                    "Todos os valores",
                ),

                createFilterOption(
                    "duplicates",
                    "Somente duplicados",
                ),

                createFilterOption(
                    "unique",
                    "Somente únicos",
                ),

                createFilterOption(
                    "empty",
                    "Somente células vazias",
                ),
            );

            occurrenceFilter.value =
                columnFilter.occurrence;

            occurrenceFilter.setAttribute(
                "aria-label",
                `Filtrar valores duplicados, únicos ou vazios da coluna ${headerValue}`,
            );

            const updateOccurrenceFilter =
                function () {
                    columnFilter.occurrence =
                        occurrenceFilter.value;

                    renderTableBody();
                };

            if (
                window.jQuery &&
                typeof window.jQuery
                    .fn.select2 ===
                    "function"
            ) {
                window
                    .jQuery(
                        occurrenceFilter,
                    )
                    .on(
                        "change.statisticsOccurrenceFilter",
                        updateOccurrenceFilter,
                    );
            } else {
                occurrenceFilter.addEventListener(
                    "change",
                    updateOccurrenceFilter,
                );
            }

            advancedFilters.appendChild(
                occurrenceFilter,
            );
        }

        /* FILTRO PARA COLUNAS NUMÉRICAS */

        if (
            columnProfile.type ===
            "number"
        ) {
            const numericFilter =
                document.createElement(
                    "div",
                );

            const numericOperator =
                document.createElement(
                    "select",
                );

            const numericValue =
                document.createElement(
                    "input",
                );

            numericFilter.classList.add(
                "statistics-numeric-filter",
            );

            numericOperator.classList.add(
                "statistics-numeric-operator",
                "standard-select",
            );

            numericOperator.style.width =
                "100%";

            numericOperator.append(
                createFilterOption(
                    "",
                    "Comparar...",
                ),

                createFilterOption(
                    "greaterThan",
                    "Maior que",
                ),

                createFilterOption(
                    "greaterThanOrEqual",
                    "Maior ou igual",
                ),

                createFilterOption(
                    "lessThan",
                    "Menor que",
                ),

                createFilterOption(
                    "lessThanOrEqual",
                    "Menor ou igual",
                ),

                createFilterOption(
                    "equal",
                    "Igual a",
                ),

                createFilterOption(
                    "notEqual",
                    "Diferente de",
                ),
            );

            numericOperator.value =
                columnFilter.numericOperator;

            numericOperator.setAttribute(
                "aria-label",
                `Comparação numérica da coluna ${headerValue}`,
            );

            const updateNumericOperator =
                function () {
                    columnFilter.numericOperator =
                        numericOperator.value;

                    renderTableBody();
                };

            if (
                window.jQuery &&
                typeof window.jQuery
                    .fn.select2 ===
                    "function"
            ) {
                window
                    .jQuery(
                        numericOperator,
                    )
                    .on(
                        "change.statisticsNumericFilter",
                        updateNumericOperator,
                    );
            } else {
                numericOperator.addEventListener(
                    "change",
                    updateNumericOperator,
                );
            }

            numericValue.type =
                "text";

            numericValue.inputMode =
                "decimal";

            numericValue.placeholder =
                "Valor";

            numericValue.value =
                columnFilter.numericValue;

            numericValue.classList.add(
                "statistics-numeric-value",
            );

            numericValue.setAttribute(
                "aria-label",
                `Valor numérico para filtrar a coluna ${headerValue}`,
            );

            numericValue.addEventListener(
                "input",
                function () {
                    columnFilter.numericValue =
                        numericValue.value;

                    renderTableBody();
                },
            );

            numericFilter.append(
                numericOperator,
                numericValue,
            );

            advancedFilters.appendChild(
                numericFilter,
            );
        }

        if (
            advancedFilters
                .childElementCount > 0
        ) {
            filterControls.appendChild(
                advancedFilters,
            );
        }

        filterCell.appendChild(
            filterControls,
        );

        filterRow.appendChild(
            filterCell,
        );
    }

    if (
        visibleColumnIndexes.length >
        0
    ) {
        tableHead.append(
            headerRow,
            filterRow,
        );

        if (
            typeof window.initializeSelect2Fields ===
            "function"
        ) {
            window.initializeSelect2Fields(
                filterRow,
            );
        } else {
            console.error(
                "A função initializeSelect2Fields não foi encontrada.",
            );
        }
    }
}

/* APLICA OS FILTROS */

function getFilteredRows() {
    return tableState.rows.filter(
        function (row) {
            return tableState.filters.every(
                function (
                    columnFilter,
                    columnIndex,
                ) {
                    /*
                     * Colunas ocultas não aplicam filtros.
                     */

                    if (
                        !tableState.visibleColumns.has(
                            columnIndex,
                        )
                    ) {
                        return true;
                    }

                    const normalizedCellValue =
                        normalizeSearchValue(
                            row[
                                columnIndex
                            ],
                        ).trim();

                    const normalizedTextFilter =
                        normalizeSearchValue(
                            columnFilter.text,
                        ).trim();

                    /* FILTRO POR TEXTO */

                    if (
                        normalizedTextFilter &&
                        !normalizedCellValue.includes(
                            normalizedTextFilter,
                        )
                    ) {
                        return false;
                    }

                    /* FILTRO POR FREQUÊNCIA */

                    if (
                        columnFilter.occurrence !==
                        "all"
                    ) {
                        const valueCounts =
                            tableState.columnValueCounts[
                                columnIndex
                            ];

                        const valueCount =
                            valueCounts?.get(
                                normalizedCellValue,
                            ) ?? 0;

                        const isEmpty =
                            normalizedCellValue === "";

                        const isDuplicate =
                            !isEmpty &&
                            valueCount > 1;

                        const isUnique =
                            !isEmpty &&
                            valueCount === 1;

                        if (
                            columnFilter.occurrence ===
                                "empty" &&
                            !isEmpty
                        ) {
                            return false;
                        }

                        if (
                            columnFilter.occurrence ===
                                "duplicates" &&
                            !isDuplicate
                        ) {
                            return false;
                        }

                        if (
                            columnFilter.occurrence ===
                                "unique" &&
                            !isUnique
                        ) {
                            return false;
                        }
                    }

                    /* FILTRO NUMÉRICO */

                    const numericFilterValue =
                        parseNumericValue(
                            columnFilter.numericValue,
                        );

                    const hasNumericFilter =
                        columnFilter.numericOperator !==
                            "" &&
                        numericFilterValue !==
                            null;

                    if (
                        hasNumericFilter &&
                        !matchesNumericFilter(
                            row[
                                columnIndex
                            ],
                            columnFilter.numericOperator,
                            numericFilterValue,
                        )
                    ) {
                        return false;
                    }

                    return true;
                },
            );
        },
    );
}

/* ORDENA OS REGISTROS */

function getSortedRows(rows) {
    if (
        tableState.sortColumn ===
        null
    ) {
        return rows;
    }

    const sortedRows =
        [...rows];

    const columnIndex =
        tableState.sortColumn;

    sortedRows.sort(
        function (
            firstRow,
            secondRow,
        ) {
            const firstValue =
                formatCellValue(
                    firstRow[
                        columnIndex
                    ],
                ).trim();

            const secondValue =
                formatCellValue(
                    secondRow[
                        columnIndex
                    ],
                ).trim();

            if (
                !firstValue &&
                secondValue
            ) {
                return 1;
            }

            if (
                firstValue &&
                !secondValue
            ) {
                return -1;
            }

            const comparison =
                naturalCollator.compare(
                    firstValue,
                    secondValue,
                );

            return tableState.sortDirection ===
                "asc"
                ? comparison
                : -comparison;
        },
    );

    return sortedRows;
}

/* RETORNA O LIMITE DE LINHAS DA PRÉVIA */

function getPreviewRowLimit() {
    if (previewLimit.value === "all") {
        return null;
    }

    const selectedLimit = Number(
        previewLimit.value,
    );

    return Number.isInteger(selectedLimit) &&
        selectedLimit > 0
        ? selectedLimit
        : null;
}

/* LIMPA TODOS OS FILTROS DA TABELA */

function clearAllFilters() {
    const hasActiveFilters =
        tableState.filters.some(
            isColumnFilterActive,
        );

    if (!hasActiveFilters) {
        return;
    }

    tableState.filters =
        tableState.filters.map(
            function () {
                return createEmptyColumnFilter();
            },
        );

    renderTableHeader();

    renderTableBody();
}

/* MONTA AS LINHAS VISÍVEIS */

function renderTableBody() {
    const tableBody =
        table.querySelector("tbody");

    const filteredRows =
        getFilteredRows();

    const sortedRows =
        getSortedRows(
            filteredRows,
        );

    const rowLimit =
        getPreviewRowLimit();

    const visibleRows =
        rowLimit === null
            ? sortedRows
            : sortedRows.slice(
                0,
                rowLimit,
            );

    const visibleColumnIndexes =
        getVisibleColumnIndexes();

    tableBody.replaceChildren();

    if (
        visibleColumnIndexes.length ===
        0
    ) {
        const emptyRow =
            document.createElement(
                "tr",
            );

        const emptyCell =
            createCell(
                "td",
                "Selecione ao menos uma coluna para visualizar a tabela.",
            );

        emptyRow.classList.add(
            "statistics-empty-row",
        );

        emptyCell.colSpan = 1;

        emptyRow.appendChild(
            emptyCell,
        );

        tableBody.appendChild(
            emptyRow,
        );
    } else if (
        visibleRows.length === 0
    ) {
        const emptyRow =
            document.createElement(
                "tr",
            );

        const emptyCell =
            createCell(
                "td",
                "Nenhum resultado encontrado para os filtros aplicados.",
            );

        emptyRow.classList.add(
            "statistics-empty-row",
        );

        emptyCell.colSpan =
            visibleColumnIndexes.length;

        emptyRow.appendChild(
            emptyCell,
        );

        tableBody.appendChild(
            emptyRow,
        );
    } else {
        const bodyFragment =
            document.createDocumentFragment();

        visibleRows.forEach(
            function (row) {
                const tableRow =
                    document.createElement(
                        "tr",
                    );

                for (
                    const columnIndex
                    of visibleColumnIndexes
                ) {
                    tableRow.appendChild(
                        createCell(
                            "td",
                            row[
                                columnIndex
                            ],
                        ),
                    );
                }

                bodyFragment.appendChild(
                    tableRow,
                );
            },
        );

        tableBody.appendChild(
            bodyFragment,
        );
    }

    renderQuickAnalysis(
        filteredRows,
    );

    const totalRows =
        tableState.rows.length;

    const filteredRowCount =
        filteredRows.length;

    const visibleRowCount =
        visibleRows.length;

    const hasLimitedPreview =
        visibleRowCount <
        filteredRowCount;

    const previewLimitMessage =
        hasLimitedPreview
            ? ` - Exibindo ${visibleRowCount}`
            : "";

    const isFiltered =
        tableState.filters.some(
            isColumnFilterActive,
        );

    clearFiltersButton.disabled =
        !isFiltered;

    const rowCountMessage =
        isFiltered
            ? `${filteredRowCount} de ${totalRows} linhas`
            : `${totalRows} linhas`;

    previewSummary.textContent =
        `Página: ${tableState.sheetName} / ${rowCountMessage}${previewLimitMessage} -`;

    const downloadsDisabled =
        !tableState.sourceFileName ||
        visibleColumnIndexes.length === 0 ||
        filteredRows.length === 0;

    setDownloadButtonsDisabled(
        downloadsDisabled,
    );

    renderChart();
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

    chartCanvas.parentElement.classList.remove("pie");
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
    maximumLength,
) {
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
    quantity,
) {
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

                    const shortLabel = shortenChartLabel(
                        fullLabel,
                        labelLength,
                    );

                    if (
                        chartState.type !== "bar" ||
                        !chartState.showValues
                    ) {
                        return shortLabel;
                    }

                    const barValue = Number(
                        chartData.values[value],
                    );

                    return [
                        shortLabel,
                        formatAnalysisNumber(barValue),
                    ];
                },
            },

            grid: {
                color: "rgba(82, 82, 82, 0.35)",
            },

            border: {
                color: "#8b8d91",
            },
        },

        y: {
            // O restante continua como já está.
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
    chartCanvas.parentElement.classList.toggle("pie", pieChart);

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

/* MONTA A TABELA INTERATIVA */

function renderTable(
    rows,
    sheetName,
) {
    const columnCount =
        rows.reduce(
            function (
                largestColumnCount,
                row,
            ) {
                return Math.max(
                    largestColumnCount,
                    row.length,
                );
            },
            0,
        );

    if (columnCount === 0) {
        throw new Error(
            "A primeira aba do arquivo não possui dados.",
        );
    }

    const headerValues =
        rows[0] ?? [];

    tableState.sheetName =
        sheetName;

    tableState.columnCount =
        columnCount;

    tableState.headers =
        Array.from(
            {
                length:
                    columnCount,
            },

            function (
                unusedValue,
                columnIndex,
            ) {
                return (
                    formatCellValue(
                        headerValues[
                            columnIndex
                        ],
                    ).trim() ||
                    `Coluna ${columnIndex + 1}`
                );
            },
        );

    tableState.rows =
        rows.slice(1);

    tableState.columnProfiles =
        tableState.headers.map(
            function (
                unusedHeader,
                columnIndex,
            ) {
                return detectColumnProfile(
                    columnIndex,
                );
            },
        );

    tableState.columnValueCounts =
        tableState.headers.map(
            function (
                unusedHeader,
                columnIndex,
            ) {
                return createColumnValueCounts(
                    columnIndex,
                );
            },
        );

    /* TODAS AS COLUNAS COMEÇAM VISÍVEIS */

    tableState.visibleColumns =
        new Set(
            tableState.headers.map(
                function (
                    unusedHeader,
                    columnIndex,
                ) {
                    return columnIndex;
                },
            ),
        );

    tableState.analysisModes =
        new Map(
            tableState.columnProfiles.map(
                function (
                    profile,
                    columnIndex,
                ) {
                    return [
                        columnIndex,
                        profile.type,
                    ];
                },
            ),
        );

    tableState.selectedAnalysisColumns.clear();

    tableState.filters =
        Array.from(
            {
                length:
                    columnCount,
            },

            function () {
                return createEmptyColumnFilter();
            },
        );

    tableState.sortColumn =
        null;

    tableState.sortDirection =
        "asc";

    renderVisibleColumnSelector();

    renderAnalysisColumnSelector();

    renderTableHeader();

    renderTableBody();

    preview.hidden = false;

    showChartPanel();
}

/* LIMPA O ESTADO DA TABELA */

function resetTableState() {
    tableState.sourceFileName =
        "";

    tableState.sourceExtension =
        "";

    tableState.sheetName = "";

    tableState.headers = [];

    tableState.rows = [];

    tableState.columnProfiles =
        [];

    tableState.visibleColumns.clear();

    tableState.analysisModes.clear();

    tableState.selectedAnalysisColumns.clear();

    tableState.filters = [];

    tableState.columnValueCounts =
        [];

    tableState.columnCount = 0;

    tableState.sortColumn =
        null;

    tableState.sortDirection =
        "asc";
}

/* LIMPA A ANÁLISE RÁPIDA */

function clearQuickAnalysis() {
    quickAnalysis.hidden = true;

    totalRecords.textContent =
        "0";

    analysisColumns.replaceChildren();

    visibleColumns.replaceChildren();

    visibleColumnCount.textContent =
        "0 de 0";

    analysisCards.replaceChildren();

    analysisResults.replaceChildren();

    analysisEmpty.hidden =
        false;

    selectAllColumnsButton.disabled =
        true;

    clearColumnsButton.disabled =
        true;

    showAllColumnsButton.disabled =
        true;

    hideAllColumnsButton.disabled =
        true;

    hideEmptyColumnsButton.disabled =
        true;
}

/* REMOVE OS DADOS DA TELA */

function clearImportedFile() {
    setDownloadButtonsDisabled(
        true,
    );

    clearFiltersButton.disabled =
        true;

    const tableHead =
        table.querySelector("thead");

    const tableBody =
        table.querySelector("tbody");

    fileInput.value = "";

    tableHead.replaceChildren();

    tableBody.replaceChildren();

    resetTableState();

    clearQuickAnalysis();

    clearChartPanel();

    previewSummary.textContent =
        "";

    preview.hidden = true;

    clearButton.disabled = true;

    statisticsPanel.classList.add("no-file");

    setStatus(
        "Nenhum arquivo selecionado. O arquivo será lido somente neste navegador.",
    );
}

/* LÊ O ARQUIVO SELECIONADO */

async function readSelectedFile(
    file,
) {
    if (!isSupportedFile(file)) {
        throw new Error(
            "Formato não suportado. Selecione um arquivo .xlsx, .xls ou .csv.",
        );
    }

    if (!window.XLSX) {
        throw new Error(
            "A biblioteca de leitura de planilhas não foi carregada.",
        );
    }

    const fileData =
        await file.arrayBuffer();

    const workbook =
        window.XLSX.read(
            fileData,
            {
                cellDates: true,

                cellFormula:
                    false,
            },
        );

    const sheetName =
        workbook.SheetNames[0];

    if (!sheetName) {
        throw new Error(
            "O arquivo não possui nenhuma aba.",
        );
    }

    const worksheet =
        workbook.Sheets[
            sheetName
        ];

    const rows =
        window.XLSX.utils.sheet_to_json(
            worksheet,
            {
                header: 1,

                defval: "",

                raw: false,

                blankrows:
                    false,
            },
        );

    if (rows.length === 0) {
        throw new Error(
            "A primeira aba do arquivo está vazia.",
        );
    }

    tableState.sourceFileName =
        file.name;

    renderTable(
        rows,
        sheetName,
    );

    statisticsPanel.classList.remove("no-file");

    clearButton.disabled =
        false;

    setStatus(
        `Arquivo "${file.name}" carregado localmente com sucesso.`,
    );
}

/* CRIA UM NOME SEGURO PARA O ARQUIVO */

function createSafeFileBaseName(
    fileName,
) {
    const lastDotPosition =
        fileName.lastIndexOf(".");

    const baseName =
        lastDotPosition > 0
            ? fileName.slice(
                  0,
                  lastDotPosition,
              )
            : fileName;

    const safeName =
        baseName
            .replace(
                /[<>:"/\\|?*\u0000-\u001F]/g,
                "_",
            )
            .trim();

    return (
        safeName ||
        "planilha"
    );
}

/* CRIA UM NOME VÁLIDO PARA A PÁGINA */

function createSafeSheetName(
    sheetName,
) {
    const safeName =
        formatCellValue(
            sheetName,
        )
            .replace(
                /[\\/:?*\[\]]/g,
                " ",
            )
            .trim()
            .slice(0, 31);

    return (
        safeName ||
        "Dados"
    );
}

/* BAIXA UM ARQUIVO CRIADO COM BLOB */

function downloadBlob(
    blob,
    fileName,
) {
    const downloadUrl =
        URL.createObjectURL(
            blob,
        );

    const downloadLink =
        document.createElement("a");

    downloadLink.href =
        downloadUrl;

    downloadLink.download =
        fileName;

    document.body.appendChild(
        downloadLink,
    );

    downloadLink.click();

    downloadLink.remove();

    window.setTimeout(
        function () {
            URL.revokeObjectURL(
                downloadUrl,
            );
        },
        0,
    );
}

/* CALCULA A LARGURA DAS COLUNAS EXPORTADAS */

function createExportColumnWidths(
    headers,
    rows,
) {
    return headers.map(
        function (
            header,
            columnIndex,
        ) {
            let largestLength =
                formatCellValue(
                    header,
                ).length;

            rows.forEach(
                function (row) {
                    const cellLength =
                        formatCellValue(
                            row[
                                columnIndex
                            ],
                        ).length;

                    largestLength =
                        Math.max(
                            largestLength,
                            cellLength,
                        );
                },
            );

            return {
                wch: Math.min(
                    Math.max(
                        largestLength +
                            2,
                        10,
                    ),
                    45,
                ),
            };
        },
    );
}

/* PREPARA OS DADOS VISÍVEIS PARA EXPORTAÇÃO */

function createCurrentExportData() {
    const visibleColumnIndexes =
        getVisibleColumnIndexes();

    if (visibleColumnIndexes.length === 0) {
        throw new Error(
            "Selecione ao menos uma coluna antes de baixar.",
        );
    }

    const filteredRows =
        getFilteredRows();

    const sortedRows =
        getSortedRows(filteredRows);

    if (sortedRows.length === 0) {
        throw new Error(
            "Nenhuma linha foi encontrada para os filtros atuais.",
        );
    }

    const headers =
        visibleColumnIndexes.map(
            function (columnIndex) {
                return tableState.headers[
                    columnIndex
                ];
            },
        );

    const rows =
        sortedRows.map(function (row) {
            return visibleColumnIndexes.map(
                function (columnIndex) {
                    return (
                        row[columnIndex] ?? ""
                    );
                },
            );
        });

    return {
        headers,

        rows,

        matrix: [
            headers,

            ...rows,
        ],
    };
}
/* BAIXA OS DADOS ATUAIS COMO CSV */

function downloadCurrentTableAsCsv() {
    if (!window.XLSX) {
        throw new Error(
            "A biblioteca de planilhas não foi carregada.",
        );
    }

    const exportData =
        createCurrentExportData();

    const exportWorksheet =
        window.XLSX.utils.aoa_to_sheet(
            exportData.matrix,
        );

    const csvContent =
        window.XLSX.utils.sheet_to_csv(
            exportWorksheet,
        );

    /*
     * O BOM UTF-8 ajuda o Excel e o Google Planilhas
     * a reconhecerem corretamente acentos e caracteres especiais.
     */

    const csvBlob = new Blob(
        [
            "\uFEFF",

            csvContent,
        ],
        {
            type:
                "text/csv;charset=utf-8",
        },
    );

    const safeBaseName =
        createSafeFileBaseName(
            tableState.sourceFileName,
        );

    const csvFileName =
        `${safeBaseName}_nova-versao.csv`;

    downloadBlob(
        csvBlob,
        csvFileName,
    );

    setStatus(
        `Nova versão "${csvFileName}" gerada com ${exportData.rows.length} registros.`,
    );
}

/* BAIXA OS DADOS ATUAIS COMO XLSX */

function downloadCurrentTableAsXlsx() {
    if (!window.XLSX) {
        throw new Error(
            "A biblioteca de planilhas não foi carregada.",
        );
    }

    const exportData =
        createCurrentExportData();

    const exportWorksheet =
        window.XLSX.utils.aoa_to_sheet(
            exportData.matrix,
        );

    exportWorksheet["!cols"] =
        createExportColumnWidths(
            exportData.headers,
            exportData.rows,
        );

    const exportWorkbook =
        window.XLSX.utils.book_new();

    const safeSheetName =
        createSafeSheetName(
            tableState.sheetName,
        );

    window.XLSX.utils.book_append_sheet(
        exportWorkbook,
        exportWorksheet,
        safeSheetName,
    );

    /*
     * Futuramente, a página de gráficos será
     * adicionada ao mesmo workbook neste ponto.
     */

    const safeBaseName =
        createSafeFileBaseName(
            tableState.sourceFileName,
        );

    const xlsxFileName =
        `${safeBaseName}_nova-versao.xlsx`;

    window.XLSX.writeFile(
        exportWorkbook,
        xlsxFileName,
        {
            compression: true,
        },
    );

    setStatus(
        `Nova versão "${xlsxFileName}" gerada com ${exportData.rows.length} registros.`,
    );
}

/* EXECUTA UM DOWNLOAD E TRATA POSSÍVEIS ERROS */

function executeTableDownload(
    downloadFunction,
) {
    try {
        downloadFunction();
    } catch (error) {
        setStatus(
            error instanceof Error
                ? error.message
                : "Não foi possível gerar a nova versão.",
            true,
        );
    }
}

/* INICIALIZA O IMPORTADOR */

function initializeStatisticsImporter() {
    if (
        !statisticsPanel ||
        !fileInput ||
        !clearButton ||
        !downloadCsvButton ||
        !downloadXlsxButton ||
        !fileStatus ||
        !preview ||
        !previewSummary ||
        !previewLimit ||
        !table ||
        !visibleColumns ||
        !visibleColumnCount ||
        !showAllColumnsButton ||
        !hideAllColumnsButton ||
        !hideEmptyColumnsButton ||
        !clearFiltersButton ||
        !quickAnalysis ||
        !analysisColumns ||
        !selectAllColumnsButton ||
        !clearColumnsButton ||
        !totalRecords ||
        !analysisCards ||
        !analysisResults ||
        !analysisEmpty ||
        !chartPanel ||
        !chartSummary ||
        !chartCategory ||
        !chartValue ||
        !chartOperation ||
        !chartTypes ||
        !chartColors ||
        !chartShowValues ||
        !chartEmpty ||
        !chartCanvas ||
        !chartDownloadButton
    ) {
        console.error(
            "Elementos do importador de Estatísticas não foram encontrados.",
        );

        return;
    }

    if (!window.XLSX) {
        fileInput.disabled =
            true;

        setStatus(
            "Não foi possível carregar a biblioteca de leitura de planilhas.",
            true,
        );

        return;
    }

    if (!window.Chart) {
        console.error("A biblioteca Chart.js não foi carregada.");

        chartDownloadButton.disabled = true;
    }

    prepareChartColorButtons();

    const handleChartOperationChange = function () {
        updateChartValueField();

        const valueRequired = chartOperation.value !== "count";

        const valueSelected = chartValue.value !== "";

        if (
            valueRequired &&
            !valueSelected
        ) {
            chartDownloadButton.disabled = true;

            return;
        }

        renderChart();
    };

    const handleChartDataChange = function () {
        renderChart();
    };

    if (
        window.jQuery &&
        typeof window.jQuery.fn.select2 === "function"
    ) {
        window
            .jQuery(chartCategory)
            .on(
                "change.statisticsChartData",
                handleChartDataChange,
            );

        window
            .jQuery(chartValue)
            .on(
                "change.statisticsChartData",
                handleChartDataChange,
            );
    } else {
        chartCategory.addEventListener(
            "change",
            handleChartDataChange,
        );

        chartValue.addEventListener(
            "change",
            handleChartDataChange,
        );
    }

    chartTypes.addEventListener("click", function (event) {
        const eventTarget = event.target instanceof Element ? event.target : null;
        const typeButton = eventTarget?.closest("button[data-chart-type]");

        if (!typeButton || !chartTypes.contains(typeButton)) {
            return;
        }

        const selectedType = typeButton.dataset.chartType;

        if (!["bar", "line", "pie"].includes(selectedType)) {
            return;
        }

        chartState.type = selectedType;
        setActiveChartButton(chartTypes, typeButton);
        renderChart();
    });

    chartColors.addEventListener("click", function (event) {
        const eventTarget = event.target instanceof Element ? event.target : null;
        const colorButton = eventTarget?.closest("button[data-chart-color]");

        if (!colorButton || !chartColors.contains(colorButton)) {
            return;
        }

        const selectedColor = colorButton.dataset.chartColor;

        if (!selectedColor) {
            return;
        }

        chartState.color = selectedColor;
        setActiveChartButton(chartColors, colorButton);
        renderChart();
    });

    chartDownloadButton.addEventListener(
        "click",
        downloadChartImage,
    );

    if (
        window.jQuery &&
        typeof window.jQuery.fn.select2 === "function"
    ) {
        window
            .jQuery(chartOperation)
            .on(
                "change.statisticsChartOperation",
                handleChartOperationChange,
            );
    } else {
        chartOperation.addEventListener(
            "change",
            handleChartOperationChange,
        );
    }

    const handlePreviewLimitChange = function () {
        if (!tableState.rows.length) {
            return;
        }

        renderTableBody();
    };

    if (
        window.jQuery &&
        typeof window.jQuery.fn.select2 === "function"
    ) {
        window
            .jQuery(previewLimit)
            .on(
                "change.statisticsPreviewLimit",
                handlePreviewLimitChange,
            );
    } else {
        previewLimit.addEventListener(
            "change",
            handlePreviewLimitChange,
        );
    }
    
    downloadCsvButton.addEventListener(
        "click",
        function () {
            executeTableDownload(
                downloadCurrentTableAsCsv,
            );
        },
    );

    downloadXlsxButton.addEventListener(
        "click",
        function () {
            executeTableDownload(
                downloadCurrentTableAsXlsx,
            );
        },
    );

    fileInput.addEventListener(
        "change",
        async function () {
            const file =
                fileInput.files?.[0];

            if (!file) {
                return;
            }

            setStatus(
                `Lendo "${file.name}"...`,
            );

            try {
                await readSelectedFile(
                    file,
                );
            } catch (error) {
                setDownloadButtonsDisabled(
                    true,
                );

                table
                    .querySelector(
                        "thead",
                    )
                    .replaceChildren();

                table
                    .querySelector(
                        "tbody",
                    )
                    .replaceChildren();

                resetTableState();

                clearQuickAnalysis();

                clearChartPanel();

                clearFiltersButton.disabled =
                    true;

                statisticsPanel.classList.add("no-file");

                previewSummary.textContent =
                    "";

                preview.hidden =
                    true;

                clearButton.disabled =
                    false;

                setStatus(
                    error instanceof
                        Error
                        ? error.message
                        : "Não foi possível ler o arquivo selecionado.",
                    true,
                );
            }
        },
    );

    clearButton.addEventListener(
        "click",
        clearImportedFile,
    );

    selectAllColumnsButton.addEventListener(
        "click",
        function () {
            tableState.selectedAnalysisColumns =
                new Set(
                    getVisibleColumnIndexes(),
                );

            renderAnalysisColumnSelector();

            renderQuickAnalysis(
                getFilteredRows(),
            );
        },
    );

    clearColumnsButton.addEventListener(
        "click",
        function () {
            tableState.selectedAnalysisColumns.clear();

            renderAnalysisColumnSelector();

            renderQuickAnalysis(
                getFilteredRows(),
            );
        },
    );

    showAllColumnsButton.addEventListener(
        "click",
        function () {
            tableState.visibleColumns =
                new Set(
                    tableState.headers.map(
                        function (
                            unusedHeader,
                            columnIndex,
                        ) {
                            return columnIndex;
                        },
                    ),
                );

            refreshVisibleColumns();
        },
    );

    hideAllColumnsButton.addEventListener(
        "click",
        function () {
            tableState.visibleColumns.clear();

            refreshVisibleColumns();
        },
    );

    hideEmptyColumnsButton.addEventListener(
        "click",
        function () {
            tableState.columnProfiles.forEach(
                function (
                    profile,
                    columnIndex,
                ) {
                    if (
                        profile.type ===
                        "empty"
                    ) {
                        tableState.visibleColumns.delete(
                            columnIndex,
                        );
                    }
                },
            );

            refreshVisibleColumns();
        },
    );

    clearFiltersButton.addEventListener(
        "click",
        clearAllFilters,
    );

    chartShowValues.addEventListener("change", function () {
        chartState.showValues = chartShowValues.checked;
        renderChart();
    });
}

/* INICIALIZA */

initializeStatisticsImporter();
