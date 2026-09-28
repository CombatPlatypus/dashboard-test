import {
    onSelectControlChange,
} from "../core/select-control.js";

import {
    buildComparisonResults,
    filterComparisonResults,
    getComparableColumnIndexes,
    getConditionValueOptions,
    parseComparisonInput,
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
            visibleResults:
                filterComparisonResults(
                    comparison.results,
                    searchValue,
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
