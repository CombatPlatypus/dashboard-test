import {
    createParcelSummary,
} from "./model.js";

import {
    getParcelState,
    resetParcelReport,
    subscribeParcelState,
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

let parcelExportBusy = false;

function canExportParcelReport(
    state = getParcelState(),
) {
    return createParcelSummary(
        state.rows,
        state.operatorKindOverrides,
    ).hasData;
}

function renderParcelExportStatus(
    copyButton,
    clearButton,
    state = getParcelState(),
) {
    const hasData =
        canExportParcelReport(
            state,
        );

    copyButton.disabled =
        parcelExportBusy ||
        !hasData;

    clearButton.disabled =
        parcelExportBusy ||
        !hasData;
}

function createParcelFileName() {
    const date =
        new Intl.DateTimeFormat(
            "pt-BR",
        )
            .format(
                new Date(),
            )
            .replace(
                /\//g,
                "-",
            );

    return `relatorio-parcel-sweeper-${date}.png`;
}

async function runParcelExport({
    copyButton,
    clearButton,
    exportArea,
    mode,
}) {
    const state =
        getParcelState();

    if (
        parcelExportBusy ||
        !canExportParcelReport(
            state,
        )
    ) {
        return;
    }

    const isCopy =
        mode === "copy";

    const originalTitle =
        copyButton.title;

    parcelExportBusy = true;

    renderParcelExportStatus(
        copyButton,
        clearButton,
        state,
    );

    copyButton.title =
        isCopy
            ? "Copiando relatório..."
            : "Gerando relatório...";

    copyButton.setAttribute(
        "aria-busy",
        "true",
    );

    try {
        await new Promise(
            function (resolve) {
                window.requestAnimationFrame(
                    function () {
                        window.setTimeout(
                            resolve,
                            300,
                        );
                    },
                );
            },
        );

        const blob =
            await createReportImageBlob(
                exportArea,
            );

        if (isCopy) {
            await copyReportBlob(
                blob,
            );
        } else {
            downloadReportBlob(
                blob,
                createParcelFileName(),
            );
        }

        setReportNotification({
            reportId: "parcel",
            type: "success",
            message:
                isCopy
                    ? "Relatório do Parcel Sweeper copiado."
                    : "Relatório do Parcel Sweeper baixado.",
        });
    } catch (error) {
        console.error(
            "Não foi possível exportar o relatório do Parcel Sweeper:",
            error,
        );

        setReportNotification({
            reportId: "parcel",
            type: "error",
            message:
                "Não foi possível exportar o relatório do Parcel Sweeper.",
        });

        window.alert(
            error instanceof Error
                ? error.message
                : "Não foi possível exportar o relatório.",
        );
    } finally {
        parcelExportBusy = false;
        copyButton.title =
            originalTitle;
        copyButton.removeAttribute(
            "aria-busy",
        );

        renderParcelExportStatus(
            copyButton,
            clearButton,
            getParcelState(),
        );
    }
}

function initializeParcelExport(
    rootElement = document,
) {
    const copyButton =
        rootElement.querySelector(
            "#parcelCopyReportButton",
        );

    const clearButton =
        rootElement.querySelector(
            "#parcelClearReportButton",
        );

    const exportArea =
        rootElement.querySelector(
            "#parcelPreview",
        );

    if (
        !(
            copyButton instanceof
                HTMLButtonElement
        ) ||
        !(
            clearButton instanceof
                HTMLButtonElement
        ) ||
        !(
            exportArea instanceof
                HTMLElement
        )
    ) {
        return false;
    }

    if (
        copyButton.dataset
            .parcelExportInitialized ===
        "true"
    ) {
        return true;
    }

    copyButton.dataset
        .parcelExportInitialized =
            "true";

    bindReportImageExportButton(
        copyButton,
        {
            onCopy() {
                runParcelExport({
                    copyButton,
                    clearButton,
                    exportArea,
                    mode: "copy",
                });
            },
            onDownload() {
                runParcelExport({
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
                    "Limpar todas as informações do relatório Parcel Sweeper?",
                )
            ) {
                return;
            }

            resetParcelReport();
            resetReportNotification(
                "parcel",
            );
        },
    );

    subscribeParcelState(
        function (state) {
            renderParcelExportStatus(
                copyButton,
                clearButton,
                state,
            );
        },
    );

    renderParcelExportStatus(
        copyButton,
        clearButton,
        getParcelState(),
    );

    return true;
}

export {
    canExportParcelReport,
    initializeParcelExport,
};
