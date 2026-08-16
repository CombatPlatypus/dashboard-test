/* ELEMENTOS DA COMPARAÇÃO DE DADOS */

const comparisonPanel = document.getElementById("statisticsComparisonPanel");
const comparisonSummary = document.getElementById("statisticsComparisonSummary");
const comparisonColumn = document.getElementById("statisticsComparisonColumn");
const comparisonConditionColumn = document.getElementById("statisticsComparisonConditionColumn");
const comparisonConditionValue = document.getElementById("statisticsComparisonConditionValue");
const comparisonInput = document.getElementById("statisticsComparisonInput");
const comparisonLineCount = document.getElementById("statisticsComparisonLineCount");
const comparisonValidCount = document.getElementById("statisticsComparisonValidCount");
const comparisonDuplicateCount = document.getElementById("statisticsComparisonDuplicateCount");
const comparisonInvalidCount = document.getElementById("statisticsComparisonInvalidCount");
const comparisonClearButton = document.getElementById("statisticsComparisonClear");
const comparisonFoundCount = document.getElementById("statisticsComparisonFoundCount");
const comparisonFoundTitle = document.getElementById("statisticsComparisonFoundTitle");
const comparisonOutsideCard = document.getElementById("statisticsComparisonOutsideCard");
const comparisonOutsideCount = document.getElementById("statisticsComparisonOutsideCount");
const comparisonNotFoundCount = document.getElementById("statisticsComparisonNotFoundCount");
const comparisonRate = document.getElementById("statisticsComparisonRate");
const comparisonEmpty = document.getElementById("statisticsComparisonEmpty");
const comparisonPreview = document.getElementById("statisticsComparisonPreview");
const comparisonSearch = document.getElementById("statisticsComparisonSearch");
const comparisonExportButton = document.getElementById("statisticsComparisonExport");
const comparisonTable = document.getElementById("statisticsComparisonTable");

/* ESTADO DE COMPARAÇÃO */

const comparisonState = {
    results: [],
    timer: null,

    sortColumn: "status",
    sortDirection: "asc",
};

/* LÊ OS VALORES INFORMADOS PARA COMPARAÇÃO */

function readComparisonInput() {
    const inputValue = comparisonInput.value.replace(/\r/g, "");

    if (!inputValue.trim()) {
        return {
            lineCount: 0,
            validCount: 0,
            duplicateCount: 0,
            invalidCount: 0,
            values: [],
        };
    }

    const lines = inputValue.replace(/\n+$/, "").split("\n");
    const valueCounts = new Map();
    const values = [];
    let invalidCount = 0;

    lines.forEach(function (line) {
        const displayValue = line.trim();
        const normalizedValue = normalizeSearchValue(displayValue).trim();

        if (!normalizedValue) {
            invalidCount += 1;
            return;
        }

        const currentCount = valueCounts.get(normalizedValue) ?? 0;

        valueCounts.set(normalizedValue, currentCount + 1);

        if (currentCount === 0) {
            values.push({
                value: displayValue,
                normalizedValue,
            });
        }
    });

    let duplicateCount = 0;

    valueCounts.forEach(function (count) {
        duplicateCount += Math.max(0, count - 1);
    });

    return {
        lineCount: lines.length,
        validCount: values.length,
        duplicateCount,
        invalidCount,
        values,
    };
}

/* ATUALIZA AS CONTAGENS DA LISTA */

function updateComparisonInputSummary() {
    const inputData = readComparisonInput();
    const lineLabel = inputData.lineCount === 1 ? "linha" : "linhas";

    comparisonLineCount.textContent =
        `${inputData.lineCount} ${lineLabel}`;

    comparisonValidCount.textContent =
        String(inputData.validCount);

    comparisonDuplicateCount.textContent =
        String(inputData.duplicateCount);

    comparisonInvalidCount.textContent =
        String(inputData.invalidCount);

    comparisonClearButton.disabled =
        comparisonInput.value.length === 0;
}

/* LIMPA OS RESULTADOS DA COMPARAÇÃO */

function resetComparisonResults() {
    
    window.clearTimeout(comparisonState.timer);
    comparisonState.timer = null;
    comparisonState.results = [];

    comparisonFoundTitle.textContent = "Encontrados";
    comparisonOutsideCount.textContent = "0";
    comparisonOutsideCard.hidden = true;

    comparisonFoundCount.textContent = "0";
    comparisonNotFoundCount.textContent = "0";
    comparisonRate.textContent = "0%";

    comparisonSearch.value = "";
    comparisonExportButton.disabled = true;

    comparisonTable
        .querySelector("tbody")
        .replaceChildren();

    comparisonPreview.hidden = true;
    comparisonEmpty.hidden = false;
}

/* ATUALIZA OS CONTROLES DISPONÍVEIS DA COMPARAÇÃO */

function updateComparisonControlsState() {
    const hasComparisonColumn =
        comparisonColumn.value !== "";

    comparisonConditionColumn.disabled =
        !hasComparisonColumn;

    comparisonInput.disabled =
        !hasComparisonColumn;

    comparisonConditionValue.disabled =
        !hasComparisonColumn ||
        comparisonConditionColumn.value === "" ||
        comparisonConditionValue.options.length <= 1;

    updateComparisonSelect(
        comparisonConditionColumn,
    );

    updateComparisonSelect(
        comparisonConditionValue,
    );
}

/* VERIFICA SE EXISTE UMA CONDIÇÃO COMPLETA */

function isComparisonConditionActive() {
    return (
        comparisonConditionColumn.value !== "" &&
        comparisonConditionValue.value !== ""
    );
}

/* RETORNA O TEXTO DO STATUS DA COMPARAÇÃO */

function getComparisonStatusLabel(result) {
    if (result.status === "outside") {
        return "Fora da condição";
    }

    if (result.status === "notFound") {
        return "Não encontrado";
    }

    return result.conditionActive
        ? "Corresponde à condição"
        : "Encontrado";
}

/* CRIA UM ÍNDICE DA COLUNA ESCOLHIDA */

function createComparisonColumnIndex(
    columnIndex,
    conditionColumnIndex = null,
    conditionValue = "",) {
    const columnIndexMap = new Map();

    const conditionActive =
        Number.isInteger(conditionColumnIndex) &&
        conditionValue !== "";

    tableState.rows.forEach(function (row, rowIndex) {
        const originalValue =
            formatCellValue(
                row[columnIndex],
            ).trim();

        const normalizedValue =
            normalizeSearchValue(
                originalValue,
            ).trim();

        if (!normalizedValue) {
            return;
        }

        if (!columnIndexMap.has(normalizedValue)) {
            columnIndexMap.set(normalizedValue, {
                totalOccurrences: 0,
                matchedOccurrences: 0,
                allLines: [],
                matchedLines: [],
                conditionValues: new Set(),
                matchedConditionValues: new Set(),
            });
        }

        const indexedValue =
            columnIndexMap.get(normalizedValue);

        const spreadsheetLine =
            rowIndex + 2;

        indexedValue.totalOccurrences += 1;
        indexedValue.allLines.push(spreadsheetLine);

        if (!conditionActive) {
            indexedValue.matchedOccurrences += 1;
            indexedValue.matchedLines.push(spreadsheetLine);
            return;
        }

        const displayConditionValue =
            formatCellValue(
                row[conditionColumnIndex],
            ).trim();

        const normalizedConditionValue =
            normalizeSearchValue(
                displayConditionValue,
            ).trim();

        indexedValue.conditionValues.add(
            displayConditionValue ||
            "Célula vazia",
        );

        if (
            normalizedConditionValue ===
            conditionValue
        ) {
            indexedValue.matchedOccurrences += 1;
            indexedValue.matchedLines.push(spreadsheetLine);

            indexedValue.matchedConditionValues.add(
                displayConditionValue,
            );
        }
    });

    return columnIndexMap;
}

/* MONTA UMA LINHA DO RESULTADO */

function createComparisonResultRow(result) {
    const row = document.createElement("tr");

    const informedValueCell =
        createCell("td", result.value);

    const statusCell =
        createCell(
            "td",
            getComparisonStatusLabel(result),
        );

    const conditionCell =
        createCell(
            "td",
            result.conditionValues.length
                ? result.conditionValues.join(", ")
                : "—",
        );

    const occurrencesCell =
        createCell(
            "td",
            result.occurrences,
        );

    const linesCell =
        createCell(
            "td",
            result.lines.length
                ? result.lines.join(", ")
                : "—",
        );

    row.classList.add(
        result.status === "found"
            ? "is-found"
            : result.status === "outside"
                ? "is-outside"
                : "is-not-found",
    );

    row.append(
        informedValueCell,
        statusCell,
        conditionCell,
        occurrencesCell,
        linesCell,
    );

    return row;
}

/* RETORNA O INDICADOR DA ORDENAÇÃO DA COMPARAÇÃO */

function getComparisonSortIndicator(column) {
    if (
        comparisonState.sortColumn !==
        column
    ) {
        return "↕";
    }

    return comparisonState.sortDirection ===
        "asc"
        ? "↑"
        : "↓";
}

/* ALTERA A ORDENAÇÃO DA COMPARAÇÃO */

function changeComparisonSort(column) {
    if (
        comparisonState.sortColumn ===
        column
    ) {
        comparisonState.sortDirection =
            comparisonState.sortDirection ===
            "asc"
                ? "desc"
                : "asc";
    } else {
        comparisonState.sortColumn =
            column;

        comparisonState.sortDirection =
            "asc";
    }

    renderComparisonTableHeader();
    filterComparisonResults();
}

/* MONTA O CABEÇALHO ORDENÁVEL DA COMPARAÇÃO */

function renderComparisonTableHeader() {
    const tableHead =
        comparisonTable.querySelector(
            "thead",
        );

    const headerRow =
        document.createElement("tr");

    const columns = [
        [
            "value",
            "Valor Informado",
        ],
        [
            "status",
            "Status",
        ],
        [
            "condition",
            "Valor da Condição",
        ],
        [
            "occurrences",
            "Ocorrências",
        ],
        [
            "lines",
            "Linhas",
        ],
    ];

    columns.forEach(
        function ([column, label]) {
            const headerCell =
                document.createElement(
                    "th",
                );

            const sortButton =
                document.createElement(
                    "button",
                );

            const indicator =
                document.createElement(
                    "span",
                );

            sortButton.type = "button";

            sortButton.classList.add(
                "statistics-sort-button",
            );

            sortButton.setAttribute(
                "aria-label",
                `Ordenar por ${label}`,
            );

            indicator.classList.add(
                "statistics-sort-indicator",
            );

            indicator.textContent =
                getComparisonSortIndicator(
                    column,
                );

            sortButton.append(
                document.createTextNode(
                    label,
                ),
                indicator,
            );

            sortButton.addEventListener(
                "click",
                function () {
                    changeComparisonSort(
                        column,
                    );
                },
            );

            headerCell.appendChild(
                sortButton,
            );

            headerRow.appendChild(
                headerCell,
            );
        },
    );

    tableHead.replaceChildren(
        headerRow,
    );
}

/* ORDENA OS RESULTADOS DA COMPARAÇÃO */

function sortComparisonResults(results) {
    const statusOrder = {
        found: 0,
        outside: 1,
        notFound: 2,
    };

    const getSortValue =
        function (result) {
            switch (
                comparisonState.sortColumn
            ) {
                case "value":
                    return result.value;

                case "condition":
                    return result
                        .conditionValues
                        .join(", ");

                case "occurrences":
                    return result.occurrences;

                case "lines":
                    return (
                        result.lines[0] ??
                        Number.MAX_SAFE_INTEGER
                    );

                default:
                    return statusOrder[
                        result.status
                    ];
            }
        };

    return [...results].sort(
        function (
            firstResult,
            secondResult,
        ) {
            const firstValue =
                getSortValue(
                    firstResult,
                );

            const secondValue =
                getSortValue(
                    secondResult,
                );

            const comparison =
                typeof firstValue ===
                    "number" &&
                typeof secondValue ===
                    "number"
                    ? firstValue -
                        secondValue
                    : String(
                        firstValue,
                    ).localeCompare(
                        String(
                            secondValue,
                        ),
                        "pt-BR",
                        {
                            numeric: true,
                            sensitivity:
                                "base",
                        },
                    );

            return comparisonState
                .sortDirection ===
                "asc"
                ? comparison
                : -comparison;
        },
    );
}

/* EXIBE OS RESULTADOS NA TABELA */

function renderComparisonResults(
    results = comparisonState.results,) {
    const tableBody =
        comparisonTable.querySelector(
            "tbody",
        );

    const fragment =
        document.createDocumentFragment();

    tableBody.replaceChildren();

    sortComparisonResults(
        results,
    ).forEach(
        function (result) {
            fragment.appendChild(
                createComparisonResultRow(
                    result,
                ),
            );
        },
    );

    tableBody.appendChild(
        fragment,
    );
}

/* PROGRAMA A COMPARAÇÃO AUTOMÁTICA */

function scheduleComparison() {
    window.clearTimeout(comparisonState.timer);

    const inputData = readComparisonInput();

    const incompleteCondition =
        comparisonConditionColumn.value !== "" &&
        comparisonConditionValue.value === "";

    if (
        comparisonColumn.value === "" ||
        inputData.validCount === 0 ||
        incompleteCondition
    ) {
        resetComparisonResults();
        return;
    }

    comparisonState.timer = window.setTimeout(
        executeComparison,
        250,
    );
}

/* EXECUTA A COMPARAÇÃO */

function executeComparison() {
    const selectedColumn =
        comparisonColumn.value;

    const columnIndex =
        Number(selectedColumn);

    const inputData =
        readComparisonInput();

    const conditionActive =
        isComparisonConditionActive();

    const conditionColumnIndex =
        conditionActive
            ? Number(
                comparisonConditionColumn.value,
            )
            : null;

    const conditionValue =
        conditionActive
            ? comparisonConditionValue.value
            : "";

    if (
        selectedColumn === "" ||
        !Number.isInteger(columnIndex) ||
        columnIndex < 0 ||
        columnIndex >= tableState.headers.length ||
        inputData.validCount === 0 ||
        (
            conditionActive &&
            (
                !Number.isInteger(conditionColumnIndex) ||
                conditionColumnIndex < 0 ||
                conditionColumnIndex >= tableState.headers.length
            )
        )
    ) {
        return;
    }

    comparisonState.timer = null;

    const columnIndexMap =
        createComparisonColumnIndex(
            columnIndex,
            conditionColumnIndex,
            conditionValue,
        );

    comparisonState.results =
        inputData.values.map(function (inputValue) {
            const indexedValue =
                columnIndexMap.get(
                    inputValue.normalizedValue,
                );

            const exists =
                Boolean(indexedValue);

            const matchesCondition =
                exists &&
                indexedValue.matchedOccurrences > 0;

            const status =
                !exists
                    ? "notFound"
                    : matchesCondition
                        ? "found"
                        : "outside";

            const occurrences =
                status === "found"
                    ? indexedValue.matchedOccurrences
                    : indexedValue?.totalOccurrences ?? 0;

            const lines =
                status === "found"
                    ? indexedValue.matchedLines
                    : indexedValue?.allLines ?? [];

            const conditionValues =
                !conditionActive ||
                !indexedValue
                    ? []
                    : status === "found"
                        ? Array.from(
                            indexedValue.matchedConditionValues,
                        )
                        : Array.from(
                            indexedValue.conditionValues,
                        );

            return {
                value: inputValue.value,
                normalizedValue: inputValue.normalizedValue,
                conditionActive,
                status,
                found: status === "found",
                occurrences,
                lines,
                conditionValues,
            };
        });

    const foundCount =
        comparisonState.results.filter(
            function (result) {
                return result.status === "found";
            },
        ).length;

    const outsideCount =
        comparisonState.results.filter(
            function (result) {
                return result.status === "outside";
            },
        ).length;

    const notFoundCount =
        comparisonState.results.filter(
            function (result) {
                return result.status === "notFound";
            },
        ).length;

    const correspondenceRate =
        comparisonState.results.length
            ? (
                foundCount /
                comparisonState.results.length *
                100
            )
            : 0;

    comparisonFoundTitle.textContent =
        conditionActive
            ? "Correspondem"
            : "Encontrados";

    comparisonFoundCount.textContent =
        String(foundCount);

    comparisonOutsideCount.textContent =
        String(outsideCount);

    comparisonNotFoundCount.textContent =
        String(notFoundCount);

    comparisonRate.textContent =
        correspondenceRate.toLocaleString(
            "pt-BR",
            {
                minimumFractionDigits: 0,
                maximumFractionDigits: 1,
            },
        ) + "%";

    comparisonOutsideCard.hidden =
        !conditionActive;

    comparisonEmpty.hidden = true;
    comparisonPreview.hidden = false;
    comparisonExportButton.disabled = false;

    renderComparisonResults();
}

/* RETORNA OS RESULTADOS VISÍVEIS DA COMPARAÇÃO */

function getVisibleComparisonResults() {
    const searchValue =
        normalizeSearchValue(
            comparisonSearch.value,
        ).trim();

    if (!searchValue) {
        return sortComparisonResults(
            comparisonState.results,
        );
    }

    return sortComparisonResults(
        comparisonState.results.filter(
            function (result) {
                const searchableValue =
                    [
                        result.value,

                        getComparisonStatusLabel(
                            result,
                        ),

                        result
                            .conditionValues
                            .join(" "),

                        result.occurrences,

                        result.lines.join(
                            " ",
                        ),
                    ].join(" ");

                return normalizeSearchValue(
                    searchableValue,
                ).includes(
                    searchValue,
                );
            },
        ),
    );
}

/* FILTRA A TABELA DE RESULTADOS */

function filterComparisonResults() {
    renderComparisonResults(
        getVisibleComparisonResults(),
    );
}

/* PREPARA OS RESULTADOS DA COMPARAÇÃO PARA EXPORTAÇÃO */

function createComparisonExportData() {
    const visibleResults =
        getVisibleComparisonResults();

    if (visibleResults.length === 0) {
        throw new Error(
            "Nenhum resultado está disponível para baixar.",
        );
    }

    const conditionActive =
        isComparisonConditionActive();

    const headers = conditionActive
        ? [
            "Valor informado",
            "Status",
            "Valor da condição",
            "Ocorrências",
            "Linhas",
        ]
        : [
            "Valor informado",
            "Status",
            "Ocorrências",
            "Linhas",
        ];

    const rows =
        visibleResults.map(
            function (result) {
                const basicResult = [
                    result.value,
                    getComparisonStatusLabel(result),
                ];

                if (conditionActive) {
                    basicResult.push(
                        result.conditionValues.length
                            ? result.conditionValues.join(", ")
                            : "—",
                    );
                }

                basicResult.push(
                    result.occurrences,
                    result.lines.length
                        ? result.lines.join(", ")
                        : "—",
                );

                return basicResult;
            },
        );
}

/* BAIXA OS RESULTADOS DA COMPARAÇÃO */

function downloadComparisonResults() {
    if (!window.XLSX) {
        throw new Error(
            "A biblioteca de planilhas não foi carregada.",
        );
    }

    const exportData =
        createComparisonExportData();

    const worksheet =
        window.XLSX.utils.aoa_to_sheet(
            exportData.matrix,
        );

    worksheet["!cols"] =
        createExportColumnWidths(
            exportData.headers,
            exportData.rows,
        );

    const workbook =
        window.XLSX.utils.book_new();

    window.XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        createSafeSheetName("Comparação"),
    );

    const safeBaseName =
        createSafeFileBaseName(
            tableState.sourceFileName,
        );

    const fileName =
        `${safeBaseName}_comparacao.xlsx`;

    window.XLSX.writeFile(
        workbook,
        fileName,
        {
            compression: true,
        },
    );

    setStatus(
        `Resultado "${fileName}" gerado com ${exportData.rows.length} registros.`,
    );
}

/* LIMPA SOMENTE A LISTA INFORMADA */

function clearComparisonInput() {
    comparisonInput.value = "";

    resetComparisonResults();

    updateComparisonInputSummary();

    comparisonInput.focus();
}

/* ATUALIZA UM SELECT DA COMPARAÇÃO */

function updateComparisonSelect(select) {
    if (
        !window.jQuery ||
        typeof window.jQuery.fn.select2 !== "function"
    ) {
        return;
    }

    const selectElement = window.jQuery(select);

    if (selectElement.hasClass("select2-hidden-accessible")) {
        selectElement.trigger("change.select2");
    } else {
        selectElement.select2({
            width: "100%",
        });
    }
}

/* PREENCHE O SELETOR DA COMPARAÇÃO */

function renderComparisonColumnSelector() {
    const previousColumn = comparisonColumn.value;
    const placeholder = document.createElement("option");

    comparisonColumn.replaceChildren();

    placeholder.value = "";
    placeholder.textContent = "Selecione uma coluna";

    comparisonColumn.appendChild(placeholder);

    tableState.headers.forEach(function (header, columnIndex) {
        if (tableState.columnProfiles[columnIndex].type === "empty") {
            return;
        }

        const option = document.createElement("option");

        option.value = String(columnIndex);
        option.textContent = header;

        comparisonColumn.appendChild(option);
    });

    const previousColumnExists = Array.from(comparisonColumn.options).some(
        function (option) {
            return option.value === previousColumn;
        },
    );

    comparisonColumn.value = previousColumnExists ? previousColumn : "";

    if (
        window.jQuery &&
        typeof window.jQuery.fn.select2 === "function"
    ) {
        const comparisonSelect = window.jQuery(comparisonColumn);

        if (comparisonSelect.hasClass("select2-hidden-accessible")) {
            comparisonSelect.trigger("change.select2");
        } else {
            comparisonSelect.select2({
                width: "100%",
            });
        }
    }
}

/* PREENCHE AS COLUNAS DISPONÍVEIS PARA A CONDIÇÃO */

function renderComparisonConditionColumnSelector() {
    const previousColumn =
        comparisonConditionColumn.value;

    const selectedComparisonColumn =
        comparisonColumn.value;

    const placeholder =
        document.createElement("option");

    comparisonConditionColumn.replaceChildren();

    placeholder.value = "";
    placeholder.textContent = "Nenhuma condição";

    comparisonConditionColumn.appendChild(
        placeholder,
    );

    tableState.headers.forEach(
        function (header, columnIndex) {
            if (
                tableState.columnProfiles[columnIndex].type === "empty" ||
                String(columnIndex) === selectedComparisonColumn
            ) {
                return;
            }

            const option =
                document.createElement("option");

            option.value = String(columnIndex);
            option.textContent = header;

            comparisonConditionColumn.appendChild(
                option,
            );
        },
    );

    const previousColumnExists =
        Array.from(
            comparisonConditionColumn.options,
        ).some(
            function (option) {
                return option.value === previousColumn;
            },
        );

    comparisonConditionColumn.value =
        previousColumnExists
            ? previousColumn
            : "";

    updateComparisonSelect(
        comparisonConditionColumn,
    );

    updateComparisonControlsState();
}

/* PREENCHE OS VALORES DISPONÍVEIS PARA A CONDIÇÃO */

function renderComparisonConditionValueSelector() {
    const previousValue =
        comparisonConditionValue.value;

    const selectedColumn =
        comparisonConditionColumn.value;

    const placeholder =
        document.createElement("option");

    comparisonConditionValue.replaceChildren();

    placeholder.value = "";
    placeholder.textContent = "Selecione um valor";

    comparisonConditionValue.appendChild(
        placeholder,
    );

    if (selectedColumn === "") {
        comparisonConditionValue.disabled =
            true;

        updateComparisonSelect(
            comparisonConditionValue,
        );

        updateComparisonControlsState();

        return;
    }

    const columnIndex =
        Number(selectedColumn);

    const uniqueValues =
        new Map();

    tableState.rows.forEach(
        function (row) {
            const displayValue =
                formatCellValue(
                    row[columnIndex],
                ).trim();

            const normalizedValue =
                normalizeSearchValue(
                    displayValue,
                ).trim();

            if (
                !normalizedValue ||
                uniqueValues.has(normalizedValue)
            ) {
                return;
            }

            uniqueValues.set(
                normalizedValue,
                displayValue,
            );
        },
    );

    Array.from(
        uniqueValues.entries(),
    )
        .sort(
            function (
                firstValue,
                secondValue,
            ) {
                return firstValue[1].localeCompare(
                    secondValue[1],
                    "pt-BR",
                    {
                        numeric: true,
                        sensitivity: "base",
                    },
                );
            },
        )
        .forEach(
            function (
                [normalizedValue, displayValue],
            ) {
                const option =
                    document.createElement("option");

                option.value = normalizedValue;
                option.textContent = displayValue;

                comparisonConditionValue.appendChild(
                    option,
                );
            },
        );

    comparisonConditionValue.disabled =
        uniqueValues.size === 0;

    const previousValueExists =
        Array.from(
            comparisonConditionValue.options,
        ).some(
            function (option) {
                return option.value === previousValue;
            },
        );

    comparisonConditionValue.value =
        previousValueExists
            ? previousValue
            : "";

    updateComparisonSelect(
        comparisonConditionValue,
    );

    updateComparisonControlsState();
}

/* MOSTRA O PAINEL DE COMPARAÇÃO */

function showComparisonPanel() {
    resetComparisonResults();

    comparisonColumn.value = "";

    comparisonConditionColumn.value = "";
    comparisonConditionValue.value = "";

    renderComparisonColumnSelector();
    renderComparisonConditionColumnSelector();
    renderComparisonConditionValueSelector();

    renderComparisonTableHeader();
    updateComparisonControlsState();

    comparisonSummary.textContent =
        `Página: ${tableState.sheetName} / ` +
        `${tableState.rows.length} linhas - ` +
        `${tableState.headers.length} colunas`;

    updateComparisonInputSummary();

    comparisonPanel.hidden = false;
}

/* LIMPA E OCULTA O PAINEL DE COMPARAÇÃO */

function clearComparisonPanel() {
    window.clearTimeout(comparisonState.timer);

    comparisonState.timer = null;
    comparisonState.results = [];

    comparisonFoundTitle.textContent = "Encontrados";
    comparisonOutsideCount.textContent = "0";
    comparisonOutsideCard.hidden = true;

    comparisonInput.value = "";
    comparisonColumn.value = "";
    comparisonConditionColumn.value = "";
    comparisonConditionValue.value = "";

    comparisonConditionValue.disabled = true;
    comparisonConditionColumn.disabled = true;
    comparisonInput.disabled = true;

    comparisonState.sortColumn = "status";
    comparisonState.sortDirection = "asc";

    updateComparisonSelect(comparisonConditionColumn);
    updateComparisonSelect(comparisonConditionValue);
    updateChartSelect2(comparisonColumn);

    comparisonLineCount.textContent = "0 linhas";
    comparisonValidCount.textContent = "0";
    comparisonDuplicateCount.textContent = "0";
    comparisonInvalidCount.textContent = "0";

    comparisonFoundCount.textContent = "0";
    comparisonNotFoundCount.textContent = "0";
    comparisonRate.textContent = "0%";

    comparisonClearButton.disabled = true;
    comparisonExportButton.disabled = true;

    comparisonPreview.hidden = true;
    comparisonEmpty.hidden = false;

    comparisonTable
        .querySelector("tbody")
        .replaceChildren();

    comparisonSummary.textContent =
        "Nenhuma planilha carregada.";

    comparisonPanel.hidden = true;
}