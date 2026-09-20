import {
    getDamageAndLossesState,
    getDamageAndLossesSummary,
    resetDamageAndLossesState,
    subscribeDamageAndLossesState,
} from "./state.js";

import {
    bindReportImageExportButton,
    copyReportBlob,
    createReportImageBlob,
    downloadReportBlob,
} from "../export.js";

import {
    setReportNotification,
} from "../report-notifications.js";

let damageExportBusy = false;

function canExportDamageReport() {
    return getDamageAndLossesSummary(
        getDamageAndLossesState(),
    ).hasData;
}

function renderDamageActionButtons(
    copyButton,
    clearButton,
) {
    const hasData =
        canExportDamageReport();

    copyButton.disabled =
        damageExportBusy ||
        !hasData;

    clearButton.disabled =
        damageExportBusy ||
        !hasData;
}

function createDamageReportFileName() {
    const date =
        new Intl.DateTimeFormat(
            "pt-BR",
        )
            .format(new Date())
            .replace(/\//g, "-");

    return `relatorio-de-avarias-${date}.png`;
}

async function runDamageReportExport({
    exportArea,
    copyButton,
    clearButton,
    mode,
}) {
    if (
        damageExportBusy ||
        !canExportDamageReport()
    ) {
        return;
    }

    const isCopy =
        mode === "copy";

    const originalTitle =
        copyButton.title;

    const originalAriaLabel =
        copyButton.getAttribute(
            "aria-label",
        );

    damageExportBusy = true;
    renderDamageActionButtons(
        copyButton,
        clearButton,
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
                createDamageReportFileName(),
            );
        }

        setReportNotification({
            reportId:
                "damage-and-losses",
            type: "success",
            message:
                isCopy
                    ? "Relatório de avarias copiado."
                    : "Relatório de avarias baixado.",
        });
    } catch (error) {
        console.error(
            "Não foi possível exportar o relatório de avarias:",
            error,
        );

        setReportNotification({
            reportId:
                "damage-and-losses",
            type: "error",
            message:
                "Não foi possível exportar o relatório de avarias.",
        });
    } finally {
        damageExportBusy = false;
        copyButton.title =
            originalTitle;
        copyButton.removeAttribute(
            "aria-busy",
        );

        if (originalAriaLabel) {
            copyButton.setAttribute(
                "aria-label",
                originalAriaLabel,
            );
        }

        renderDamageActionButtons(
            copyButton,
            clearButton,
        );
    }
}

function initializeDamageAndLossesActions(
    rootElement =
        document.getElementById(
            "damage-and-losses",
        ),
) {
    const panel =
        rootElement instanceof HTMLElement
            ? rootElement
            : null;

    const copyButton =
        panel?.querySelector(
            "#damageAndLossesCopyReportButton",
        );

    const clearButton =
        panel?.querySelector(
            "#damageAndLossesClearButton",
        );

    const exportArea =
        panel?.querySelector(
            "#damageReportExportArea",
        );

    if (
        !(panel instanceof HTMLElement) ||
        !(copyButton instanceof HTMLButtonElement) ||
        !(clearButton instanceof HTMLButtonElement) ||
        !(exportArea instanceof HTMLElement)
    ) {
        return false;
    }

    if (
        copyButton.dataset
            .damageActionsInitialized ===
        "true"
    ) {
        return true;
    }

    copyButton.dataset
        .damageActionsInitialized =
            "true";

    bindReportImageExportButton(
        copyButton,
        {
            onCopy:
                function () {
                    runDamageReportExport({
                        exportArea,
                        copyButton,
                        clearButton,
                        mode: "copy",
                    });
                },

            onDownload:
                function () {
                    runDamageReportExport({
                        exportArea,
                        copyButton,
                        clearButton,
                        mode: "download",
                    });
                },
        },
    );

    clearButton.addEventListener(
        "click",
        function () {
            resetDamageAndLossesState();

            setReportNotification({
                reportId:
                    "damage-and-losses",
                type: "info",
                message:
                    "Relatório de avarias limpo.",
            });
        },
    );

    subscribeDamageAndLossesState(
        function () {
            renderDamageActionButtons(
                copyButton,
                clearButton,
            );
        },
    );

    renderDamageActionButtons(
        copyButton,
        clearButton,
    );

    return true;
}

export {
    canExportDamageReport,
    initializeDamageAndLossesActions,
};
