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
        elementType: "select",
    },
    {
        id: "reportAnalystInput",
        field: "analyst",
        characterType: "letters",
    },
    {
        id: "reportPlanningInput",
        field: "plannedVolume",
        characterType: "numbers",
    },
    {
        id: "reportCollaboratorsInput",
        field: "collaboratorCount",
        characterType: "numbers",
    },
    {
        id: "reportCapacityInput",
        field: "shiftCapacity",
        characterType: "numbers",
    },
];

const reportQuantityFormatter =
    new Intl.NumberFormat(
        "pt-BR",
        {
            maximumFractionDigits: 0,
        },
    );

function isValidReportGlobalInput(
    entry,
) {
    return entry.elementType === "select"
        ? entry.input instanceof
            HTMLSelectElement
        : entry.input instanceof
            HTMLInputElement;
}

function sanitizeReportGlobalInput(
    entry,
) {
    if (
        entry.characterType ===
        "letters"
    ) {
        entry.input.value =
            entry.input.value.replace(
                /[^\p{L}\s]/gu,
                "",
            );
    } else if (
        entry.characterType ===
        "numbers"
    ) {
        entry.input.value =
            entry.input.value.replace(
                /\D/g,
                "",
            );
    }
}

function synchronizeSelect2Value(
    select,
) {
    if (
        !select.classList.contains(
            "select2-hidden-accessible",
        ) ||
        !window.jQuery ||
        typeof window.jQuery.fn
            ?.select2 !== "function"
    ) {
        return;
    }

    window.jQuery(
        select,
    ).trigger(
        "change.select2",
    );
}

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
                return !isValidReportGlobalInput(
                    entry,
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

                    if (
                        entry.elementType ===
                        "select"
                    ) {
                        synchronizeSelect2Value(
                            entry.input,
                        );
                    }
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
            const handleInput =
                function () {
                    sanitizeReportGlobalInput(
                        entry,
                    );

                    updateReportContextField(
                        entry.field,
                        entry.input.value,
                    );
                };

            if (
                entry.elementType ===
                    "select" &&
                window.jQuery
            ) {
                window.jQuery(
                    entry.input,
                ).on(
                    "change.reportGlobalInputs",
                    handleInput,
                );
            } else {
                entry.input.addEventListener(
                    entry.elementType ===
                        "select"
                        ? "change"
                        : "input",
                    handleInput,
                );
            }

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
