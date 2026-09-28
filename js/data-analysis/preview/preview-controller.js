import {
    onSelectControlChange,
} from "../core/select-control.js";

import {
    copyPreviewData,
    savePreviewAsCsv,
} from "../services/preview-export.js";

import {
    createPreviewModel,
} from "./preview-model.js";

import {
    createPreviewView,
    getPreviewElements,
} from "./preview-view.js";

function initializePreviewModule({
    rootElement,
    store,
    notification,
}) {
    const elements =
        getPreviewElements(
            rootElement,
        );

    const model =
        createPreviewModel({
            initialRowLimit:
                elements.previewLimit
                    .value,
        });

    const view =
        createPreviewView(
            elements,
        );

    const listeners =
        new Set();

    function getSnapshot() {
        return model.getSnapshot();
    }

    function notifySubscribers(
        snapshot,
        changeType,
    ) {
        listeners.forEach(
            function (listener) {
                try {
                    listener(
                        snapshot,
                        {
                            type: changeType,
                        },
                    );
                } catch (error) {
                    console.error(
                        "Não foi possível atualizar um módulo dependente da prévia:",
                        error,
                    );
                }
            },
        );
    }

    function renderAll(
        changeType =
            "preview-structure-changed",
    ) {
        const snapshot =
            getSnapshot();

        view.renderAll(snapshot);

        notifySubscribers(
            snapshot,
            changeType,
        );
    }

    function renderResults(
        changeType =
            "preview-results-changed",
    ) {
        const snapshot =
            getSnapshot();

        view.renderResults(snapshot);

        notifySubscribers(
            snapshot,
            changeType,
        );
    }

    function renderTable(
        changeType =
            "preview-order-changed",
    ) {
        const snapshot =
            getSnapshot();

        view.renderTable(snapshot);

        notifySubscribers(
            snapshot,
            changeType,
        );
    }

    store.subscribe(
        function (
            snapshot,
            change,
        ) {
            model.setDataset(
                snapshot.dataset,
            );

            renderAll(
                change?.type ??
                    "dataset-synchronized",
            );
        },
    );

    onSelectControlChange(
        elements.previewLimit,
        "analysisPreviewLimit",
        function () {
            model.setRowLimit(
                elements.previewLimit
                    .value,
            );

            renderResults(
                "preview-limit-changed",
            );
        },
    );

    elements.showAllColumnsButton
        .addEventListener(
            "click",
            function () {
                model.showAllColumns();
                renderAll(
                    "visible-columns-changed",
                );
            },
        );

    elements.hideAllColumnsButton
        .addEventListener(
            "click",
            function () {
                model.hideAllColumns();
                renderAll(
                    "visible-columns-changed",
                );
            },
        );

    elements.visibleColumns
        .addEventListener(
            "change",
            function (event) {
                const checkbox =
                    event.target instanceof
                        HTMLInputElement
                        ? event.target
                        : null;

                const columnIndex =
                    Number(
                        checkbox?.dataset
                            .columnIndex,
                    );

                if (
                    !checkbox ||
                    !Number.isInteger(
                        columnIndex,
                    )
                ) {
                    return;
                }

                model.setColumnVisible(
                    columnIndex,
                    checkbox.checked,
                );

                renderAll(
                    "visible-columns-changed",
                );
            },
        );

    onSelectControlChange(
        elements.filterColumn,
        "analysisFilterColumn",
        function () {
            const columnIndex =
                elements.filterColumn
                    .value === ""
                    ? null
                    : Number(
                        elements
                            .filterColumn
                            .value,
                    );

            model.setSelectedFilterColumn(
                columnIndex,
            );

            view.renderFilterControls(
                getSnapshot(),
            );
        },
    );

    elements.filterText
        .addEventListener(
            "input",
            function () {
                model.setFilterText(
                    elements.filterText
                        .value,
                );

                renderResults(
                    "filters-changed",
                );
            },
        );

    onSelectControlChange(
        elements.occurrenceFilter,
        "analysisOccurrenceFilter",
        function () {
            model.setOccurrenceFilter(
                elements
                    .occurrenceFilter
                    .value,
            );

            renderResults(
                "filters-changed",
            );
        },
    );

    onSelectControlChange(
        elements.numericOperator,
        "analysisNumericOperator",
        function () {
            model.setNumericOperator(
                elements.numericOperator
                    .value,
            );

            renderResults(
                "filters-changed",
            );
        },
    );

    elements.numericValue
        .addEventListener(
            "input",
            function () {
                model.setNumericValue(
                    elements.numericValue
                        .value,
                );

                renderResults(
                    "filters-changed",
                );
            },
        );

    elements.previewTable
        .addEventListener(
            "click",
            function (event) {
                const eventTarget =
                    event.target instanceof
                        Element
                        ? event.target
                        : null;

                const sortButton =
                    eventTarget?.closest(
                        ".analysis-sort-button",
                    );

                if (
                    !sortButton ||
                    !elements.previewTable
                        .contains(
                            sortButton,
                        )
                ) {
                    return;
                }

                const columnIndex =
                    Number(
                        sortButton.dataset
                            .columnIndex,
                    );

                if (
                    !Number.isInteger(
                        columnIndex,
                    )
                ) {
                    return;
                }

                model.toggleSort(
                    columnIndex,
                );

                renderTable(
                    "preview-order-changed",
                );
            },
        );

    elements.copyButton
        .addEventListener(
            "click",
            async function () {
                elements.copyButton
                    .disabled = true;

                try {
                    const exportData =
                        model.createExportData();

                    await copyPreviewData(
                        exportData,
                    );

                    notification.set(
                        `${exportData.rows.length} linha(s) copiadas para a área de transferência.`,
                        "success",
                    );
                } catch (error) {
                    notification.set(
                        error instanceof Error
                            ? error.message
                            : "Não foi possível copiar os dados.",
                        "error",
                    );
                } finally {
                    view.renderActionState(
                        getSnapshot(),
                    );
                }
            },
        );

    elements.saveButton
        .addEventListener(
            "click",
            function () {
                try {
                    const snapshot =
                        getSnapshot();

                    const exportData =
                        model.createExportData();

                    const fileName =
                        savePreviewAsCsv(
                            exportData,
                            snapshot.dataset
                                .sourceFileName,
                        );

                    notification.set(
                        `Arquivo "${fileName}" salvo com ${exportData.rows.length} linha(s).`,
                        "success",
                    );
                } catch (error) {
                    notification.set(
                        error instanceof Error
                            ? error.message
                            : "Não foi possível salvar os dados.",
                        "error",
                    );
                }
            },
        );

    function subscribe(listener) {
        if (
            typeof listener !==
            "function"
        ) {
            return function () {};
        }

        listeners.add(listener);

        listener(
            getSnapshot(),
            {
                type:
                    "initial-state",
            },
        );

        return function () {
            listeners.delete(
                listener,
            );
        };
    }

    return Object.freeze({
        createExportData:
            model.createExportData,
        getSnapshot,
        subscribe,
    });
}

export {
    initializePreviewModule,
};
