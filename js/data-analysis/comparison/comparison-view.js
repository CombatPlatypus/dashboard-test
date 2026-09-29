import {
    refreshSelectControl,
} from "../core/select-control.js";

import {
    getComparisonStatusLabel,
} from "./comparison-model.js";

function requireElement(
    rootElement,
    selector,
) {
    const element =
        rootElement.querySelector(
            selector,
        );

    if (!element) {
        throw new Error(
            `Elemento da comparação não encontrado: ${selector}`,
        );
    }

    return element;
}

function getComparisonElements(
    rootElement,
) {
    return Object.freeze({
        cards:
            requireElement(
                rootElement,
                "#analysisComparisonCards",
            ),
        clearButton:
            requireElement(
                rootElement,
                "#statisticsComparisonClear",
            ),
        comparisonColumn:
            requireElement(
                rootElement,
                "#analysisComparisonColumn",
            ),
        conditionColumn:
            requireElement(
                rootElement,
                "#statisticsComparisonConditionColumn",
            ),
        conditionValue:
            requireElement(
                rootElement,
                "#statisticsComparisonConditionValue",
            ),
        duplicateCount:
            requireElement(
                rootElement,
                "#statisticsComparisonDuplicateCount",
            ),
        emptyState:
            requireElement(
                rootElement,
                "#analysisComparisonEmpty",
            ),
        emptyStateText:
            requireElement(
                rootElement,
                "#analysisComparisonEmpty h3",
            ),
        foundCount:
            requireElement(
                rootElement,
                "#statisticsComparisonFoundCount",
            ),
        foundTitle:
            requireElement(
                rootElement,
                "#statisticsComparisonFoundTitle",
            ),
        input:
            requireElement(
                rootElement,
                "#statisticsComparisonInput",
            ),
        invalidCount:
            requireElement(
                rootElement,
                "#statisticsComparisonInvalidCount",
            ),
        lineCount:
            requireElement(
                rootElement,
                "#statisticsComparisonLineCount",
            ),
        notFoundCount:
            requireElement(
                rootElement,
                "#statisticsComparisonNotFoundCount",
            ),
        outsideCard:
            requireElement(
                rootElement,
                "#statisticsComparisonOutsideCard",
            ),
        outsideCount:
            requireElement(
                rootElement,
                "#statisticsComparisonOutsideCount",
            ),
        rate:
            requireElement(
                rootElement,
                "#statisticsComparisonRate",
            ),
        results:
            requireElement(
                rootElement,
                "#analysisComparisonResults",
            ),
        search:
            requireElement(
                rootElement,
                "#analysisComparisonSearch",
            ),
        validCount:
            requireElement(
                rootElement,
                "#statisticsComparisonValidCount",
            ),
    });
}

function createTextElement(
    tagName,
    text,
    className = "",
) {
    const element =
        document.createElement(
            tagName,
        );

    element.textContent = text;

    if (className) {
        element.classList.add(
            className,
        );
    }

    return element;
}

function replaceSelectOptions({
    select,
    placeholder,
    options,
    selectedValue,
}) {
    const fragment =
        document.createDocumentFragment();

    const placeholderOption =
        document.createElement(
            "option",
        );

    placeholderOption.value = "";
    placeholderOption.textContent =
        placeholder;

    fragment.appendChild(
        placeholderOption,
    );

    options.forEach(
        function (optionData) {
            const option =
                document.createElement(
                    "option",
                );

            option.value =
                String(
                    optionData.value,
                );

            option.textContent =
                optionData.label;

            fragment.appendChild(
                option,
            );
        },
    );

    select.replaceChildren(
        fragment,
    );

    const normalizedSelection =
        selectedValue === null ||
        selectedValue === undefined
            ? ""
            : String(
                selectedValue,
            );

    const selectedOptionExists =
        Array.from(
            select.options,
        ).some(function (option) {
            return (
                option.value ===
                normalizedSelection
            );
        });

    select.value =
        selectedOptionExists
            ? normalizedSelection
            : "";
}

function formatPercentage(value) {
    return new Intl.NumberFormat(
        "pt-BR",
        {
            maximumFractionDigits: 1,
            minimumFractionDigits: 0,
        },
    ).format(value) + "%";
}

function createComparisonTable({
    conditionActive,
    sortColumn,
    sortDirection,
    visibleResults,
}) {
    const container =
        document.createElement(
            "div",
        );

    const table =
        document.createElement(
            "table",
        );

    const tableHead =
        document.createElement(
            "thead",
        );

    const tableBody =
        document.createElement(
            "tbody",
        );

    const headerRow =
        document.createElement(
            "tr",
        );

    const headers = [
        {
            key: "value",
            label: "Valor Informado",
        },
        {
            key: "status",
            label: "Status da Busca",
        },
    ];

    if (conditionActive) {
        headers.push(
            {
                key: "condition",
                label:
                    "Valor da Condição",
            },
        );
    }

    headers.push(
        {
            key: "occurrences",
            label: "Ocorrências",
        },
        {
            key: "lines",
            label: "Linhas",
        },
    );

    headers.forEach(
        function (header) {
            const headerCell =
                document.createElement(
                    "th",
                );

            const sortButton =
                document.createElement(
                    "button",
                );

            const indicator =
                createTextElement(
                    "span",
                    sortColumn ===
                        header.key
                        ? sortDirection ===
                            "asc"
                            ? "↑"
                            : "↓"
                        : "↕",
                    "analysis-sort-indicator",
                );

            sortButton.type =
                "button";

            sortButton.classList.add(
                "analysis-sort-button",
            );

            sortButton.dataset
                .comparisonSortColumn =
                    header.key;

            sortButton.setAttribute(
                "aria-label",
                `Ordenar por ${header.label}`,
            );

            sortButton.append(
                document.createTextNode(
                    header.label,
                ),
                indicator,
            );

            if (
                sortColumn ===
                header.key
            ) {
                headerCell.setAttribute(
                    "aria-sort",
                    sortDirection ===
                        "asc"
                        ? "ascending"
                        : "descending",
                );
            }

            headerCell.appendChild(
                sortButton,
            );

            headerRow.appendChild(
                headerCell,
            );
        },
    );

    tableHead.appendChild(
        headerRow,
    );

    if (
        visibleResults.length === 0
    ) {
        const emptyRow =
            document.createElement(
                "tr",
            );

        const emptyCell =
            createTextElement(
                "td",
                "Nenhum resultado encontrado para a busca.",
                "analysis-comparison-empty-row",
            );

        emptyCell.colSpan =
            headers.length;

        emptyRow.appendChild(
            emptyCell,
        );

        tableBody.appendChild(
            emptyRow,
        );
    } else {
        const fragment =
            document.createDocumentFragment();

        visibleResults.forEach(
            function (result) {
                const row =
                    document.createElement(
                        "tr",
                    );

                row.classList.add(
                    result.status ===
                        "notFound"
                        ? "is-not-found"
                        : `is-${result.status}`,
                );

                row.append(
                    createTextElement(
                        "td",
                        result.value,
                    ),
                    createTextElement(
                        "td",
                        getComparisonStatusLabel(
                            result,
                        ),
                    ),
                );

                if (conditionActive) {
                    row.appendChild(
                        createTextElement(
                            "td",
                            result
                                .conditionValues
                                .length > 0
                                ? result
                                    .conditionValues
                                    .join(", ")
                                : "—",
                        ),
                    );
                }

                row.append(
                    createTextElement(
                        "td",
                        String(
                            result.occurrences,
                        ),
                        "analysis-comparison-number",
                    ),
                    createTextElement(
                        "td",
                        result.lines.length >
                            0
                            ? result.lines
                                .join(", ")
                            : "—",
                    ),
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

    container.classList.add(
        "analysis-table-container",
        "analysis-comparison-table-container",
    );

    table.classList.add(
        "analysis-comparison-table",
    );

    table.id =
        "analysisComparisonTable";

    table.append(
        tableHead,
        tableBody,
    );

    container.appendChild(
        table,
    );

    return container;
}

function getEmptyStateMessage({
    comparableColumnCount,
    conditionColumnIndex,
    conditionValue,
    hasDataset,
    inputData,
    selectedColumnIndex,
}) {
    if (!hasDataset) {
        return "Importe uma planilha para começar a comparação.";
    }

    if (comparableColumnCount === 0) {
        return "Selecione ao menos uma coluna na visualização da planilha para gerar a comparação.";
    }

    if (
        !Number.isInteger(
            selectedColumnIndex,
        )
    ) {
        return "Selecione a coluna em que os valores devem ser localizados.";
    }

    if (inputData.validCount === 0) {
        return "Informe ao menos um valor válido para realizar a comparação.";
    }

    if (
        Number.isInteger(
            conditionColumnIndex,
        ) &&
        conditionValue === ""
    ) {
        return "Selecione o valor que deve ser usado na condição.";
    }

    return "Nenhum resultado disponível para a comparação.";
}

function createComparisonView(
    elements,
) {
    function render(viewState) {
        const dataset =
            viewState.previewSnapshot
                ?.dataset ?? null;

        const columnOptions =
            viewState.comparableColumnIndexes
                .map(function (
                    columnIndex,
                ) {
                    return {
                        label:
                            dataset.headers[
                                columnIndex
                            ],
                        value:
                            columnIndex,
                    };
                });

        const conditionColumnOptions =
            viewState.comparableColumnIndexes
                .filter(function (
                    columnIndex,
                ) {
                    return (
                        columnIndex !==
                        viewState
                            .selectedColumnIndex
                    );
                })
                .map(function (
                    columnIndex,
                ) {
                    return {
                        label:
                            dataset.headers[
                                columnIndex
                            ],
                        value:
                            columnIndex,
                    };
                });

        replaceSelectOptions({
            options: columnOptions,
            placeholder:
                "Selecione uma coluna",
            select:
                elements.comparisonColumn,
            selectedValue:
                viewState.selectedColumnIndex,
        });

        replaceSelectOptions({
            options:
                conditionColumnOptions,
            placeholder:
                "Nenhuma condição",
            select:
                elements.conditionColumn,
            selectedValue:
                viewState.conditionColumnIndex,
        });

        replaceSelectOptions({
            options:
                viewState
                    .conditionValueOptions,
            placeholder:
                "Selecione um valor",
            select:
                elements.conditionValue,
            selectedValue:
                viewState.conditionValue,
        });

        const hasDataset =
            Boolean(dataset);

        const hasSelectedColumn =
            Number.isInteger(
                viewState
                    .selectedColumnIndex,
            );

        const hasConditionColumn =
            Number.isInteger(
                viewState
                    .conditionColumnIndex,
            );

        const hasResults =
            viewState.results.length >
            0;

        elements.comparisonColumn
            .disabled =
                !hasDataset ||
                columnOptions.length === 0;

        elements.conditionColumn
            .disabled =
                !hasSelectedColumn ||
                conditionColumnOptions
                    .length === 0;

        elements.conditionValue
            .disabled =
                !hasConditionColumn ||
                viewState
                    .conditionValueOptions
                    .length === 0;

        elements.input.disabled =
            !hasSelectedColumn;

        elements.clearButton
            .disabled =
                viewState.inputValue
                    .length === 0;

        elements.search.disabled =
            !hasResults;

        refreshSelectControl(
            elements.comparisonColumn,
        );

        refreshSelectControl(
            elements.conditionColumn,
        );

        refreshSelectControl(
            elements.conditionValue,
        );

        const lineLabel =
            viewState.inputData
                .lineCount === 1
                ? "linha"
                : "linhas";

        elements.lineCount.textContent =
            `${viewState.inputData.lineCount} ${lineLabel}`;

        elements.validCount.textContent =
            String(
                viewState.inputData
                    .validCount,
            );

        elements.duplicateCount
            .textContent =
                String(
                    viewState.inputData
                        .duplicateCount,
                );

        elements.invalidCount
            .textContent =
                String(
                    viewState.inputData
                        .invalidCount,
                );

        elements.foundTitle.textContent =
            viewState.conditionActive
                ? "Correspondem"
                : "Encontrados";

        elements.foundCount.textContent =
            String(
                viewState.summary
                    .foundCount,
            );

        elements.outsideCount.textContent =
            String(
                viewState.summary
                    .outsideCount,
            );

        elements.notFoundCount
            .textContent =
                String(
                    viewState.summary
                        .notFoundCount,
                );

        elements.rate.textContent =
            formatPercentage(
                viewState.summary
                    .correspondenceRate,
            );

        elements.outsideCard.hidden =
            !viewState.conditionActive;

        elements.cards.hidden =
            !hasResults;

        elements.search.hidden =
            !hasResults;

        elements.results.hidden =
            !hasResults;

        elements.emptyState.hidden =
            !hasDataset ||
            hasResults;

        elements.emptyStateText
            .textContent =
                getEmptyStateMessage({
                    comparableColumnCount:
                        viewState
                            .comparableColumnIndexes
                            .length,
                    conditionColumnIndex:
                        viewState
                            .conditionColumnIndex,
                    conditionValue:
                        viewState
                            .conditionValue,
                    hasDataset,
                    inputData:
                        viewState.inputData,
                    selectedColumnIndex:
                        viewState
                            .selectedColumnIndex,
                });

        elements.results
            .replaceChildren();

        if (hasResults) {
            elements.results
                .appendChild(
                    createComparisonTable({
                        conditionActive:
                            viewState
                                .conditionActive,
                        sortColumn:
                            viewState
                                .sortColumn,
                        sortDirection:
                            viewState
                                .sortDirection,
                        visibleResults:
                            viewState
                                .visibleResults,
                    }),
                );
        }
    }

    return Object.freeze({
        render,
    });
}

export {
    createComparisonView,
    getComparisonElements,
};
