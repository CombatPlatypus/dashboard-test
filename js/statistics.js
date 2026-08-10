const MAX_FREQUENCY_ROWS = 25;

const SUPPORTED_EXTENSIONS = new Set(["xlsx", "xls", "csv"]);

/* LOCALIZA OS ELEMENTOS DO PAINEL */

const fileInput = document.getElementById("statisticsFileInput");

const clearButton = document.getElementById("statisticsClearFile");

const fileStatus = document.getElementById("statisticsFileStatus");

const preview = document.getElementById("statisticsLocalPreview");

const previewSummary = document.getElementById("statisticsPreviewSummary");

const table = document.getElementById("statisticsLocalTable");

/* ELEMENTOS DO CONTROLE DE COLUNAS VISÍVEIS */

const visibleColumns = document.getElementById("statisticsVisibleColumns");

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

const quickAnalysis = document.getElementById("statisticsQuickAnalysis");

const analysisColumns = document.getElementById("statisticsAnalysisColumns");

const selectAllColumnsButton = document.getElementById(
    "statisticsSelectAllColumns",
);

const clearColumnsButton = document.getElementById("statisticsClearColumns");

const totalRecords = document.getElementById("statisticsTotalRecords");

const analysisCards = document.getElementById("statisticsAnalysisCards");

const analysisResults = document.getElementById("statisticsAnalysisResults");

const analysisEmpty = document.getElementById("statisticsAnalysisEmpty");

/* ESTADO DA TABELA INTERATIVA */

const tableState = {
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

const naturalCollator = new Intl.Collator("pt-BR", {
    numeric: true,
    sensitivity: "base",
});

/* CRIA O ESTADO INICIAL DE UM FILTRO */

function createEmptyColumnFilter() {
    return {
        text: "",
        duplicatesOnly: false,
        numericOperator: "",
        numericValue: "",
    };
}

/* VERIFICA SE UM FILTRO ESTÁ ATIVO */

function isColumnFilterActive(filter) {
    const hasTextFilter =
        normalizeSearchValue(filter.text).trim().length > 0;

    const hasNumericFilter =
        filter.numericOperator !== "" &&
        parseNumericValue(filter.numericValue) !== null;

    return (
        hasTextFilter ||
        filter.duplicatesOnly ||
        hasNumericFilter
    );
}

/* CONTA OS VALORES DE UMA COLUNA */

function createColumnValueCounts(columnIndex) {
    const valueCounts = new Map();

    tableState.rows.forEach(function (row) {
        const normalizedValue = normalizeSearchValue(
            row[columnIndex],
        ).trim();

        /*
         * Células vazias não são consideradas duplicadas.
         */

        if (!normalizedValue) {
            return;
        }

        const currentCount =
            valueCounts.get(normalizedValue) ?? 0;

        valueCounts.set(
            normalizedValue,
            currentCount + 1,
        );
    });

    return valueCounts;
}

/* CRIA UMA OPÇÃO DO FILTRO NUMÉRICO */

function createNumericFilterOption(value, label) {
    const option = document.createElement("option");

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
    const numericCellValue = parseNumericValue(cellValue);

    if (numericCellValue === null) {
        return false;
    }

    switch (operator) {
        case "greaterThan":
            return numericCellValue > comparisonValue;

        case "greaterThanOrEqual":
            return numericCellValue >= comparisonValue;

        case "lessThan":
            return numericCellValue < comparisonValue;

        case "lessThanOrEqual":
            return numericCellValue <= comparisonValue;

        case "equal":
            return numericCellValue === comparisonValue;

        case "notEqual":
            return numericCellValue !== comparisonValue;

        default:
            return true;
    }
}

/* ATUALIZA A MENSAGEM DO IMPORTADOR */

function setStatus(message, isError = false) {
    fileStatus.textContent = message;

    fileStatus.classList.toggle("is-error", isError);
}

/* VERIFICA A EXTENSÃO DO ARQUIVO */

function isSupportedFile(file) {
    const extension = file.name.split(".").pop()?.toLowerCase();

    return SUPPORTED_EXTENSIONS.has(extension);
}

/* PREPARA O VALOR PARA EXIBIÇÃO */

function formatCellValue(value) {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value);
}

/* CRIA UMA CÉLULA */

function createCell(tagName, value) {
    const cell = document.createElement(tagName);

    cell.textContent = formatCellValue(value);

    return cell;
}

/* NORMALIZA UM VALOR PARA PESQUISA */

function normalizeSearchValue(value) {
    return formatCellValue(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

/* AGRUPA OS VALORES DE UMA COLUNA */

function createFrequencyData(rows, columnIndex) {
    if (columnIndex < 0) {
        return [];
    }

    const groups = new Map();

    rows.forEach(function (row) {
        const displayValue = formatCellValue(row[columnIndex]).trim();

        if (!displayValue) {
            return;
        }

        const normalizedValue = normalizeSearchValue(displayValue).trim();

        if (groups.has(normalizedValue)) {
            groups.get(normalizedValue).count += 1;

            return;
        }

        groups.set(normalizedValue, {
            label: displayValue,
            count: 1,
        });
    });

    return Array.from(groups.values()).sort(function (firstGroup, secondGroup) {
        return (
            secondGroup.count - firstGroup.count ||
            naturalCollator.compare(firstGroup.label, secondGroup.label)
        );
    });
}

/* MONTA UMA TABELA DE AGRUPAMENTO */

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
            document.createElement(
                "tr",
            );


        const cell =
            createCell(
                "td",
                emptyMessage,
            );


        cell.colSpan =
            3;


        cell.classList.add(
            "statistics-summary-empty",
        );


        row.appendChild(
            cell,
        );


        tableBody.appendChild(
            row,
        );


        return;
    }


    const fragment =
        document.createDocumentFragment();


    frequencyData.forEach(
        function (
            group,
        ) {

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


            fragment.appendChild(
                row,
            );
        },
    );


    tableBody.appendChild(
        fragment,
    );
}

/* VERIFICA SE UMA CÉLULA ESTÁ VAZIA */

function isEmptyCell(value) {
    return formatCellValue(value).trim() === "";
}

/* CONVERTE UM VALOR NUMÉRICO */

function parseNumericValue(value) {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }

    if (value instanceof Date || isEmptyCell(value)) {
        return null;
    }

    let normalizedValue = formatCellValue(value)
        .trim()
        .replace(/\s|\u00a0/g, "")
        .replace(/^R\$/i, "")
        .replace(/%$/, "");

    if (!/^[+-]?\d[\d.,]*$/.test(normalizedValue)) {
        return null;
    }

    const lastComma = normalizedValue.lastIndexOf(",");

    const lastDot = normalizedValue.lastIndexOf(".");

    if (lastComma >= 0 && lastDot >= 0) {
        const decimalSeparator = lastComma > lastDot ? "," : ".";

        const thousandsSeparator = decimalSeparator === "," ? "." : ",";

        normalizedValue = normalizedValue
            .replaceAll(thousandsSeparator, "")
            .replace(decimalSeparator, ".");
    } else if (lastComma >= 0) {
        normalizedValue = normalizedValue.replaceAll(".", "").replace(",", ".");
    } else {
        normalizedValue = normalizedValue.replaceAll(",", "");
    }

    const numericValue = Number(normalizedValue);

    return Number.isFinite(numericValue) ? numericValue : null;
}

/* CONVERTE UMA DATA OU DATA/HORA */

function parseDateValue(value) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value;
    }

    const displayValue = formatCellValue(value).trim();

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

    const startsWithYear = dateMatch[1].length === 4;

    let year = Number(startsWithYear ? dateMatch[1] : dateMatch[3]);

    if (year < 100) {
        year += year >= 70 ? 1900 : 2000;
    }

    const month = Number(dateMatch[2]);

    const day = Number(startsWithYear ? dateMatch[3] : dateMatch[1]);

    const hour = Number(dateMatch[4] ?? 0);

    const minute = Number(dateMatch[5] ?? 0);

    const second = Number(dateMatch[6] ?? 0);

    const parsedDate = new Date(year, month - 1, day, hour, minute, second);

    if (
        parsedDate.getFullYear() !== year ||
        parsedDate.getMonth() !== month - 1 ||
        parsedDate.getDate() !== day ||
        parsedDate.getHours() !== hour ||
        parsedDate.getMinutes() !== minute ||
        parsedDate.getSeconds() !== second
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

    return labels[type] ?? "Texto";
}

/* RETORNA OS MODOS COMPATÍVEIS COM A COLUNA */

function getAvailableAnalysisModes(detectedType) {
    const modesByType = {
        category: ["category", "identifier"],

        identifier: ["identifier", "category"],

        number: ["number", "category", "identifier"],

        datetime: ["datetime", "category"],

        empty: ["empty"],
    };

    return modesByType[detectedType] ?? ["category"];
}

/* DETECTA O TIPO DE UMA COLUNA */

function detectColumnProfile(columnIndex) {
    const filledValues = tableState.rows
        .map(function (row) {
            return row[columnIndex];
        })
        .filter(function (value) {
            return !isEmptyCell(value);
        });

    if (filledValues.length === 0) {
        return {
            type: "empty",
            hasTime: false,
        };
    }

    const dateValues = filledValues.filter(function (value) {
        return parseDateValue(value) !== null;
    });

    const numericValues = filledValues.filter(function (value) {
        return parseNumericValue(value) !== null;
    });

    const uniqueValues = new Set(
        filledValues.map(function (value) {
            return normalizeSearchValue(value).trim();
        }),
    );

    const uniqueRatio = uniqueValues.size / filledValues.length;

    const headerValue = normalizeSearchValue(
        tableState.headers[columnIndex],
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
                    textValue.length >= 6 &&
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


    if (dateValues.length / filledValues.length >= 0.8) {
        return {
            type: "datetime",

            hasTime: filledValues.some(function (value) {
                return /\d{1,2}:\d{2}/.test(formatCellValue(value));
            }),
        };
    }

    if (numericValues.length / filledValues.length >= 0.8) {
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
    if (!Number.isFinite(value)) {
        return "—";
    }

    return new Intl.NumberFormat("pt-BR", {
        maximumFractionDigits: 2,
    }).format(value);
}

/* FORMATA UM PERCENTUAL DA ANÁLISE */

function formatAnalysisPercentage(
    quantity,
    total,
 ) {

    if (
        !Number.isFinite(quantity) ||
        !Number.isFinite(total) ||
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

function formatAnalysisDate(value, hasTime) {
    if (!(value instanceof Date)) {
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

function createAnalysisCard(title, columnName, value) {
    const card = document.createElement("div");
    const cardTitle = document.createElement("span");
    const cardSource = document.createElement("span");
    const cardValue = document.createElement("strong");

    card.classList.add(
        "statistics-summary-card",
    );

    cardTitle.classList.add(
        "statistics-summary-card-title",
    );

    cardSource.classList.add(
        "statistics-summary-card-source",
    );

    cardTitle.textContent =
        title;

    cardSource.textContent =
        `De: ${columnName}`;

    cardValue.textContent =
        value;

    card.append(
        cardTitle,
        cardSource,
        cardValue,
    );

    return card;
}

/* CRIA UM BLOCO DA ANÁLISE */

function createAnalysisBlock(title) {
    const block = document.createElement("div");

    const heading = document.createElement("h4");

    block.classList.add("statistics-summary-block");

    heading.textContent = title;

    block.appendChild(heading);

    return block;
}

/* ADICIONA MÉTRICAS A UM BLOCO */

function appendAnalysisMetrics(block, metrics) {
    const metricsContainer = document.createElement("div");

    metricsContainer.classList.add("statistics-analysis-metrics");

    metrics.forEach(function (metric) {
        const metricElement = document.createElement("div");

        const metricLabel = document.createElement("span");

        const metricValue = document.createElement("strong");

        metricElement.classList.add("statistics-analysis-metric");

        metricLabel.textContent = metric.label;

        metricValue.textContent = metric.value;

        metricValue.title = metric.value;

        metricElement.append(metricLabel, metricValue);

        metricsContainer.appendChild(metricElement);
    });

    block.appendChild(metricsContainer);
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

                      return total +
                          group.count;
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


        block.appendChild(
            note,
        );
    }
}

/* RETORNA OS ÍNDICES DAS COLUNAS VISÍVEIS */

function getVisibleColumnIndexes() {
    return Array.from(tableState.visibleColumns)
        .filter(function (columnIndex) {
            return columnIndex >= 0 && columnIndex < tableState.columnCount;
        })
        .sort(function (firstColumn, secondColumn) {
            return firstColumn - secondColumn;
        });
}

/* MONTA OS CHECKBOXES DAS COLUNAS VISÍVEIS */

function renderVisibleColumnSelector() {
    visibleColumns.replaceChildren();

    const fragment = document.createDocumentFragment();

    const visibleColumnIndexes = getVisibleColumnIndexes();

    /* ATUALIZA O CONTADOR */

    visibleColumnCount.textContent = `${visibleColumnIndexes.length} de ${tableState.columnCount}`;

    /* ATUALIZA OS BOTÕES */

    showAllColumnsButton.disabled =
        tableState.columnCount === 0 ||
        visibleColumnIndexes.length === tableState.columnCount;

    hideAllColumnsButton.disabled = visibleColumnIndexes.length === 0;

    hideEmptyColumnsButton.disabled = !tableState.columnProfiles.some(
        function (profile, columnIndex) {
            return (
                profile.type === "empty" &&
                tableState.visibleColumns.has(columnIndex)
            );
        },
    );

    /* CRIA UM CHECKBOX PARA CADA COLUNA */

    tableState.headers.forEach(function (header, columnIndex) {
        const option = document.createElement("div");

        const label = document.createElement("label");

        const checkbox = document.createElement("input");

        const columnName = document.createElement("span");

        const profile = tableState.columnProfiles[columnIndex];

        option.classList.add("statistics-visible-column-option");

        option.classList.toggle("is-empty", profile.type === "empty");

        checkbox.type = "checkbox";

        checkbox.checked = tableState.visibleColumns.has(columnIndex);

        checkbox.setAttribute("aria-label", `Exibir coluna ${header}`);

        checkbox.addEventListener("change", function () {
            if (checkbox.checked) {
                tableState.visibleColumns.add(columnIndex);
            } else {
                tableState.visibleColumns.delete(columnIndex);
            }

            refreshVisibleColumns();
        });

        columnName.classList.add("statistics-visible-column-name");

        columnName.textContent = header;

        columnName.title =
            profile.type === "empty" ? `${header} — coluna vazia` : header;

        label.append(checkbox, columnName);

        option.appendChild(label);

        fragment.appendChild(option);
    });

    visibleColumns.appendChild(fragment);
}

/* ATUALIZA A INTERFACE APÓS MUDAR A VISIBILIDADE */

function refreshVisibleColumns() {
    tableState.headers.forEach(function (unusedHeader, columnIndex) {
        const isVisible = tableState.visibleColumns.has(columnIndex);

        if (isVisible) {
            return;
        }

        /*
         * Remove filtros de colunas ocultadas.
         * Isso impede filtros invisíveis.
         */

        tableState.filters[columnIndex] =
            createEmptyColumnFilter();

        /*
         * Remove a coluna da análise.
         */

        tableState.selectedAnalysisColumns.delete(columnIndex);
    });

    /*
     * Cancela a ordenação se a coluna
     * usada para ordenar foi ocultada.
     */

    if (
        tableState.sortColumn !== null &&
        !tableState.visibleColumns.has(tableState.sortColumn)
    ) {
        tableState.sortColumn = null;

        tableState.sortDirection = "asc";
    }

    renderVisibleColumnSelector();

    renderAnalysisColumnSelector();

    renderTableHeader();

    renderTableBody();
}

/* MONTA OS CHECKBOXES E MODOS DAS COLUNAS PARA ANÁLISE */

function renderAnalysisColumnSelector() {
    analysisColumns.replaceChildren();

    const fragment = document.createDocumentFragment();

    tableState.headers.forEach(function (header, columnIndex) {
        if (!tableState.visibleColumns.has(columnIndex)) {
            return;
        }

        const option = document.createElement("div");

        const label = document.createElement("label");

        const checkbox = document.createElement("input");

        const columnName = document.createElement("span");

        const columnModes = document.createElement("div");

        const profile = tableState.columnProfiles[columnIndex];

        const availableModes = getAvailableAnalysisModes(profile.type);

        const selectedMode =
            tableState.analysisModes.get(columnIndex) ?? profile.type;

        option.classList.add("statistics-column-option");

        checkbox.type = "checkbox";

        checkbox.checked = tableState.selectedAnalysisColumns.has(columnIndex);

        checkbox.setAttribute("aria-label", `Analisar coluna ${header}`);

        checkbox.addEventListener("change", function () {
            if (checkbox.checked) {
                tableState.selectedAnalysisColumns.add(columnIndex);
            } else {
                tableState.selectedAnalysisColumns.delete(columnIndex);
            }

            renderQuickAnalysis(getFilteredRows());
        });

        columnName.classList.add("statistics-column-name");

        columnName.textContent = header;

        columnName.title = header;

        columnModes.classList.add("statistics-column-modes");

        label.append(checkbox, columnName);

        availableModes.forEach(function (mode) {
            const modeButton = document.createElement("button");

            const isActive = selectedMode === mode;

            modeButton.type = "button";

            modeButton.classList.add("statistics-analysis-mode-button");

            modeButton.classList.toggle("is-active", isActive);

            modeButton.textContent = getColumnTypeLabel(mode);

            modeButton.setAttribute("aria-pressed", String(isActive));

            modeButton.setAttribute(
                "aria-label",
                `Analisar ${header} como ${getColumnTypeLabel(mode)}`,
            );

            modeButton.disabled = mode === "empty";

            modeButton.addEventListener("click", function () {
                tableState.analysisModes.set(columnIndex, mode);

                renderAnalysisColumnSelector();

                renderQuickAnalysis(getFilteredRows());
            });

            columnModes.appendChild(modeButton);
        });

        option.append(label, columnModes);

        fragment.appendChild(option);
    });

    analysisColumns.appendChild(fragment);

    const hasColumns = getVisibleColumnIndexes().length > 0;

    selectAllColumnsButton.disabled = !hasColumns;

    clearColumnsButton.disabled = !hasColumns;
}

/* ANALISA UMA COLUNA SELECIONADA */

function renderSelectedColumnAnalysis(rows, columnIndex) {
    const header = tableState.headers[columnIndex];

    const profile = tableState.columnProfiles[columnIndex];

    const analysisMode =
        tableState.analysisModes.get(columnIndex) ?? profile.type;

    const filledValues = rows
        .map(function (row) {
            return row[columnIndex];
        })
        .filter(function (value) {
            return !isEmptyCell(value);
        });

    const emptyCount = rows.length - filledValues.length;

    const block = createAnalysisBlock(header);

    if (analysisMode === "number") {
        const numericValues = filledValues
            .map(parseNumericValue)
            .filter(function (value) {
                return value !== null;
            });

        const total = numericValues.reduce(function (sum, value) {
            return sum + value;
        }, 0);

        const average =
            numericValues.length > 0 ? total / numericValues.length : NaN;

        let minimum = NaN;

        let maximum = NaN;

        numericValues.forEach(function (value) {
            minimum = Number.isNaN(minimum) ? value : Math.min(minimum, value);

            maximum = Number.isNaN(maximum) ? value : Math.max(maximum, value);
        });

        analysisCards.appendChild(
            createAnalysisCard(
                "Total da Coluna",
                header,

                formatAnalysisNumber(total),
            ),
        );

        appendAnalysisMetrics(block, [
            {
                label: "Total",

                value: formatAnalysisNumber(total),
            },
            {
                label: "Média",

                value: formatAnalysisNumber(average),
            },
            {
                label: "Menor valor",

                value: formatAnalysisNumber(minimum),
            },
            {
                label: "Maior valor",

                value: formatAnalysisNumber(maximum),
            },
            {
                label: "Valores válidos",

                value: formatAnalysisNumber(numericValues.length),
            },
            {
                label: "Células vazias",

                value: formatAnalysisNumber(emptyCount),
            },
        ]);
    } else if (analysisMode === "datetime") {
        const dateValues = filledValues
            .map(parseDateValue)
            .filter(function (value) {
                return value !== null;
            });

        const firstDate = dateValues.reduce(function (
            earliestDate,
            currentDate,
        ) {
            return !earliestDate || currentDate < earliestDate
                ? currentDate
                : earliestDate;
        }, null);

        const lastDate = dateValues.reduce(function (latestDate, currentDate) {
            return !latestDate || currentDate > latestDate
                ? currentDate
                : latestDate;
        }, null);

        analysisCards.appendChild(
            createAnalysisCard(
                "Datas Válidas",
                header,

                formatAnalysisNumber(dateValues.length),
            ),
        );

        appendAnalysisMetrics(block, [
            {
                label: "Data inicial",

                value: formatAnalysisDate(firstDate, profile.hasTime),
            },
            {
                label: "Data final",

                value: formatAnalysisDate(lastDate, profile.hasTime),
            },
            {
                label: "Valores válidos",

                value: formatAnalysisNumber(dateValues.length),
            },
            {
                label: "Células vazias",

                value: formatAnalysisNumber(emptyCount),
            },
        ]);
    } else if (analysisMode === "category" || analysisMode === "identifier") {
        const frequencyData = createFrequencyData(rows, columnIndex);

        const duplicateCount = filledValues.length - frequencyData.length;

        analysisCards.appendChild(
            createAnalysisCard(
                "Valores Únicos",
                header,

                formatAnalysisNumber(frequencyData.length),
            ),
        );

        if (analysisMode === "identifier") {
            appendAnalysisMetrics(block, [
                {
                    label: "Valores Preenchidos",

                    value: formatAnalysisNumber(filledValues.length),
                },
                {
                    label: "Valores únicos",

                    value: formatAnalysisNumber(frequencyData.length),
                },
                {
                    label: "Duplicidades na Coluna",

                    value: formatAnalysisNumber(duplicateCount),
                },
                {
                    label: "Células vazias",

                    value: formatAnalysisNumber(emptyCount),
                },
            ]);

            const duplicatedValues = frequencyData.filter(function (group) {
                return group.count > 1;
            });

            if (duplicatedValues.length > 0) {
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
        analysisCards.appendChild(createAnalysisCard("Valores Preenchidos", header, "0"));

        appendAnalysisMetrics(block, [
            {
                label: "Valores preenchidos",
                value: "0",
            },
            {
                label: "Células vazias",

                value: formatAnalysisNumber(rows.length),
            },
        ]);
    }

    analysisResults.appendChild(block);
}

/* ATUALIZA A ANÁLISE RÁPIDA */

function renderQuickAnalysis(rows) {
    totalRecords.textContent = formatAnalysisNumber(rows.length);

    analysisCards.replaceChildren();

    analysisResults.replaceChildren();

    const selectedColumns = Array.from(tableState.selectedAnalysisColumns)
        .filter(function (columnIndex) {
            return tableState.visibleColumns.has(columnIndex);
        })
        .sort(function (firstColumn, secondColumn) {
            return firstColumn - secondColumn;
        });

    analysisEmpty.hidden = selectedColumns.length > 0;

    selectedColumns.forEach(function (columnIndex) {
        renderSelectedColumnAnalysis(rows, columnIndex);
    });

    quickAnalysis.hidden = false;
}

/* RETORNA O ÍCONE DA ORDENAÇÃO */

function getSortIndicator(columnIndex) {
    if (tableState.sortColumn !== columnIndex) {
        return "↕";
    }

    return tableState.sortDirection === "asc" ? "↑" : "↓";
}

/* ALTERA A ORDENAÇÃO */

function changeSort(columnIndex) {
    if (tableState.sortColumn === columnIndex) {
        tableState.sortDirection =
            tableState.sortDirection === "asc" ? "desc" : "asc";
    } else {
        tableState.sortColumn = columnIndex;

        tableState.sortDirection = "asc";
    }

    renderTableHeader();

    renderTableBody();
}

/* MONTA OS CABEÇALHOS E FILTROS */

function renderTableHeader() {
    const tableHead = table.querySelector("thead");

    const headerRow = document.createElement("tr");

    const filterRow = document.createElement("tr");

    const visibleColumnIndexes = getVisibleColumnIndexes();

    filterRow.classList.add("statistics-filter-row");
    
    if (
        typeof window.destroySelect2Fields ===
        "function"
    ) {
        window.destroySelect2Fields(
            tableHead,
        );
    }

    tableHead.replaceChildren();

    for (const columnIndex of visibleColumnIndexes) {
        const headerCell = document.createElement("th");

        const sortButton = document.createElement("button");

        const sortIndicator = document.createElement("span");

        const filterCell = document.createElement("th");

        const filterControls =
            document.createElement("div");

        const advancedFilters =
            document.createElement("div");

        const filterInput =
            document.createElement("input");

        const headerValue = tableState.headers[columnIndex];

        const columnProfile =
            tableState.columnProfiles[columnIndex];

        const columnFilter =
            tableState.filters[columnIndex];

        /* ORDENAÇÃO */

        sortButton.type = "button";

        sortButton.classList.add(
            "statistics-sort-button",
        );

        sortButton.setAttribute(
            "aria-label",
            `Ordenar pela coluna ${headerValue}`,
        );

        sortButton.append(
            document.createTextNode(headerValue),
        );

        sortIndicator.classList.add(
            "statistics-sort-indicator",
        );

        sortIndicator.textContent =
            getSortIndicator(columnIndex);

        sortButton.appendChild(sortIndicator);

        sortButton.addEventListener(
            "click",
            function () {
                changeSort(columnIndex);
            },
        );

        headerCell.appendChild(sortButton);

        headerRow.appendChild(headerCell);

        /* CONTAINER DOS FILTROS */

        filterControls.classList.add(
            "statistics-column-filter-controls",
        );

        advancedFilters.classList.add(
            "statistics-advanced-filters",
        );

        /* FILTRO POR TEXTO */

        filterInput.type = "search";

        filterInput.classList.add(
            "statistics-column-filter",
        );

        filterInput.placeholder = "Filtrar...";

        filterInput.value = columnFilter.text;

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

        filterControls.appendChild(filterInput);

        /* FILTRO DE DUPLICIDADE */

        if (columnProfile.type !== "empty") {
            const duplicateLabel =
                document.createElement("label");

            const duplicateCheckbox =
                document.createElement("input");

            const duplicateText =
                document.createElement("span");

            duplicateLabel.classList.add(
                "statistics-duplicate-filter",
            );

            duplicateCheckbox.type = "checkbox";

            duplicateCheckbox.checked =
                columnFilter.duplicatesOnly;

            duplicateCheckbox.setAttribute(
                "aria-label",
                `Mostrar somente duplicados da coluna ${headerValue}`,
            );

            duplicateText.textContent =
                "Somente duplicados";

            duplicateCheckbox.addEventListener(
                "change",
                function () {
                    columnFilter.duplicatesOnly =
                        duplicateCheckbox.checked;

                    renderTableBody();
                },
            );

            duplicateLabel.append(
                duplicateCheckbox,
                duplicateText,
            );

            advancedFilters.appendChild(
                duplicateLabel,
            );
        }

        /* FILTRO PARA COLUNAS NUMÉRICAS */

        if (columnProfile.type === "number") {
            const numericFilter =
                document.createElement("div");

            const numericOperator =
                document.createElement("select");

            const numericValue =
                document.createElement("input");

            numericFilter.classList.add(
                "statistics-numeric-filter",
            );

            numericOperator.classList.add(
                "statistics-numeric-operator",
                "standard-select",
            );

            numericOperator.style.width = "100%";

            numericOperator.append(
                createNumericFilterOption(
                    "",
                    "Comparar...",
                ),

                createNumericFilterOption(
                    "greaterThan",
                    "Maior que",
                ),

                createNumericFilterOption(
                    "greaterThanOrEqual",
                    "Maior ou igual",
                ),

                createNumericFilterOption(
                    "lessThan",
                    "Menor que",
                ),

                createNumericFilterOption(
                    "lessThanOrEqual",
                    "Menor ou igual",
                ),

                createNumericFilterOption(
                    "equal",
                    "Igual a",
                ),

                createNumericFilterOption(
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

            numericOperator.addEventListener(
                "change",
                function () {
                    columnFilter.numericOperator =
                        numericOperator.value;

                    renderTableBody();
                },
            );

            numericValue.type = "text";

            numericValue.inputMode = "decimal";

            numericValue.placeholder = "Valor";

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

        if (advancedFilters.childElementCount > 0) {
            filterControls.appendChild(
                advancedFilters,
            );
        }

        filterCell.appendChild(filterControls);

        filterRow.appendChild(filterCell);
    }

    if (visibleColumnIndexes.length > 0) {
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
    return tableState.rows.filter(function (row) {
        return tableState.filters.every(
            function (columnFilter, columnIndex) {
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
                        row[columnIndex],
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

                /* FILTRO DE DUPLICIDADE */

                if (columnFilter.duplicatesOnly) {
                    const valueCounts =
                        tableState.columnValueCounts[
                            columnIndex
                        ];

                    const valueCount =
                        valueCounts?.get(
                            normalizedCellValue,
                        ) ?? 0;

                    if (
                        !normalizedCellValue ||
                        valueCount <= 1
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
                    numericFilterValue !== null;

                if (
                    hasNumericFilter &&
                    !matchesNumericFilter(
                        row[columnIndex],
                        columnFilter.numericOperator,
                        numericFilterValue,
                    )
                ) {
                    return false;
                }

                return true;
            },
        );
    });
}

/* ORDENA OS REGISTROS */

function getSortedRows(rows) {
    if (tableState.sortColumn === null) {
        return rows;
    }

    const sortedRows = [...rows];

    const columnIndex = tableState.sortColumn;

    sortedRows.sort(function (firstRow, secondRow) {
        const firstValue = formatCellValue(firstRow[columnIndex]).trim();

        const secondValue = formatCellValue(secondRow[columnIndex]).trim();

        if (!firstValue && secondValue) {
            return 1;
        }

        if (firstValue && !secondValue) {
            return -1;
        }

        const comparison = naturalCollator.compare(firstValue, secondValue);

        return tableState.sortDirection === "asc" ? comparison : -comparison;
    });

    return sortedRows;
}

/* MONTA AS LINHAS VISÍVEIS */

function renderTableBody() {
    const tableBody = table.querySelector("tbody");

    const filteredRows = getFilteredRows();

    const sortedRows = getSortedRows(filteredRows);

    const visibleRows = sortedRows;

    const visibleColumnIndexes = getVisibleColumnIndexes();

    tableBody.replaceChildren();

    if (visibleColumnIndexes.length === 0) {
        const emptyRow = document.createElement("tr");

        const emptyCell = createCell(
            "td",
            "Selecione ao menos uma coluna para visualizar a tabela.",
        );

        emptyRow.classList.add("statistics-empty-row");

        emptyCell.colSpan = 1;

        emptyRow.appendChild(emptyCell);

        tableBody.appendChild(emptyRow);
    } else if (visibleRows.length === 0) {
        const emptyRow = document.createElement("tr");

        const emptyCell = createCell(
            "td",
            "Nenhum resultado encontrado para os filtros aplicados.",
        );

        emptyRow.classList.add("statistics-empty-row");

        emptyCell.colSpan = visibleColumnIndexes.length;

        emptyRow.appendChild(emptyCell);

        tableBody.appendChild(emptyRow);
    } else {
        const bodyFragment = document.createDocumentFragment();

        visibleRows.forEach(function (row) {
            const tableRow = document.createElement("tr");

            for (const columnIndex of visibleColumnIndexes) {
                tableRow.appendChild(createCell("td", row[columnIndex]));
            }

            bodyFragment.appendChild(tableRow);
        });

        tableBody.appendChild(bodyFragment);
    }

    renderQuickAnalysis(filteredRows);

    const totalRows = tableState.rows.length;

    const filteredRowCount = filteredRows.length;

    const isFiltered =
        tableState.filters.some(
            isColumnFilterActive,
        );

    const rowCountMessage = isFiltered
        ? `${filteredRowCount} de ${totalRows} linhas`
        : `${totalRows} linhas`;

    const columnCountMessage =
        visibleColumnIndexes.length ===
        tableState.columnCount
            ? `${tableState.columnCount} colunas`
            : `${visibleColumnIndexes.length} de ${tableState.columnCount} colunas`;

    previewSummary.textContent =
        `${tableState.sheetName} / ${rowCountMessage} - ${columnCountMessage}`;

/* MONTA A TABELA INTERATIVA */

function renderTable(rows, sheetName) {
    const columnCount = rows.reduce(function (largestColumnCount, row) {
        return Math.max(largestColumnCount, row.length);
    }, 0);

    if (columnCount === 0) {
        throw new Error("A primeira aba do arquivo não possui dados.");
    }

    const headerValues = rows[0] ?? [];

    tableState.sheetName = sheetName;

    tableState.columnCount = columnCount;

    tableState.headers = Array.from(
        {
            length: columnCount,
        },

        function (unusedValue, columnIndex) {
            return (
                formatCellValue(headerValues[columnIndex]).trim() ||
                `Coluna ${columnIndex + 1}`
            );
        },
    );

    tableState.rows = rows.slice(1);

    tableState.columnProfiles = tableState.headers.map(
        function (unusedHeader, columnIndex) {
            return detectColumnProfile(columnIndex);
        },
    );

    tableState.columnValueCounts =
        tableState.headers.map(
            function (unusedHeader, columnIndex) {
                return createColumnValueCounts(
                    columnIndex,
                );
            },
        );

    /* TODAS AS COLUNAS COMEÇAM VISÍVEIS */

    tableState.visibleColumns = new Set(
        tableState.headers.map(function (unusedHeader, columnIndex) {
            return columnIndex;
        }),
    );

    tableState.analysisModes = new Map(
        tableState.columnProfiles.map(function (profile, columnIndex) {
            return [columnIndex, profile.type];
        }),
    );

    tableState.selectedAnalysisColumns.clear();

    tableState.filters = Array.from(
        {
            length: columnCount,
        },

        function () {
            return createEmptyColumnFilter();
        },
    );

    tableState.sortColumn = null;

    tableState.sortDirection = "asc";

    renderVisibleColumnSelector();

    renderAnalysisColumnSelector();

    renderTableHeader();

    renderTableBody();

    preview.hidden = false;
}

/* LIMPA O ESTADO DA TABELA */

function resetTableState() {
    tableState.sheetName = "";

    tableState.headers = [];

    tableState.rows = [];

    tableState.columnProfiles = [];

    tableState.visibleColumns.clear();

    tableState.analysisModes.clear();

    tableState.selectedAnalysisColumns.clear();

    tableState.filters = [];

    tableState.columnValueCounts = [];

    tableState.columnCount = 0;

    tableState.sortColumn = null;

    tableState.sortDirection = "asc";
}

/* LIMPA A ANÁLISE RÁPIDA */

function clearQuickAnalysis() {
    quickAnalysis.hidden = true;

    totalRecords.textContent = "0";

    analysisColumns.replaceChildren();

    visibleColumns.replaceChildren();

    visibleColumnCount.textContent = "0 de 0";

    analysisCards.replaceChildren();

    analysisResults.replaceChildren();

    analysisEmpty.hidden = false;

    selectAllColumnsButton.disabled = true;

    clearColumnsButton.disabled = true;

    showAllColumnsButton.disabled = true;

    hideAllColumnsButton.disabled = true;

    hideEmptyColumnsButton.disabled = true;
}

/* REMOVE OS DADOS DA TELA */

function clearImportedFile() {
    const tableHead = table.querySelector("thead");

    const tableBody = table.querySelector("tbody");

    fileInput.value = "";

    tableHead.replaceChildren();

    tableBody.replaceChildren();

    resetTableState();

    clearQuickAnalysis();

    previewSummary.textContent = "";

    preview.hidden = true;

    clearButton.disabled = true;

    setStatus(
        "Nenhum arquivo selecionado. O arquivo será lido somente neste navegador.",
    );
}

/* LÊ O ARQUIVO SELECIONADO */

async function readSelectedFile(file) {
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

    const fileData = await file.arrayBuffer();

    const workbook = window.XLSX.read(fileData, {
        cellDates: true,
        cellFormula: false,
    });

    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
        throw new Error("O arquivo não possui nenhuma aba.");
    }

    const worksheet = workbook.Sheets[sheetName];

    const rows = window.XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: "",
        raw: false,
        blankrows: false,
    });

    if (rows.length === 0) {
        throw new Error("A primeira aba do arquivo está vazia.");
    }

    renderTable(rows, sheetName);

    clearButton.disabled = false;

    setStatus(`Arquivo "${file.name}" carregado localmente com sucesso.`);
}

/* INICIALIZA O IMPORTADOR */

function initializeStatisticsImporter() {
    if (
        !fileInput ||
        !clearButton ||
        !fileStatus ||
        !preview ||
        !previewSummary ||
        !table ||
        !visibleColumns ||
        !visibleColumnCount ||
        !showAllColumnsButton ||
        !hideAllColumnsButton ||
        !hideEmptyColumnsButton ||
        !quickAnalysis ||
        !analysisColumns ||
        !selectAllColumnsButton ||
        !clearColumnsButton ||
        !totalRecords ||
        !analysisCards ||
        !analysisResults ||
        !analysisEmpty
    ) {
        console.error(
            "Elementos do importador de Estatísticas não foram encontrados.",
        );

        return;
    }

    if (!window.XLSX) {
        fileInput.disabled = true;

        setStatus(
            "Não foi possível carregar a biblioteca de leitura de planilhas.",
            true,
        );

        return;
    }

    fileInput.addEventListener("change", async function () {
        const file = fileInput.files?.[0];

        if (!file) {
            return;
        }

        setStatus(`Lendo "${file.name}"...`);

        try {
            await readSelectedFile(file);
        } catch (error) {
            table.querySelector("thead").replaceChildren();

            table.querySelector("tbody").replaceChildren();

            resetTableState();

            clearQuickAnalysis();

            previewSummary.textContent = "";

            preview.hidden = true;

            clearButton.disabled = false;

            setStatus(
                error instanceof Error
                    ? error.message
                    : "Não foi possível ler o arquivo selecionado.",
                true,
            );
        }
    });

    clearButton.addEventListener("click", clearImportedFile);

    selectAllColumnsButton.addEventListener("click", function () {
        tableState.selectedAnalysisColumns = new Set(getVisibleColumnIndexes());

        renderAnalysisColumnSelector();

        renderQuickAnalysis(getFilteredRows());
    });

    clearColumnsButton.addEventListener("click", function () {
        tableState.selectedAnalysisColumns.clear();

        renderAnalysisColumnSelector();

        renderQuickAnalysis(getFilteredRows());
    });

    showAllColumnsButton.addEventListener("click", function () {
        tableState.visibleColumns = new Set(
            tableState.headers.map(function (unusedHeader, columnIndex) {
                return columnIndex;
            }),
        );

        refreshVisibleColumns();
    });

    hideAllColumnsButton.addEventListener("click", function () {
        tableState.visibleColumns.clear();

        refreshVisibleColumns();
    });

    hideEmptyColumnsButton.addEventListener("click", function () {
        tableState.columnProfiles.forEach(function (profile, columnIndex) {
            if (profile.type === "empty") {
                tableState.visibleColumns.delete(columnIndex);
            }
        });

        refreshVisibleColumns();
    });
}

/* INICIALIZA */

initializeStatisticsImporter();
