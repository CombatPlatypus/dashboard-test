import {
    getReportContext,
    subscribeReportContext,
    updateReportContextField,
} from "./core/report-context.js";

let reportGlobalInputsInitialized =
    false;

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
];

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
    const value = entry.input.value;
    const sanitized = entry.characterType === "letters"
        ? value.replace(/[^\p{L}\s]/gu, "")
        : entry.characterType === "numbers"
            ? value.replace(/\D/g, "")
            : value;
    if (value !== sanitized) {
        entry.input.value = sanitized;
    }
}

function synchronizeGlobalInput(entry, context) {
    const value = String(context[entry.field] ?? "");
    if (document.activeElement === entry.input || entry.input.value === value) {
        return;
    }

    entry.input.value = value;
    if (entry.elementType === "select") {
        synchronizeSelect2Value(entry.input);
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

    function synchronizeGlobalInputs(context, { field } = {}) {
        for (const entry of globalInputs) {
            if (!field || entry.field === field) {
                synchronizeGlobalInput(entry, context);
            }
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
                    synchronizeGlobalInput(entry, getReportContext());
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
