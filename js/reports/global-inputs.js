import {
    getReportContext,
    subscribeReportContext,
    updateReportContextField,
} from "./core/report-context.js";

let reportGlobalInputsInitialized =
    false;

const reportWindowOutputIds = [
    "receiptPreviewWindow",
    "receiptLinehaulPreviewWindow",
    "expeditionPreviewWindow",
    "overallAnalysisWindow",
];

const reportGlobalInputDefinitions = [
    {
        id: "reportWindowInput",
        field: "window",
    },
    {
        id: "reportAnalystInput",
        field: "analyst",
    },
    {
        id: "reportPlanningInput",
        field: "plannedVolume",
    },
    {
        id: "reportCollaboratorsInput",
        field: "collaboratorCount",
    },
    {
        id: "reportCapacityInput",
        field: "shiftCapacity",
    },
];

const reportQuantityFormatter =
    new Intl.NumberFormat(
        "pt-BR",
        {
            maximumFractionDigits: 0,
        },
    );

/* MANTÉM OS INPUTS GLOBAIS SINCRONIZADOS COM O CONTEXTO */

function initializeReportGlobalInputs() {
    if (reportGlobalInputsInitialized) {
        return true;
    }

    const globalInputs =
        reportGlobalInputDefinitions
            .map(
                function (definition) {
                    return {
                        ...definition,
                        input:
                            document.getElementById(
                                definition.id,
                            ),
                    };
                },
            );

    if (
        globalInputs.some(
            function (entry) {
                return !(
                    entry.input instanceof
                    HTMLInputElement
                );
            },
        )
    ) {
        console.error(
            "Não foi possível localizar todos os inputs globais dos relatórios.",
        );

        return false;
    }

    function synchronizeGlobalInputs(
        context,
    ) {
        globalInputs.forEach(
            function (entry) {
                if (
                    document.activeElement !==
                    entry.input
                ) {
                    entry.input.value =
                        context[entry.field] ??
                        "";
                }
            },
        );

        const displayWindow =
            context.window || "—";

        reportWindowOutputIds.forEach(
            function (outputId) {
                const output =
                    document.getElementById(
                        outputId,
                    );

                if (output) {
                    output.textContent =
                        displayWindow;
                }
            },
        );

        const analystOutput =
            document.getElementById(
                "overallAnalysisAnalyst",
            );

        if (analystOutput) {
            analystOutput.textContent =
                context.analyst || "—";
        }

        const plannedOutput =
            document.getElementById(
                "overallAnalysisPlanned",
            );

        if (plannedOutput) {
            plannedOutput.textContent =
                context.plannedVolume ===
                    null
                    ? "—"
                    : reportQuantityFormatter
                        .format(
                            context.plannedVolume,
                        );
        }
    }

    globalInputs.forEach(
        function (entry) {
            entry.input.addEventListener(
                "input",
                function () {
                    updateReportContextField(
                        entry.field,
                        entry.input.value,
                    );
                },
            );

            entry.input.addEventListener(
                "blur",
                function () {
                    synchronizeGlobalInputs(
                        getReportContext(),
                    );
                },
            );
        },
    );

    subscribeReportContext(
        synchronizeGlobalInputs,
    );

    synchronizeGlobalInputs(
        getReportContext(),
    );

    reportGlobalInputsInitialized =
        true;

    return true;
}

export {
    initializeReportGlobalInputs,
};
