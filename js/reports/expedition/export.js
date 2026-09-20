import {
    getExpeditionState,
    subscribeExpeditionState,
} from "./state.js";

import {
    bindReportImageExportButton,
    createReportImageBlob,
    copyReportBlob,
    downloadReportBlob,
} from "../export.js";

import {
    setReportNotification,
} from "../report-notifications.js";

const expeditionExportAreas =
    Object.freeze({
        "#expedition-tables":
            "expeditionReportExportArea",
        "#expedition-charts":
            "expeditionChartsExportArea",
        "#expedition-mistakes":
            "expeditionMistakesExportArea",
        "#expedition-streets":
            "expeditionStreetsExportArea",
    });

let expeditionExportBusy = false;

function getActiveExpeditionTarget(
    panel,
) {
    return panel.querySelector(
        "#expedition-view-tabs .tabs-title.is-active > a",
    )?.getAttribute(
        "href",
    ) || "#expedition-tables";
}

function canExportActiveExpeditionArea(
    panel,
    state = getExpeditionState(),
) {
    const activeTarget =
        getActiveExpeditionTarget(
            panel,
        );

    if (
        activeTarget === "#expedition-mistakes"
    ) {
        return Boolean(
            state.hasErrorData ||
            state.routes.length > 0,
        );
    }

    if (
        activeTarget === "#expedition-streets"
    ) {
        return state.routes.length > 0;
    }

    return state.routes.length > 0;
}

function renderExpeditionExportButtons(
    panel,
    copyButton,
    downloadButton,
) {
    const disabled =
        expeditionExportBusy ||
        !canExportActiveExpeditionArea(
            panel,
        );

    copyButton.disabled = disabled;
    downloadButton.disabled = disabled;
}

function createExpeditionFileName() {
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

    return `relatorio-de-expedicao-${date}.png`;
}

async function runExpeditionExport({
    panel,
    copyButton,
    downloadButton,
    mode,
}) {
    if (
        expeditionExportBusy ||
        !canExportActiveExpeditionArea(
            panel,
        )
    ) {
        return;
    }

    const isCopy = mode === "copy";
    const button =
        isCopy
            ? copyButton
            : downloadButton;

    const originalTitle = button.title;
    const originalAriaLabel =
        button.getAttribute(
            "aria-label",
        );

    expeditionExportBusy = true;
    renderExpeditionExportButtons(
        panel,
        copyButton,
        downloadButton,
    );

    button.title =
        isCopy
            ? "Copiando relatório..."
            : "Gerando relatório...";

    button.setAttribute(
        "aria-busy",
        "true",
    );

    try {
        const activeTarget =
            getActiveExpeditionTarget(
                panel,
            );

        const exportArea =
            panel.querySelector(
                `#${expeditionExportAreas[activeTarget]}`,
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
                createExpeditionFileName(),
            );
        }

        setReportNotification({
            reportId: "expedition",
            type: "success",
            message:
                isCopy
                    ? "Relatório de expedição copiado."
                    : "Relatório de expedição baixado.",
        });
    } catch (error) {
        console.error(
            "Não foi possível exportar o relatório de expedição:",
            error,
        );

        setReportNotification({
            reportId: "expedition",
            type: "error",
            message: "Não foi possível exportar o relatório de expedição.",
        });

        window.alert(
            error instanceof Error
                ? error.message
                : "Não foi possível exportar o relatório de expedição.",
        );
    } finally {
        expeditionExportBusy = false;
        button.title = originalTitle;
        button.removeAttribute(
            "aria-busy",
        );

        if (originalAriaLabel) {
            button.setAttribute(
                "aria-label",
                originalAriaLabel,
            );
        }

        renderExpeditionExportButtons(
            panel,
            copyButton,
            downloadButton,
        );
    }
}

function initializeExpeditionExport(
    rootElement = document,
) {
    const panel =
        rootElement instanceof HTMLElement
            ? rootElement
            : rootElement.querySelector?.(
                "#expedition",
            );

    const copyButton =
        panel?.querySelector(
            "#expeditionCopyReportButton",
        );

    const downloadButton =
        copyButton;

    const tabs =
        panel?.querySelector(
            "#expedition-view-tabs",
        );

    if (
        !(panel instanceof HTMLElement) ||
        !(copyButton instanceof HTMLButtonElement) ||
        !(downloadButton instanceof HTMLButtonElement) ||
        !(tabs instanceof HTMLElement)
    ) {
        return false;
    }

    if (
        copyButton.dataset
            .expeditionExportInitialized ===
        "true"
    ) {
        return true;
    }

    copyButton.dataset
        .expeditionExportInitialized =
            "true";

    bindReportImageExportButton(
        copyButton,
        {
            onCopy:
                function () {
                    runExpeditionExport({
                        panel,
                        copyButton,
                        downloadButton,
                        mode: "copy",
                    });
                },
            onDownload:
                function () {
                    runExpeditionExport({
                        panel,
                        copyButton,
                        downloadButton,
                        mode: "download",
                    });
                },
        },
    );

    const renderAfterTabChange =
        function () {
            renderExpeditionExportButtons(
                panel,
                copyButton,
                downloadButton,
            );
        };

    if (
        typeof window.jQuery ===
        "function"
    ) {
        window.jQuery(
            tabs,
        ).on(
            "change.zf.tabs",
            renderAfterTabChange,
        );
    } else {
        tabs.addEventListener(
            "change",
            renderAfterTabChange,
        );
    }

    tabs.addEventListener(
        "click",
        function () {
            window.setTimeout(
                function () {
                    renderExpeditionExportButtons(
                        panel,
                        copyButton,
                        downloadButton,
                    );
                },
                0,
            );
        },
    );

    subscribeExpeditionState(
        function () {
            renderExpeditionExportButtons(
                panel,
                copyButton,
                downloadButton,
            );
        },
    );

    renderExpeditionExportButtons(
        panel,
        copyButton,
        downloadButton,
    );

    return true;
}

export {
    initializeExpeditionExport,
};
