import {
    formatCellValue,
} from "../core/value-utils.js";

import {
    refreshSelectControl,
} from "../core/select-control.js";

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
            `Elemento da prévia não encontrado: ${selector}`,
        );
    }

    return element;
}

function getPreviewElements(
    rootElement,
) {
    return Object.freeze({
        columnsContainer:
            requireElement(
                rootElement,
                "#spreadsheets-mode .columns",
            ),
        copyButton:
            requireElement(
                rootElement,
                "#analysisCopyButton",
            ),
        emptyState:
            requireElement(
                rootElement,
                "#analysisEmptyState",
            ),
        filterColumn:
            requireElement(
                rootElement,
                "#analysisFilterColumn",
            ),
        filterText:
            requireElement(
                rootElement,
                "#analysisFilterText",
            ),
        hideAllColumnsButton:
            requireElement(
                rootElement,
                "#analysisHideAllColumns",
            ),
        numericOperator:
            requireElement(
                rootElement,
                "#analysisNumericOperator",
            ),
        numericValue:
            requireElement(
                rootElement,
                "#analysisNumericValue",
            ),
        occurrenceFilter:
            requireElement(
                rootElement,
                "#analysisOccurrenceFilter",
            ),
        previewLimit:
            requireElement(
                rootElement,
                "#analysisPreviewLimit",
            ),
        previewSummary:
            requireElement(
                rootElement,
                "#analysisPreviewSummary",
            ),
        previewWaiting:
            requireElement(
                rootElement,
                "#analysisPreviewWaiting",
            ),
        tableContainer:
            requireElement(
                rootElement,
                "#analysisTableContainer",
            ),
        previewTable:
            requireElement(
                rootElement,
                "#analysisPreviewTable",
            ),
        saveButton:
            requireElement(
                rootElement,
                "#analysisSaveButton",
            ),
        showAllColumnsButton:
            requireElement(
                rootElement,
                "#analysisShowAllColumns",
            ),
        visibleColumns:
            requireElement(
                rootElement,
                "#analysisVisibleColumns",
            ),
    });
}

function createCell(
    tagName,
    value,
) {
    const cell =
        document.createElement(
            tagName,
        );

    cell.textContent =
        formatCellValue(value);

    return cell;
}

function createPreviewView(
    elements,
) {
    function renderVisibleColumns(
        snapshot,
    ) {
        elements.columnsContainer
            .classList.toggle(
                "no-file",
                !snapshot.dataset,
            );

        elements.visibleColumns
            .replaceChildren();

        if (!snapshot.dataset) {
            return;
        }

        const fragment =
            document.createDocumentFragment();

        snapshot.dataset.headers
            .forEach(
                function (
                    header,
                    columnIndex,
                ) {
                    const option =
                        document.createElement(
                            "div",
                        );

                    const checkboxControl =
                        document.createElement(
                            "div",
                        );

                    const checkboxLabel =
                        document.createElement(
                            "label",
                        );

                    const columnLabel =
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

                    checkbox.type =
                        "checkbox";
                    checkbox.id =
                        `analysisColumnToggle-${columnIndex}`;
                    checkbox.checked =
                        snapshot
                            .visibleColumnIndexes
                            .includes(
                                columnIndex,
                            );
                    checkbox.dataset
                        .columnIndex =
                            String(
                                columnIndex,
                            );
                    checkbox.setAttribute(
                        "aria-label",
                        `Exibir coluna ${header}`,
                    );

                    checkboxControl.classList
                        .add(
                            "checkbox",
                        );

                    checkboxLabel.htmlFor =
                        checkbox.id;

                    columnLabel.htmlFor =
                        checkbox.id;
                    columnLabel.classList.add(
                        "analysis-column-label",
                    );

                    columnName.textContent =
                        header;
                    columnName.title =
                        header;

                    checkboxControl.append(
                        checkbox,
                        checkboxLabel,
                    );

                    columnLabel.append(
                        columnName,
                    );

                    option.append(
                        checkboxControl,
                        columnLabel,
                    );

                    fragment.appendChild(
                        option,
                    );
                },
            );

        elements.visibleColumns
            .appendChild(fragment);

        elements.showAllColumnsButton
            .disabled =
                snapshot
                    .visibleColumnIndexes
                    .length ===
                snapshot.dataset
                    .columnCount;

        elements.hideAllColumnsButton
            .disabled =
                snapshot
                    .visibleColumnIndexes
                    .length === 0;
    }

    function renderFilterColumnOptions(
        snapshot,
    ) {
        const placeholder =
            document.createElement(
                "option",
            );

        placeholder.value = "";
        placeholder.textContent =
            "Selecione uma coluna";

        elements.filterColumn
            .replaceChildren(
                placeholder,
            );

        if (snapshot.dataset) {
            snapshot
                .visibleColumnIndexes
                .forEach(
                    function (
                        columnIndex,
                    ) {
                        const option =
                            document.createElement(
                                "option",
                            );

                        option.value =
                            String(
                                columnIndex,
                            );
                        option.textContent =
                            snapshot.dataset
                                .headers[
                                    columnIndex
                                ];

                        elements
                            .filterColumn
                            .appendChild(
                                option,
                            );
                    },
                );
        }

        elements.filterColumn.value =
            snapshot
                .selectedFilterColumn ===
                null
                ? ""
                : String(
                    snapshot
                        .selectedFilterColumn,
                );

        elements.filterColumn.disabled =
            !snapshot.dataset ||
            snapshot
                .visibleColumnIndexes
                .length === 0;

        refreshSelectControl(
            elements.filterColumn,
        );
    }

    function renderFilterControls(
        snapshot,
    ) {
        const hasSelectedColumn =
            snapshot.dataset !== null &&
            snapshot
                .selectedFilterColumn !==
                null;

        const selectedProfile =
            hasSelectedColumn
                ? snapshot.dataset
                    .columnProfiles[
                        snapshot
                            .selectedFilterColumn
                    ]
                : null;

        const numericColumn =
            selectedProfile?.type ===
            "number";

        elements.filterText.disabled =
            !hasSelectedColumn;
        elements.occurrenceFilter
            .disabled =
                !hasSelectedColumn;
        elements.numericOperator
            .disabled =
                !numericColumn;
        elements.numericValue.disabled =
            !numericColumn;

        elements.filterText.value =
            hasSelectedColumn
                ? snapshot.currentFilter
                    .text
                : "";

        elements.occurrenceFilter.value =
            hasSelectedColumn
                ? snapshot.currentFilter
                    .occurrence
                : "all";

        elements.numericOperator.value =
            numericColumn
                ? snapshot.currentFilter
                    .numericOperator
                : "";

        elements.numericValue.value =
            numericColumn
                ? snapshot.currentFilter
                    .numericValue
                : "";

        refreshSelectControl(
            elements.occurrenceFilter,
        );

        refreshSelectControl(
            elements.numericOperator,
        );
    }

    function renderSummary(snapshot) {
        if (!snapshot.dataset) {
            elements.previewSummary
                .textContent = "";
            elements.previewSummary.hidden =
                true;

            return;
        }

        const totalRows =
            snapshot.dataset.rows.length;

        const filteredRows =
            snapshot.filteredRows.length;

        const visibleRows =
            snapshot.previewRows.length;

        const rowMessage =
            snapshot.hasActiveFilters
                ? `${filteredRows} de ${totalRows} linhas`
                : `${totalRows} linhas`;

        const previewMessage =
            visibleRows < filteredRows
                ? ` / exibindo ${visibleRows}`
                : "";

        elements.previewSummary
            .textContent =
                `Página: ${snapshot.dataset.sheetName} / ${rowMessage}${previewMessage} / ${snapshot.visibleColumnIndexes.length} colunas`;

        elements.previewSummary.hidden =
            false;
    }

    function renderTable(snapshot) {
        const tableHead =
            elements.previewTable
                .querySelector(
                    "thead",
                );

        const tableBody =
            elements.previewTable
                .querySelector(
                    "tbody",
                );

        tableHead.replaceChildren();
        tableBody.replaceChildren();

        if (!snapshot.dataset) {
            elements.tableContainer.hidden =
                true;
            elements.emptyState.hidden =
                true;
            elements.previewWaiting.hidden =
                false;

            return;
        }

        elements.previewWaiting.hidden =
            true;

        const hasVisibleColumns =
            snapshot
                .visibleColumnIndexes
                .length > 0;

        elements.tableContainer.hidden =
            !hasVisibleColumns;
        elements.emptyState.hidden =
            hasVisibleColumns;

        if (!hasVisibleColumns) {
            return;
        }

        const headerRow =
            document.createElement(
                "tr",
            );

        snapshot.visibleColumnIndexes
            .forEach(
                function (columnIndex) {
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

                    const isSorted =
                        snapshot.sortColumn ===
                        columnIndex;

                    headerCell.scope =
                        "col";
                    headerCell.setAttribute(
                        "aria-sort",
                        isSorted
                            ? snapshot
                                .sortDirection ===
                                "asc"
                                ? "ascending"
                                : "descending"
                            : "none",
                    );

                    sortButton.type =
                        "button";
                    sortButton.classList.add(
                        "analysis-sort-button",
                    );
                    sortButton.dataset
                        .columnIndex =
                            String(
                                columnIndex,
                            );
                    sortButton.setAttribute(
                        "aria-label",
                        `Ordenar pela coluna ${snapshot.dataset.headers[columnIndex]}`,
                    );

                    indicator.classList.add(
                        "analysis-sort-indicator",
                    );
                    indicator.setAttribute(
                        "aria-hidden",
                        "true",
                    );
                    indicator.textContent =
                        isSorted
                            ? snapshot
                                .sortDirection ===
                                "asc"
                                ? "↑"
                                : "↓"
                            : "↕";

                    sortButton.append(
                        document.createTextNode(
                            snapshot.dataset
                                .headers[
                                    columnIndex
                                ],
                        ),
                        indicator,
                    );

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
            snapshot.previewRows.length ===
            0
        ) {
            const row =
                document.createElement(
                    "tr",
                );

            const cell = createCell(
                "td",
                "Nenhuma linha corresponde aos filtros aplicados.",
            );

            cell.classList.add(
                "analysis-empty-row",
            );
            cell.colSpan =
                snapshot
                    .visibleColumnIndexes
                    .length;

            row.appendChild(cell);
            tableBody.appendChild(row);

            return;
        }

        const bodyFragment =
            document.createDocumentFragment();

        snapshot.previewRows.forEach(
            function (sourceRow) {
                const tableRow =
                    document.createElement(
                        "tr",
                    );

                snapshot
                    .visibleColumnIndexes
                    .forEach(
                        function (
                            columnIndex,
                        ) {
                            tableRow.appendChild(
                                createCell(
                                    "td",
                                    sourceRow[
                                        columnIndex
                                    ],
                                ),
                            );
                        },
                    );

                bodyFragment.appendChild(
                    tableRow,
                );
            },
        );

        tableBody.appendChild(
            bodyFragment,
        );
    }

    function renderActionState(
        snapshot,
    ) {
        elements.copyButton.disabled =
            !snapshot.canExport;
        elements.saveButton.disabled =
            !snapshot.canExport;
    }

    function renderResults(snapshot) {
        renderSummary(snapshot);
        renderTable(snapshot);
        renderActionState(snapshot);
    }

    function renderAll(snapshot) {
        elements.previewLimit.value =
            snapshot.rowLimit;

        refreshSelectControl(
            elements.previewLimit,
        );

        renderVisibleColumns(snapshot);
        renderFilterColumnOptions(
            snapshot,
        );
        renderFilterControls(snapshot);
        renderResults(snapshot);
    }

    return Object.freeze({
        renderActionState,
        renderAll,
        renderFilterColumnOptions,
        renderFilterControls,
        renderResults,
        renderTable,
        renderVisibleColumns,
    });
}

export {
    createPreviewView,
    getPreviewElements,
};
