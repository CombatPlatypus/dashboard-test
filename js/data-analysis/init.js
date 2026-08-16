/* INICIALIZA O IMPORTADOR */

function initializeStatisticsImporter() {
    if (
        !statisticsPanel ||
        !fileInput ||
        !clearButton ||
        !downloadCsvButton ||
        !downloadXlsxButton ||
        !fileStatus ||
        !preview ||
        !previewSummary ||
        !previewLimit ||
        !table ||
        !visibleColumns ||
        !visibleColumnCount ||
        !showAllColumnsButton ||
        !hideAllColumnsButton ||
        !hideEmptyColumnsButton ||
        !clearFiltersButton ||
        !quickAnalysis ||
        !analysisColumns ||
        !selectAllColumnsButton ||
        !clearColumnsButton ||
        !totalRecords ||
        !analysisCards ||
        !analysisResults ||
        !analysisEmpty ||
        !chartPanel ||
        !chartSummary ||
        !chartCategory ||
        !chartValue ||
        !chartOperation ||
        !chartTypes ||
        !chartColors ||
        !chartShowValues ||
        !chartEmpty ||
        !chartCanvas ||
        !chartDownloadButton ||
        !comparisonPanel ||
        !comparisonSummary ||
        !comparisonColumn ||
        !comparisonConditionColumn ||
        !comparisonConditionValue ||
        !comparisonInput ||
        !comparisonLineCount ||
        !comparisonValidCount ||
        !comparisonDuplicateCount ||
        !comparisonInvalidCount ||
        !comparisonClearButton ||
        !comparisonFoundCount ||
        !comparisonFoundTitle ||
        !comparisonOutsideCard ||
        !comparisonOutsideCount ||
        !comparisonNotFoundCount ||
        !comparisonRate ||
        !comparisonEmpty ||
        !comparisonPreview ||
        !comparisonSearch ||
        !comparisonExportButton ||
        !comparisonTable
    ) {
        console.error(
            "Elementos do importador de Estatísticas não foram encontrados.",
        );

        return;
    }

    if (!window.XLSX) {
        fileInput.disabled =
            true;

        setStatus(
            "Não foi possível carregar a biblioteca de leitura de planilhas.",
            true,
        );

        return;
    }

    if (!window.Chart) {
        console.error("A biblioteca Chart.js não foi carregada.");

        chartDownloadButton.disabled = true;
    }

    prepareChartColorButtons();

    const handleChartOperationChange = function () {
        updateChartValueField();

        const valueRequired = chartOperation.value !== "count";

        const valueSelected = chartValue.value !== "";

        if (
            valueRequired &&
            !valueSelected
        ) {
            chartDownloadButton.disabled = true;

            return;
        }

        renderChart();
    };

    const handleChartDataChange = function () {
        renderChart();
    };

    if (
        window.jQuery &&
        typeof window.jQuery.fn.select2 === "function"
    ) {
        window
            .jQuery(chartCategory)
            .on(
                "change.statisticsChartData",
                handleChartDataChange,
            );

        window
            .jQuery(chartValue)
            .on(
                "change.statisticsChartData",
                handleChartDataChange,
            );
    } else {
        chartCategory.addEventListener(
            "change",
            handleChartDataChange,
        );

        chartValue.addEventListener(
            "change",
            handleChartDataChange,
        );
    }

    chartTypes.addEventListener("click", function (event) {
        const eventTarget = event.target instanceof Element ? event.target : null;
        const typeButton = eventTarget?.closest("button[data-chart-type]");

        if (!typeButton || !chartTypes.contains(typeButton)) {
            return;
        }

        const selectedType = typeButton.dataset.chartType;

        if (!["bar", "line", "pie"].includes(selectedType)) {
            return;
        }

        chartState.type = selectedType;
        setActiveChartButton(chartTypes, typeButton);
        renderChart();
    });

    chartColors.addEventListener("click", function (event) {
        const eventTarget = event.target instanceof Element ? event.target : null;
        const colorButton = eventTarget?.closest("button[data-chart-color]");

        if (!colorButton || !chartColors.contains(colorButton)) {
            return;
        }

        const selectedColor = colorButton.dataset.chartColor;

        if (!selectedColor) {
            return;
        }

        chartState.color = selectedColor;
        setActiveChartButton(chartColors, colorButton);
        renderChart();
    });

    chartDownloadButton.addEventListener(
        "click",
        downloadChartImage,
    );

    comparisonInput.addEventListener(
        "input",
        function () {
            resetComparisonResults();
            updateComparisonInputSummary();
            scheduleComparison();
        },
    );

    comparisonClearButton.addEventListener(
        "click",
        clearComparisonInput,
    );

    const handleComparisonColumnChange =
        function () {
            resetComparisonResults();

            if (
                comparisonColumn.value ===
                ""
            ) {
                comparisonConditionColumn
                    .value = "";

                comparisonConditionValue
                    .value = "";
            }

            renderComparisonConditionColumnSelector();
            renderComparisonConditionValueSelector();

            updateComparisonControlsState();
            updateComparisonInputSummary();
            scheduleComparison();
        };

    const handleComparisonConditionColumnChange = function () {
        resetComparisonResults();

        renderComparisonConditionValueSelector();

        scheduleComparison();
    };

    const handleComparisonConditionValueChange = function () {
        resetComparisonResults();
        scheduleComparison();
    };

    if (
        window.jQuery &&
        typeof window.jQuery.fn.select2 === "function"
    ) {
        window
            .jQuery(comparisonConditionColumn)
            .on(
                "change.statisticsComparisonCondition",
                handleComparisonConditionColumnChange,
            );

        window
            .jQuery(comparisonConditionValue)
            .on(
                "change.statisticsComparisonCondition",
                handleComparisonConditionValueChange,
            );
    } else {
        comparisonConditionColumn.addEventListener(
            "change",
            handleComparisonConditionColumnChange,
        );

        comparisonConditionValue.addEventListener(
            "change",
            handleComparisonConditionValueChange,
        );
    }

    comparisonSearch.addEventListener(
        "input",
        filterComparisonResults,
    );

    comparisonExportButton.addEventListener(
        "click",
        function () {
            executeTableDownload(
                downloadComparisonResults,
            );
        },
    );

    if (
        window.jQuery &&
        typeof window.jQuery.fn.select2 === "function"
    ) {
        window
            .jQuery(comparisonColumn)
            .on(
                "change.statisticsComparison",
                handleComparisonColumnChange,
            );
    } else {
        comparisonColumn.addEventListener(
            "change",
            handleComparisonColumnChange,
        );
    }

    if (
        window.jQuery &&
        typeof window.jQuery.fn.select2 === "function"
    ) {
        window
            .jQuery(chartOperation)
            .on(
                "change.statisticsChartOperation",
                handleChartOperationChange,
            );
    } else {
        chartOperation.addEventListener(
            "change",
            handleChartOperationChange,
        );
    }

    const handlePreviewLimitChange = function () {
        if (!tableState.rows.length) {
            return;
        }

        renderTableBody();
    };

    if (
        window.jQuery &&
        typeof window.jQuery.fn.select2 === "function"
    ) {
        window
            .jQuery(previewLimit)
            .on(
                "change.statisticsPreviewLimit",
                handlePreviewLimitChange,
            );
    } else {
        previewLimit.addEventListener(
            "change",
            handlePreviewLimitChange,
        );
    }
    
    downloadCsvButton.addEventListener(
        "click",
        function () {
            executeTableDownload(
                downloadCurrentTableAsCsv,
            );
        },
    );

    downloadXlsxButton.addEventListener(
        "click",
        function () {
            executeTableDownload(
                downloadCurrentTableAsXlsx,
            );
        },
    );

    fileInput.addEventListener(
        "change",
        async function () {
            const file =
                fileInput.files?.[0];

            if (!file) {
                return;
            }

            setStatus(
                `Lendo "${file.name}"...`,
            );

            try {
                await readSelectedFile(
                    file,
                );
            } catch (error) {
                setDownloadButtonsDisabled(
                    true,
                );

                table
                    .querySelector(
                        "thead",
                    )
                    .replaceChildren();

                table
                    .querySelector(
                        "tbody",
                    )
                    .replaceChildren();

                resetTableState();

                clearQuickAnalysis();

                clearChartPanel();

                clearComparisonPanel();

                clearFiltersButton.disabled =
                    true;

                statisticsPanel.classList.add("no-file");

                previewSummary.textContent =
                    "";

                preview.hidden =
                    true;

                clearButton.disabled =
                    false;

                setStatus(
                    error instanceof
                        Error
                        ? error.message
                        : "Não foi possível ler o arquivo selecionado.",
                    true,
                );
            }
        },
    );

    clearButton.addEventListener(
        "click",
        clearImportedFile,
    );

    selectAllColumnsButton.addEventListener(
        "click",
        function () {
            tableState.selectedAnalysisColumns =
                new Set(
                    getVisibleColumnIndexes(),
                );

            renderAnalysisColumnSelector();

            renderQuickAnalysis(
                getFilteredRows(),
            );
        },
    );

    clearColumnsButton.addEventListener(
        "click",
        function () {
            tableState.selectedAnalysisColumns.clear();

            renderAnalysisColumnSelector();

            renderQuickAnalysis(
                getFilteredRows(),
            );
        },
    );

    showAllColumnsButton.addEventListener(
        "click",
        function () {
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

            refreshVisibleColumns();
        },
    );

    hideAllColumnsButton.addEventListener(
        "click",
        function () {
            tableState.visibleColumns.clear();

            refreshVisibleColumns();
        },
    );

    hideEmptyColumnsButton.addEventListener(
        "click",
        function () {
            tableState.columnProfiles.forEach(
                function (
                    profile,
                    columnIndex,
                ) {
                    if (
                        profile.type ===
                        "empty"
                    ) {
                        tableState.visibleColumns.delete(
                            columnIndex,
                        );
                    }
                },
            );

            refreshVisibleColumns();
        },
    );

    clearFiltersButton.addEventListener(
        "click",
        clearAllFilters,
    );

    chartShowValues.addEventListener("change", function () {
        chartState.showValues = chartShowValues.checked;
        renderChart();
    });
}

/* INICIALIZA */

initializeStatisticsImporter();