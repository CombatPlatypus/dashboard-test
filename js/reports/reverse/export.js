import {
    getReverseState,
    resetReverseReport,
    subscribeReverseState,
} from "./state.js";

import {
    bindReportImageExportButton,
    copyReportBlob,
    createReportImageBlob,
    downloadReportBlob,
} from "../export.js";

import {
    resetReportNotification,
    setReportNotification,
} from "../report-notifications.js";

let reverseExportBusy = false;

function canExportReverseReport(
    state = getReverseState(),
) {
    return state.transfers.length > 0;
}

function renderReverseExportStatus(
    copyButton,
    clearButton,
    state = getReverseState(),
) {
    const hasData =
        canExportReverseReport(state);

    copyButton.disabled =
        reverseExportBusy ||
        !hasData;

    clearButton.disabled =
        reverseExportBusy ||
        !hasData;
}

function createReverseFileName() {
    const date =
        new Intl.DateTimeFormat(
            "pt-BR",
        )
            .format(new Date())
            .replace(/\//g, "-");

    return `relatorio-reversa-${date}.png`;
}

async function runReverseExport({
    copyButton,
    clearButton,
    exportArea,
    mode,
}) {
    if (
        reverseExportBusy ||
        !canExportReverseReport()
    ) {
        return;
    }

    reverseExportBusy = true;

    renderReverseExportStatus(
        copyButton,
        clearButton,
    );

    copyButton.setAttribute(
        "aria-busy",
        "true",
    );

    try {
        const blob =
            await createReportImageBlob(
                exportArea,
            );

        if (mode === "copy") {
            await copyReportBlob(blob);
        } else {
            downloadReportBlob(
                blob,
                createReverseFileName(),
            );
        }

        setReportNotification({
            reportId: "reverse",
            type: "success",
            message:
                mode === "copy"
                    ? "Relatório de reversa copiado."
                    : "Relatório de reversa baixado.",
        });
    } catch (error) {
        console.error(
            "Não foi possível exportar o relatório de reversa.",
            error,
        );

        setReportNotification({
            reportId: "reverse",
            type: "error",
            message:
                "Não foi possível exportar o relatório de reversa.",
        });
    } finally {
        reverseExportBusy = false;
        copyButton.removeAttribute(
            "aria-busy",
        );

        renderReverseExportStatus(
            copyButton,
            clearButton,
        );
    }
}

function initializeReverseExport(
    rootElement = document,
) {
    const copyButton =
        rootElement.querySelector(
            "#reverseCopyReportButton",
        );

    const clearButton =
        rootElement.querySelector(
            "#reverseClearReportButton",
        );

    const exportArea =
        rootElement.querySelector(
            "#reversePreview",
        );

    if (
        !(copyButton instanceof
            HTMLButtonElement) ||
        !(clearButton instanceof
            HTMLButtonElement) ||
        !(exportArea instanceof
            HTMLElement)
    ) {
        return false;
    }

    bindReportImageExportButton(
        copyButton,
        {
            onCopy() {
                runReverseExport({
                    copyButton,
                    clearButton,
                    exportArea,
                    mode: "copy",
                });
            },
            onDownload() {
                runReverseExport({
                    copyButton,
                    clearButton,
                    exportArea,
                    mode: "download",
                });
            },
        },
    );

    clearButton.addEventListener(
        "click",
        function () {
            if (
                !window.confirm(
                    "Limpar todas as informações do relatório de reversa?",
                )
            ) {
                return;
            }

            resetReverseReport();
            resetReportNotification(
                "reverse",
            );
        },
    );

    subscribeReverseState(
        function (state) {
            renderReverseExportStatus(
                copyButton,
                clearButton,
                state,
            );
        },
    );

    renderReverseExportStatus(
        copyButton,
        clearButton,
    );

    return true;
}

export {
    canExportReverseReport,
    initializeReverseExport,
};
