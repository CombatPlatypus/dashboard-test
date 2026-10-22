import {
    getDamageAndLossesState,
    getDamageAndLossesSummary,
    resetDamageAndLossesState,
    subscribeDamageAndLossesState,
} from "./state.js";

import {
    getLossesState,
    getLossesSummary,
    resetLossesState,
    subscribeLossesState,
} from "./losses-state.js";

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

function isLossesReportActive(panel) {
    return panel
        ?.querySelector("#losses")
        ?.classList.contains("is-active") ===
        true;
}

function canExportDamageReport(panel) {
    if (panel?.querySelector("#consolidated-history")?.classList.contains("is-active")) {
        const damage = getDamageAndLossesState();
        const losses = getLossesState();
        return getDamageAndLossesSummary(damage).hasData ||
            getLossesSummary(losses).hasData || damage.history.length > 0 || losses.history.length > 0;
    }
    return isLossesReportActive(panel)
        ? getLossesSummary(
            getLossesState(),
        ).hasData
        : getDamageAndLossesSummary(
            getDamageAndLossesState(),
        ).hasData;
}

function renderDamageActionButtons(
    panel,
    copyButton,
    clearButton,
) {
    const hasData =
        canExportDamageReport(panel);

    copyButton.disabled =
        damageExportBusy ||
        !hasData;

    clearButton.disabled =
        damageExportBusy ||
        !hasData;
}

function createDamageReportFileName(
    isLossesReport,
    isConsolidatedReport = false,
) {
    const date =
        new Intl.DateTimeFormat(
            "pt-BR",
        )
            .format(new Date())
            .replace(/\//g, "-");

    return isConsolidatedReport
        ? `historico-consolidado-${date}.png`
        : `relatorio-de-${isLossesReport ? "perdas" : "avarias"}-${date}.png`;
}

async function runDamageReportExport({
    panel,
    damageExportArea,
    lossesExportArea,
    copyButton,
    clearButton,
    mode,
}) {
    if (
        damageExportBusy ||
        !canExportDamageReport(panel)
    ) {
        return;
    }

    const isCopy =
        mode === "copy";

    const isLossesReport =
        isLossesReportActive(panel);

    const isConsolidatedReport =
        panel.querySelector("#consolidated-history")?.classList.contains("is-active") === true;
    const reportLabel = isConsolidatedReport
        ? "histórico consolidado"
        : isLossesReport ? "perdas" : "avarias";

    const exportArea =
        isConsolidatedReport
            ? panel.querySelector("#consolidatedExportArea")
            : isLossesReport
            ? lossesExportArea
            : damageExportArea;

    const originalTitle =
        copyButton.title;

    const originalAriaLabel =
        copyButton.getAttribute(
            "aria-label",
        );

    damageExportBusy = true;
    renderDamageActionButtons(
        panel,
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
                createDamageReportFileName(
                    isLossesReport,
                    isConsolidatedReport,
                ),
            );
        }

        setReportNotification({
            reportId:
                "damage-and-losses",
            type: "success",
            message:
                isCopy
                    ? `Relatório de ${reportLabel} copiado.`
                    : `Relatório de ${reportLabel} baixado.`,
        });
    } catch (error) {
        console.error(
            "Não foi possível exportar o relatório:",
            error,
        );

        setReportNotification({
            reportId:
                "damage-and-losses",
            type: "error",
            message:
                `Não foi possível exportar o relatório de ${reportLabel}.`,
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
            panel,
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

    const damageExportArea =
        panel?.querySelector(
            "#damageReportExportArea",
        );

    const lossesExportArea =
        panel?.querySelector(
            "#lossesReportExportArea",
        );

    if (
        !(panel instanceof HTMLElement) ||
        !(copyButton instanceof HTMLButtonElement) ||
        !(clearButton instanceof HTMLButtonElement) ||
        !(damageExportArea instanceof HTMLElement) ||
        !(lossesExportArea instanceof HTMLElement)
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
                        panel,
                        damageExportArea,
                        lossesExportArea,
                        copyButton,
                        clearButton,
                        mode: "copy",
                    });
                },

            onDownload:
                function () {
                    runDamageReportExport({
                        panel,
                        damageExportArea,
                        lossesExportArea,
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
            resetLossesState();

            setReportNotification({
                reportId:
                    "damage-and-losses",
                type: "info",
                message:
                    "Relatório de avarias e perdas limpo.",
            });
        },
    );

    subscribeDamageAndLossesState(
        function () {
            renderDamageActionButtons(
                panel,
                copyButton,
                clearButton,
            );
        },
    );

    subscribeLossesState(
        function () {
            renderDamageActionButtons(
                panel,
                copyButton,
                clearButton,
            );
        },
    );

    panel.querySelector(
        "#damage-and-losses-choice",
    )?.addEventListener(
        "click",
        function () {
            window.requestAnimationFrame(
                function () {
                    renderDamageActionButtons(
                        panel,
                        copyButton,
                        clearButton,
                    );
                },
            );
        },
    );

    renderDamageActionButtons(
        panel,
        copyButton,
        clearButton,
    );

    return true;
}

export {
    canExportDamageReport,
    initializeDamageAndLossesActions,
};
