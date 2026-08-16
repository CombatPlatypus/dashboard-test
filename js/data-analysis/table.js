
/* ELEMENTOS DA PRÉVIA */

const downloadCsvButton =
    document.getElementById(
        "statisticsDownloadCsv",
    );

const downloadXlsxButton =
    document.getElementById(
        "statisticsDownloadXlsx",
    );

const preview = document.getElementById("statisticsLocalPreview");

const previewSummary = document.getElementById(
    "statisticsPreviewSummary",
);

const previewLimit = document.getElementById(
    "statisticsPreviewLimit",
);

const table = document.getElementById("statisticsLocalTable");

/* ELEMENTOS DO CONTROLE DE COLUNAS VISÍVEIS */

const visibleColumns =
    document.getElementById(
        "statisticsVisibleColumns",
    );

const visibleColumnCount =
    document.getElementById(
        "statisticsVisibleColumnCount",
    );

const showAllColumnsButton =
    document.getElementById(
        "statisticsShowAllColumns",
    );

const hideAllColumnsButton =
    document.getElementById(
        "statisticsHideAllColumns",
    );

const hideEmptyColumnsButton =
    document.getElementById(
        "statisticsHideEmptyColumns",
    );

const clearFiltersButton =
    document.getElementById(
        "statisticsClearFilters",
    );

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
    label,) {
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
    comparisonValue,) {
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

/* ATUALIZA O ESTADO DOS BOTÕES DE DOWNLOAD */

function setDownloadButtonsDisabled(
    disabled,) {
    downloadCsvButton.disabled =
        disabled;

    downloadXlsxButton.disabled =
        disabled;
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

/* RETORNA O ÍCONE DA ORDENAÇÃO */

function getSortIndicator(
    columnIndex,) {
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

/* MONTA A TABELA INTERATIVA */

function renderTable(
    rows,
    sheetName,) {
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

    showComparisonPanel();
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