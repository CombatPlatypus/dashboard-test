/* LIMITE DAS TABELAS DE FREQUÊNCIA */

const MAX_FREQUENCY_ROWS = 25;

/* ELEMENTOS DO MÓDULO DE ANÁLISE */

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

/* AGRUPA OS VALORES DE UMA COLUNA */

function createFrequencyData(
    rows,
    columnIndex,) {
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
    totalOccurrences,) {
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
    detectedType,) {
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

/* FORMATA UM PERCENTUAL DA ANÁLISE */

function formatAnalysisPercentage(
    quantity,
    total,) {
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
    hasTime,) {
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
    value,) {
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
    metrics,) {
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
    totalOccurrences,) {
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
    columnIndex,) {
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
                "Valores Diferentes",
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