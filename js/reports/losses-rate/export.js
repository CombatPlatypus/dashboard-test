import {
    LOSSES_RATE_MONTHS,
    getLossesRateState,
    resetLossesRateReport,
    subscribeLossesRateState,
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

/* ELEMENTOS DA EXPORTAÇÃO */

let lossesRateCopyReportButton =
    null;

let lossesRateDownloadReportButton =
    null;

let lossesRateClearReportButton =
    null;

let lossesRateReportExportArea =
    null;

let lossesRatePanel =
    null;

let lossesRateNotificationObserver =
    null;

let lossesRateReportHasActivity =
    false;

/* ESTADO DA EXPORTAÇÃO */

let lossesRateExportBusy =
    false;

/* VERIFICA UMA QUANTIDADE PREENCHIDA */

function isLossesRateQuantityFilled(
    value,
) {
    return (
        Number.isSafeInteger(
            value,
        ) &&
        value >= 0
    );
}

/* VERIFICA UM TEXTO PREENCHIDO */

function isLossesRateTextFilled(
    value,
) {
    return String(
        value ?? "",
    ).trim() !== "";
}

/* VERIFICA SE O RELATÓRIO PODE SER EXPORTADO */

function canExportLossesRateReport(
    state,
) {
    const month =
        state.months[
            state.activeMonth
        ];

    if (!month) {
        return false;
    }

    const identification =
        state.identification;

    const hasIdentification =
        isLossesRateTextFilled(
            identification.description,
        ) &&
        isLossesRateTextFilled(
            identification.hubCode,
        ) &&
        isLossesRateTextFilled(
            identification.subRegional,
        );

    const hasMovedVolume =
        Number.isSafeInteger(
            month.moved,
        ) &&
        month.moved > 0;

    const hasPossibleLosses =
        isLossesRateQuantityFilled(
            month.possibleLosses,
        );

    const hasLost =
        isLossesRateQuantityFilled(
            month.lost,
        );

    const hasDamage =
        isLossesRateQuantityFilled(
            month.damage,
        );

    return (
        hasIdentification &&
        hasMovedVolume &&
        hasPossibleLosses &&
        hasLost &&
        hasDamage
    );
}

function hasLossesRateReportData(
    state,
) {
    const identification =
        state.identification || {};

    return (
        Object.values(
            identification,
        ).some(
            function (value) {
                return isLossesRateTextFilled(
                    value,
                );
            },
        ) ||
        state.months.some(
            function (month) {
                return Object.values(
                    month,
                ).some(
                    function (value) {
                        return value !== null &&
                            value !== undefined;
                    },
                );
            },
        )
    );
}

/* ATUALIZA O STATUS DA EXPORTAÇÃO */

function renderLossesRateExportStatus(
    state,
) {
    const canExport =
        canExportLossesRateReport(
            state,
        );

    lossesRateCopyReportButton.disabled =
        lossesRateExportBusy ||
        !canExport;

    lossesRateDownloadReportButton.disabled =
        lossesRateExportBusy ||
        !canExport;

    lossesRateClearReportButton.disabled =
        lossesRateExportBusy ||
        !hasLossesRateReportData(
            state,
        );

    if (
        !lossesRatePanel.classList.contains(
            "is-active",
        )
        || !lossesRateReportHasActivity
    ) {
        return;
    }

    setReportNotification({
        reportId: "losses-rate",

        type:
            canExport
                ? "success"
                : "warning",

        message:
            canExport
                ? "O relatório de taxa de perdas está pronto para exportação."
                : "O relatório de taxa de perdas ainda aguarda informações.",
    });
}

/* AGUARDA A ATUALIZAÇÃO DOS GRÁFICOS */

function waitForLossesRateCharts() {
    return new Promise(
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
}

/* GERA A IMAGEM DA PRÉVIA */

async function createLossesRateReportBlob() {
    await waitForLossesRateCharts();

    return createReportImageBlob(
        lossesRateReportExportArea,
    );
}

/* NORMALIZA UMA PARTE DO NOME DO ARQUIVO */

function normalizeLossesRateFileNamePart(
    value,
) {
    return String(
        value ?? "",
    )
        .normalize(
            "NFD",
        )
        .replace(
            /[\u0300-\u036f]/g,
            "",
        )
        .toLowerCase()
        .replace(
            /[^a-z0-9]+/g,
            "-",
        )
        .replace(
            /^-+|-+$/g,
            "",
        );
}

/* CRIA O NOME DO ARQUIVO */

function createLossesRateReportFileName(
    state,
) {
    const monthName =
        LOSSES_RATE_MONTHS[
            state.activeMonth
        ] || "mes";

    const normalizedMonth =
        normalizeLossesRateFileNamePart(
            monthName,
        );

    return (
        `relatorio-de-taxa-de-perdas-` +
        `${normalizedMonth}-` +
        `${state.year}.png`
    );
}

/* EXIBE UM ERRO DE EXPORTAÇÃO */

function showLossesRateExportError(
    error,
    fallbackMessage,
) {
    console.error(
        fallbackMessage,
        error,
    );

    window.alert(
        error instanceof Error
            ? error.message
            : fallbackMessage,
    );
}

/* COPIA O RELATÓRIO */

async function handleCopyLossesRateReport() {
    const state =
        getLossesRateState();

    if (
        lossesRateExportBusy ||
        !canExportLossesRateReport(
            state,
        )
    ) {
        return;
    }

    const originalTitle =
        lossesRateCopyReportButton.title;

    const originalAriaLabel =
        lossesRateCopyReportButton.getAttribute(
            "aria-label",
        );

    lossesRateExportBusy =
        true;

    renderLossesRateExportStatus(
        state,
    );

    lossesRateCopyReportButton.title =
        "Copiando relatório...";

    lossesRateCopyReportButton.setAttribute(
        "aria-busy",
        "true",
    );

    try {
        const reportBlob =
            await createLossesRateReportBlob();

        await copyReportBlob(
            reportBlob,
        );

        setReportNotification({
            reportId: "losses-rate",
            type: "success",
            message: "Relatório de taxa de perdas copiado.",
        });
    } catch (error) {
        showLossesRateExportError(
            error,
            "Não foi possível copiar a imagem do relatório.",
        );
    } finally {
        lossesRateCopyReportButton.removeAttribute(
            "aria-busy",
        );

        lossesRateExportBusy =
            false;

        lossesRateCopyReportButton.title =
            originalTitle;

        if (originalAriaLabel) {
            lossesRateCopyReportButton.setAttribute(
                "aria-label",
                originalAriaLabel,
            );
        }

        renderLossesRateExportStatus(
            getLossesRateState(),
        );
    }
}

/* BAIXA O RELATÓRIO */

async function handleDownloadLossesRateReport() {
    const state =
        getLossesRateState();

    if (
        lossesRateExportBusy ||
        !canExportLossesRateReport(
            state,
        )
    ) {
        return;
    }

    const originalTitle =
        lossesRateDownloadReportButton.title;

    const originalAriaLabel =
        lossesRateDownloadReportButton.getAttribute(
            "aria-label",
        );

    lossesRateExportBusy =
        true;

    renderLossesRateExportStatus(
        state,
    );

    lossesRateDownloadReportButton.title =
        "Gerando relatório...";

    lossesRateDownloadReportButton.setAttribute(
        "aria-busy",
        "true",
    );

    try {
        const reportBlob =
            await createLossesRateReportBlob();

        downloadReportBlob(
            reportBlob,
            createLossesRateReportFileName(
                state,
            ),
        );

        setReportNotification({
            reportId: "losses-rate",
            type: "success",
            message: "Relatório de taxa de perdas baixado.",
        });
    } catch (error) {
        showLossesRateExportError(
            error,
            "Não foi possível baixar a imagem do relatório.",
        );
    } finally {
        lossesRateExportBusy =
            false;

        lossesRateDownloadReportButton.title =
            originalTitle;

        if (originalAriaLabel) {
            lossesRateDownloadReportButton.setAttribute(
                "aria-label",
                originalAriaLabel,
            );
        }

        lossesRateDownloadReportButton.removeAttribute(
            "aria-busy",
        );

        renderLossesRateExportStatus(
            getLossesRateState(),
        );
    }
}

/* INICIALIZA A EXPORTAÇÃO DO RELATÓRIO */

function initializeLossesRateExport(
    rootElement = document,
) {
    lossesRatePanel =
        rootElement.id ===
            "losses-rate"
            ? rootElement
            : rootElement.querySelector(
                "#losses-rate",
            );

    lossesRateCopyReportButton =
        rootElement.querySelector(
            "#lossesRateCopyReportButton",
        );

    lossesRateDownloadReportButton =
        lossesRateCopyReportButton;

    lossesRateClearReportButton =
        rootElement.querySelector(
            "#lossesRateClearReportButton",
        );

    lossesRateReportExportArea =
        rootElement.querySelector(
            "#lossesRatePreview",
        );

    if (
        !(
            lossesRateCopyReportButton instanceof
            HTMLButtonElement
        ) ||
        !(
            lossesRateDownloadReportButton instanceof
            HTMLButtonElement
        ) ||
        !(
            lossesRateClearReportButton instanceof
            HTMLButtonElement
        ) ||
        !(
            lossesRateReportExportArea instanceof
            HTMLElement
        ) ||
        !(
            lossesRatePanel instanceof
            HTMLElement
        )
    ) {
        return false;
    }

    if (
        lossesRateCopyReportButton.dataset
            .lossesRateExportInitialized ===
        "true"
    ) {
        return true;
    }

    lossesRateCopyReportButton.dataset
        .lossesRateExportInitialized =
            "true";

    lossesRateNotificationObserver
        ?.disconnect();

    lossesRateNotificationObserver =
        new MutationObserver(
            function () {
                if (
                    lossesRatePanel.classList.contains(
                        "is-active",
                    )
                ) {
                    renderLossesRateExportStatus(
                        getLossesRateState(),
                    );
                }
            },
        );

    lossesRateNotificationObserver.observe(
        lossesRatePanel,
        {
            attributes: true,
            attributeFilter: [
                "class",
            ],
        },
    );

    bindReportImageExportButton(
        lossesRateCopyReportButton,
        {
            onCopy:
                handleCopyLossesRateReport,
            onDownload:
                handleDownloadLossesRateReport,
        },
    );

    lossesRateClearReportButton.addEventListener(
        "click",
        function () {
            if (
                !window.confirm(
                    "Limpar todas as informações do relatório de taxa de perdas?",
                )
            ) {
                return;
            }

            resetLossesRateReport();

            setReportNotification({
                reportId: "losses-rate",
                type: "idle",
                message: "Relatório de taxa de perdas limpo.",
            });
        },
    );

    subscribeLossesRateState(
        function (state) {
            lossesRateReportHasActivity =
                true;

            renderLossesRateExportStatus(
                state,
            );
        },
    );

    renderLossesRateExportStatus(
        getLossesRateState(),
    );

    return true;
}

export {
    canExportLossesRateReport,
    initializeLossesRateExport,
    renderLossesRateExportStatus,
};
