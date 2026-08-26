import {
    LOSSES_RATE_MONTHS,
    getLossesRateState,
    subscribeLossesRateState,
} from "./losses-rate-state.js";

import {
    createReportImageBlob,
    copyReportBlob,
    downloadReportBlob,
} from "./export.js";

/* ELEMENTOS DA EXPORTAÇÃO */

let lossesRateReportStatusIcon =
    null;

let lossesRateReportStatusText =
    null;

let lossesRateCopyReportButton =
    null;

let lossesRateDownloadReportButton =
    null;

let lossesRateReportExportArea =
    null;

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

    lossesRateReportStatusIcon.src =
        canExport
            ? "images/geral-icons/success-icon.svg"
            : "images/geral-icons/alert-icon.svg";

    lossesRateReportStatusText.textContent =
        canExport
            ? "O relatório está pronto para exportação."
            : "O relatório ainda aguarda informações.";
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

    const originalText =
        lossesRateCopyReportButton
            .textContent;

    let copySucceeded =
        false;

    lossesRateExportBusy =
        true;

    renderLossesRateExportStatus(
        state,
    );

    lossesRateCopyReportButton.textContent =
        "Copiando...";

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

        copySucceeded =
            true;

        lossesRateCopyReportButton.textContent =
            "Copiado!";
    } catch (error) {
        showLossesRateExportError(
            error,
            "Não foi possível copiar a imagem do relatório.",
        );
    } finally {
        lossesRateCopyReportButton.removeAttribute(
            "aria-busy",
        );

        if (copySucceeded) {
            window.setTimeout(
                function () {
                    lossesRateExportBusy =
                        false;

                    lossesRateCopyReportButton.textContent =
                        originalText;

                    renderLossesRateExportStatus(
                        getLossesRateState(),
                    );
                },
                1200,
            );
        } else {
            lossesRateExportBusy =
                false;

            lossesRateCopyReportButton.textContent =
                originalText;

            renderLossesRateExportStatus(
                getLossesRateState(),
            );
        }
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

    const originalText =
        lossesRateDownloadReportButton
            .textContent;

    lossesRateExportBusy =
        true;

    renderLossesRateExportStatus(
        state,
    );

    lossesRateDownloadReportButton.textContent =
        "Gerando...";

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
    } catch (error) {
        showLossesRateExportError(
            error,
            "Não foi possível baixar a imagem do relatório.",
        );
    } finally {
        lossesRateExportBusy =
            false;

        lossesRateDownloadReportButton.textContent =
            originalText;

        lossesRateDownloadReportButton.removeAttribute(
            "aria-busy",
        );

        renderLossesRateExportStatus(
            getLossesRateState(),
        );
    }
}

/* INICIALIZA A EXPORTAÇÃO DO RELATÓRIO */

function initializeLossesRateExport() {
    lossesRateReportStatusIcon =
        document.getElementById(
            "lossesRateReportStatusIcon",
        );

    lossesRateReportStatusText =
        document.getElementById(
            "lossesRateReportStatusText",
        );

    lossesRateCopyReportButton =
        document.getElementById(
            "lossesRateCopyReportButton",
        );

    lossesRateDownloadReportButton =
        document.getElementById(
            "lossesRateDownloadReportButton",
        );

    lossesRateReportExportArea =
        document.getElementById(
            "lossesRatePreview",
        );

    if (
        !(
            lossesRateReportStatusIcon instanceof
            HTMLImageElement
        ) ||
        !(
            lossesRateReportStatusText instanceof
            HTMLElement
        ) ||
        !(
            lossesRateCopyReportButton instanceof
            HTMLButtonElement
        ) ||
        !(
            lossesRateDownloadReportButton instanceof
            HTMLButtonElement
        ) ||
        !(
            lossesRateReportExportArea instanceof
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

    lossesRateCopyReportButton.addEventListener(
        "click",
        handleCopyLossesRateReport,
    );

    lossesRateDownloadReportButton.addEventListener(
        "click",
        handleDownloadLossesRateReport,
    );

    subscribeLossesRateState(
        function (state) {
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
    initializeLossesRateExport,
};