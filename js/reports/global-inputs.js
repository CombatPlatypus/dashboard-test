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

/* MANTÉM OS INPUTS GLOBAIS SINCRONIZADOS COM O CONTEXTO */

function initializeReportGlobalInputs() {
    if (reportGlobalInputsInitialized) {
        return true;
    }

    const windowInput =
        document.getElementById(
            "reportWindowInput",
        );

    if (
        !(windowInput instanceof
            HTMLInputElement)
    ) {
        console.error(
            "Não foi possível localizar o input global da janela.",
        );

        return false;
    }

    function synchronizeGlobalInputs(
        context,
    ) {
        if (
            document.activeElement !==
            windowInput
        ) {
            windowInput.value =
                context.window;
        }

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
    }

    windowInput.addEventListener(
        "input",
        function () {
            updateReportContextField(
                "window",
                windowInput.value,
            );
        },
    );

    windowInput.addEventListener(
        "blur",
        function () {
            synchronizeGlobalInputs(
                getReportContext(),
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
