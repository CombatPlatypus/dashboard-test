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

    function getSnapshot() {
        return model.getSnapshot();
    }

    function renderAll() {
        view.renderAll(
            getSnapshot(),
        );
    }

    function renderResults() {
        view.renderResults(
            getSnapshot(),
        );
    }

    store.subscribe(
        function (snapshot) {
            model.setDataset(
                snapshot.dataset,
            );

            renderAll();
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

            renderResults();
        },
    );

    elements.showAllColumnsButton
        .addEventListener(
            "click",
            function () {
                model.showAllColumns();
                renderAll();
            },
        );

    elements.hideAllColumnsButton
        .addEventListener(
            "click",
            function () {
                model.hideAllColumns();
                renderAll();
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

                renderAll();
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

                renderResults();
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

            renderResults();
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

            renderResults();
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

                renderResults();
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

                view.renderTable(
                    getSnapshot(),
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

    return Object.freeze({
        createExportData:
            model.createExportData,
        getSnapshot,
    });
}

export {
    initializePreviewModule,
};
