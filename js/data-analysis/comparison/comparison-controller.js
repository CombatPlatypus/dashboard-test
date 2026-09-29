import {
    onSelectControlChange,
} from "../core/select-control.js";

import {
    buildComparisonResults,
    filterComparisonResults,
    getComparableColumnIndexes,
    getConditionValueOptions,
    parseComparisonInput,
    sortComparisonResults,
} from "./comparison-model.js";

import {
    createComparisonView,
    getComparisonElements,
} from "./comparison-view.js";

function parseSelectedColumn(
    value,
) {
    if (value === "") {
        return null;
    }

    const columnIndex =
        Number(value);

    return Number.isInteger(
        columnIndex,
    )
        ? columnIndex
        : null;
}

function initializeComparisonModule({
    rootElement,
    previewSource,
}) {
    if (
        !previewSource ||
        typeof previewSource
            .subscribe !== "function"
    ) {
        throw new TypeError(
            "A comparação precisa de uma fonte de prévia observável.",
        );
    }

    const elements =
        getComparisonElements(
            rootElement,
        );

    const view =
        createComparisonView(
            elements,
        );

    let previewSnapshot = null;
    let selectedColumnIndex = null;
    let conditionColumnIndex = null;
    let conditionValue = "";
    let inputValue = "";
    let searchValue = "";
    let sortColumn = "status";
    let sortDirection = "asc";

    function synchronizeSelections() {
        const comparableColumnIndexes =
            getComparableColumnIndexes(
                previewSnapshot,
            );

        if (
            !comparableColumnIndexes
                .includes(
                    selectedColumnIndex,
                )
        ) {
            selectedColumnIndex =
                null;

            conditionColumnIndex =
                null;

            conditionValue = "";
        }

        const conditionColumnIndexes =
            comparableColumnIndexes.filter(
                function (columnIndex) {
                    return (
                        columnIndex !==
                        selectedColumnIndex
                    );
                },
            );

        if (
            !conditionColumnIndexes
                .includes(
                    conditionColumnIndex,
                )
        ) {
            conditionColumnIndex =
                null;

            conditionValue = "";
        }

        const conditionValueOptions =
            getConditionValueOptions(
                previewSnapshot,
                conditionColumnIndex,
            );

        if (
            !conditionValueOptions.some(
                function (option) {
                    return (
                        option.value ===
                        conditionValue
                    );
                },
            )
        ) {
            conditionValue = "";
        }

        return {
            comparableColumnIndexes,
            conditionValueOptions,
        };
    }

    function render() {
        const {
            comparableColumnIndexes,
            conditionValueOptions,
        } = synchronizeSelections();

        const inputData =
            parseComparisonInput(
                inputValue,
            );

        const comparison =
            buildComparisonResults({
                comparisonColumnIndex:
                    selectedColumnIndex,
                conditionColumnIndex,
                conditionValue,
                inputData,
                previewSnapshot,
            });

        if (
            sortColumn ===
                "condition" &&
            !comparison
                .conditionActive
        ) {
            sortColumn = "status";
            sortDirection = "asc";
        }

        const filteredResults =
            filterComparisonResults(
                comparison.results,
                searchValue,
            );

        view.render({
            comparableColumnIndexes,
            conditionActive:
                comparison
                    .conditionActive,
            conditionColumnIndex,
            conditionValue,
            conditionValueOptions,
            inputData,
            inputValue,
            previewSnapshot,
            results:
                comparison.results,
            selectedColumnIndex,
            summary:
                comparison.summary,
            sortColumn,
            sortDirection,
            visibleResults:
                sortComparisonResults(
                    filteredResults,
                    sortColumn,
                    sortDirection,
                ),
        });
    }

    const unsubscribe =
        previewSource.subscribe(
            function (snapshot) {
                previewSnapshot =
                    snapshot;

                if (!snapshot.dataset) {
                    selectedColumnIndex =
                        null;
                    conditionColumnIndex =
                        null;
                    conditionValue = "";
                    inputValue = "";
                    searchValue = "";
                    sortColumn =
                        "status";
                    sortDirection =
                        "asc";

                    elements.input.value =
                        "";
                    elements.search.value =
                        "";
                }

                render();
            },
        );

    onSelectControlChange(
        elements.comparisonColumn,
        "analysisComparisonColumn",
        function () {
            selectedColumnIndex =
                parseSelectedColumn(
                    elements
                        .comparisonColumn
                        .value,
                );

            conditionColumnIndex =
                null;
            conditionValue = "";
            searchValue = "";
            sortColumn = "status";
            sortDirection = "asc";

            elements.search.value =
                "";

            render();
        },
    );

    onSelectControlChange(
        elements.conditionColumn,
        "analysisComparisonConditionColumn",
        function () {
            conditionColumnIndex =
                parseSelectedColumn(
                    elements
                        .conditionColumn
                        .value,
                );

            conditionValue = "";
            searchValue = "";

            elements.search.value =
                "";

            render();
        },
    );

    onSelectControlChange(
        elements.conditionValue,
        "analysisComparisonConditionValue",
        function () {
            conditionValue =
                elements
                    .conditionValue
                    .value;

            searchValue = "";

            elements.search.value =
                "";

            render();
        },
    );

    elements.input.addEventListener(
        "input",
        function () {
            inputValue =
                elements.input.value;

            render();
        },
    );

    elements.search.addEventListener(
        "input",
        function () {
            searchValue =
                elements.search.value;

            render();
        },
    );

    elements.results.addEventListener(
        "click",
        function (event) {
            const eventTarget =
                event.target instanceof
                    Element
                    ? event.target
                    : null;

            const sortButton =
                eventTarget?.closest(
                    ".analysis-sort-button[data-comparison-sort-column]",
                );

            if (
                !sortButton ||
                !elements.results
                    .contains(
                        sortButton,
                    )
            ) {
                return;
            }

            const selectedSortColumn =
                sortButton.dataset
                    .comparisonSortColumn;

            if (!selectedSortColumn) {
                return;
            }

            if (
                sortColumn ===
                selectedSortColumn
            ) {
                sortDirection =
                    sortDirection ===
                        "asc"
                        ? "desc"
                        : "asc";
            } else {
                sortColumn =
                    selectedSortColumn;
                sortDirection = "asc";
            }

            render();
        },
    );

    elements.clearButton
        .addEventListener(
            "click",
            function () {
                inputValue = "";
                searchValue = "";

                elements.input.value =
                    "";
                elements.search.value =
                    "";

                render();

                elements.input.focus();
            },
        );

    return Object.freeze({
        destroy: unsubscribe,
    });
}

export {
    initializeComparisonModule,
};
