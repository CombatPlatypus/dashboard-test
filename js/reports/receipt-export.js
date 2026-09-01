import {
    getReceiptState,
    subscribeReceiptState,
} from "./receipt-state.js";

import {
    createReportImageBlob,
    copyReportBlob,
    downloadReportBlob,
} from "./export.js";

let receiptExportBusy = false;

const receiptExportElements = {
    statusIcon: null,
    statusText: null,
    copyButton: null,
    downloadButton: null,
    mainArea: null,
    comparisonArea: null,
};

/* RETORNA A PENDÊNCIA DO RELATÓRIO */

function getReceiptExportPendingMessage(
    state,
) {
    if (
        !Array.isArray(
            state.operators,
        ) ||
        state.operators.length === 0
    ) {
        return "Importe o arquivo de recebimento.";
    }

    if (
        !Number.isSafeInteger(
            state.expectedVolume,
        ) ||
        state.expectedVolume <= 0
    ) {
        return "Informe o volume esperado.";
    }

    const hasMissingErrors =
        state.operators.some(
            function (
                operator,
            ) {
                return !(
                    Number.isSafeInteger(
                        operator.errorQuantity,
                    ) &&
                    operator.errorQuantity >= 0
                );
            },
        );

    if (hasMissingErrors) {
        return (
            "Informe os erros de todas as linhas; " +
            "use 0 quando não houver."
        );
    }

    return "";
}

/* VERIFICA SE PODE EXPORTAR */

function canExportReceiptReport(
    state,
) {
    return (
        getReceiptExportPendingMessage(
            state,
        ) === ""
    );
}

/* ATUALIZA O RODAPÉ */

function renderReceiptExportStatus(
    state,
) {
    const pendingMessage =
        getReceiptExportPendingMessage(
            state,
        );

    const canExport =
        pendingMessage === "";

    receiptExportElements
        .copyButton
        .disabled =
            receiptExportBusy ||
            !canExport;

    receiptExportElements
        .downloadButton
        .disabled =
            receiptExportBusy ||
            !canExport;

    receiptExportElements
        .statusIcon
        .src =
            canExport
                ? "images/geral-icons/success-icon.svg"
                : "images/geral-icons/alert-icon.svg";

    receiptExportElements
        .statusText
        .textContent =
            canExport
                ? "O relatório está pronto para exportação."
                : pendingMessage;
}

/* RETORNA A GUIA ATIVA */

function getActiveReceiptViewId() {
    const activeLink =
        document.querySelector(
            "#receipt-view-tabs " +
            ".tabs-title.is-active > a",
        );

    const panelId =
        activeLink
            ?.getAttribute(
                "href",
            )
            ?.slice(
                1,
            );

    return panelId ===
        "receipt-charts"
            ? "receipt-charts"
            : "receipt-tables";
}

/* AGUARDA A RENDERIZAÇÃO DA GUIA */

function waitForReceiptExportView() {
    return new Promise(
        function (
            resolve,
        ) {
            window.requestAnimationFrame(
                function () {
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
        },
    );
}

/* ATIVA UMA GUIA */

async function activateReceiptView(
    panelId,
) {
    const panel =
        document.getElementById(
            panelId,
        );

    if (
        !(
            panel instanceof
            HTMLElement
        )
    ) {
        throw new Error(
            "A guia do relatório não foi encontrada.",
        );
    }

    if (
        !panel.classList.contains(
            "is-active",
        )
    ) {
        const tabLink =
            document.querySelector(
                `#receipt-view-tabs ` +
                `a[href="#${panelId}"]`,
            );

        if (
            !(
                tabLink instanceof
                HTMLAnchorElement
            )
        ) {
            throw new Error(
                "O botão da guia do relatório não foi encontrado.",
            );
        }

        tabLink.click();
    }

    await waitForReceiptExportView();
}

/* CONVERTE O CANVAS FINAL EM PNG */

function createReceiptCanvasBlob(
    canvas,
) {
    return new Promise(
        function (
            resolve,
            reject,
        ) {
            canvas.toBlob(
                function (
                    blob,
                ) {
                    if (!blob) {
                        reject(
                            new Error(
                                "Não foi possível gerar a imagem final.",
                            ),
                        );

                        return;
                    }

                    resolve(
                        blob,
                    );
                },
                "image/png",
            );
        },
    );
}

/* UNE AS DUAS GUIAS */

async function combineReceiptReportBlobs(
    mainBlob,
    comparisonBlob,
) {
    if (
        typeof window.createImageBitmap !==
        "function"
    ) {
        throw new Error(
            "O navegador não suporta a composição da imagem.",
        );
    }

    const [
        mainImage,
        comparisonImage,
    ] = await Promise.all([
        window.createImageBitmap(
            mainBlob,
        ),

        window.createImageBitmap(
            comparisonBlob,
        ),
    ]);

    const gap = 40;

    const canvas =
        document.createElement(
            "canvas",
        );

    canvas.width =
        Math.max(
            mainImage.width,
            comparisonImage.width,
        );

    canvas.height =
        mainImage.height +
        gap +
        comparisonImage.height;

    const context =
        canvas.getContext(
            "2d",
        );

    if (!context) {
        mainImage.close();
        comparisonImage.close();

        throw new Error(
            "Não foi possível montar a imagem final.",
        );
    }

    context.fillStyle =
        "#1f1f1f";

    context.fillRect(
        0,
        0,
        canvas.width,
        canvas.height,
    );

    context.drawImage(
        mainImage,

        Math.floor(
            (
                canvas.width -
                mainImage.width
            ) / 2,
        ),

        0,
    );

    context.drawImage(
        comparisonImage,

        Math.floor(
            (
                canvas.width -
                comparisonImage.width
            ) / 2,
        ),

        mainImage.height +
            gap,
    );

    mainImage.close();
    comparisonImage.close();

    return createReceiptCanvasBlob(
        canvas,
    );
}

/* CAPTURA AS DUAS GUIAS */

async function createReceiptReportBlob() {
    const originalViewId =
        getActiveReceiptViewId();

    let mainBlob;
    let comparisonBlob;

    try {
        await activateReceiptView(
            "receipt-tables",
        );

        mainBlob =
            await createReportImageBlob(
                receiptExportElements
                    .mainArea,
            );

        await activateReceiptView(
            "receipt-charts",
        );

        comparisonBlob =
            await createReportImageBlob(
                receiptExportElements
                    .comparisonArea,
            );
    } finally {
        await activateReceiptView(
            originalViewId,
        );
    }

    return combineReceiptReportBlobs(
        mainBlob,
        comparisonBlob,
    );
}

/* CRIA O NOME DO ARQUIVO */

function createReceiptReportFileName(
    state,
) {
    const currentDate =
        new Date();

    const date = [
        currentDate.getFullYear(),

        String(
            currentDate.getMonth() +
            1,
        ).padStart(
            2,
            "0",
        ),

        String(
            currentDate.getDate(),
        ).padStart(
            2,
            "0",
        ),
    ].join(
        "-",
    );

    const receiptWindow =
        String(
            state.window ||
            "janela",
        )
            .trim()
            .toLowerCase();

    return (
        `relatorio-de-recebimento-` +
        `${receiptWindow}-${date}.png`
    );
}

/* EXECUTA A EXPORTAÇÃO */

async function runReceiptExport(
    mode,
) {
    const state =
        getReceiptState();

    if (
        receiptExportBusy ||
        !canExportReceiptReport(
            state,
        )
    ) {
        return;
    }

    const isCopy =
        mode === "copy";

    const button =
        isCopy
            ? receiptExportElements
                .copyButton
            : receiptExportElements
                .downloadButton;

    const originalText =
        button.textContent;

    receiptExportBusy =
        true;

    renderReceiptExportStatus(
        state,
    );

    button.textContent =
        isCopy
            ? "Copiando..."
            : "Gerando...";

    button.setAttribute(
        "aria-busy",
        "true",
    );

    try {
        const reportBlob =
            await createReceiptReportBlob();

        if (isCopy) {
            await copyReportBlob(
                reportBlob,
            );

            button.textContent =
                "Copiado!";

            await new Promise(
                function (
                    resolve,
                ) {
                    window.setTimeout(
                        resolve,
                        1200,
                    );
                },
            );
        } else {
            downloadReportBlob(
                reportBlob,

                createReceiptReportFileName(
                    state,
                ),
            );
        }
    } catch (error) {
        console.error(
            "Não foi possível exportar o relatório:",
            error,
        );

        window.alert(
            error instanceof Error
                ? error.message
                : "Não foi possível exportar a imagem.",
        );
    } finally {
        receiptExportBusy =
            false;

        button.textContent =
            originalText;

        button.removeAttribute(
            "aria-busy",
        );

        renderReceiptExportStatus(
            getReceiptState(),
        );
    }
}

/* INICIALIZAÇÃO */

function initializeReceiptExport() {
    receiptExportElements.statusIcon =
        document.getElementById(
            "receiptReportStatusIcon",
        );

    receiptExportElements.statusText =
        document.getElementById(
            "receiptReportStatusText",
        );

    receiptExportElements.copyButton =
        document.getElementById(
            "receiptCopyReportButton",
        );

    receiptExportElements.downloadButton =
        document.getElementById(
            "receiptDownloadReportButton",
        );

    receiptExportElements.mainArea =
        document.getElementById(
            "receiptReportExportArea",
        );

    receiptExportElements.comparisonArea =
        document.getElementById(
            "receiptComparisonExportArea",
        );

    const hasAllElements =
        Object.values(
            receiptExportElements,
        ).every(
            function (
                element,
            ) {
                return (
                    element instanceof
                    HTMLElement
                );
            },
        );

    if (!hasAllElements) {
        console.error(
            "Elementos da exportação do recebimento não encontrados.",
        );

        return false;
    }

    if (
        receiptExportElements
            .copyButton
            .dataset
            .receiptExportInitialized ===
        "true"
    ) {
        return true;
    }

    receiptExportElements
        .copyButton
        .dataset
        .receiptExportInitialized =
            "true";

    receiptExportElements
        .copyButton
        .addEventListener(
            "click",

            function () {
                runReceiptExport(
                    "copy",
                );
            },
        );

    receiptExportElements
        .downloadButton
        .addEventListener(
            "click",

            function () {
                runReceiptExport(
                    "download",
                );
            },
        );

    subscribeReceiptState(
        renderReceiptExportStatus,
    );

    renderReceiptExportStatus(
        getReceiptState(),
    );

    return true;
}

export {
    initializeReceiptExport,
};