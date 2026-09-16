import {
    getExpeditionErrorAnalysis,
    getExpeditionState,
    replaceExpeditionErrorData,
} from "./state.js";

import {
    setReportNotification,
} from "../report-notifications.js";

/* CONFIGURAÇÕES */

const EXPEDITION_ERRORS_HEADER_SEARCH_ROWS = 20;
const expeditionErrorsHeaderAliases = {
    sorting: [
        "erro de sorting",
        "erros de sorting",
    ],
    labeling: [
        "erro de etiqueta",
        "erros de etiqueta",
        "erro de etiquetagem",
        "erros de etiquetagem",
    ],
    code: [
        "codigo br",
    ],
};

/* NORMALIZAÇÕES */

function normalizeExpeditionErrorsText(value) {
    return String(value ?? "")
        .replace(/\u00a0/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function normalizeExpeditionErrorsKey(value) {
    return normalizeExpeditionErrorsText(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

function isExpeditionPackageCode(value) {
    return /^BR[A-Z0-9]+$/i.test(
        normalizeExpeditionErrorsText(value),
    );
}

/* CONVERTE O TEXTO COPIADO EM LINHAS */

function getExpeditionErrorsClipboardRows(text) {
    const clipboardText = String(text ?? "")
        .replace(/\r\n?/g, "\n")
        .trimEnd();

    if (!clipboardText.trim()) {
        throw new Error(
            "A área de transferência está vazia.",
        );
    }

    return clipboardText
        .split("\n")
        .map(function (line) {
            return line.split("\t");
        });
}

function findExpeditionErrorsHeaderColumn(
    row,
    aliases,
) {
    return row
        .map(normalizeExpeditionErrorsKey)
        .findIndex(function (header) {
            return aliases.includes(header);
        });
}

function findExpeditionErrorsClipboardSource(rows) {
    const searchLimit = Math.min(
        rows.length,
        EXPEDITION_ERRORS_HEADER_SEARCH_ROWS,
    );

    for (
        let rowIndex = 0;
        rowIndex < searchLimit;
        rowIndex += 1
    ) {
        const row = Array.isArray(rows[rowIndex])
            ? rows[rowIndex]
            : [];

        const sortingColumn =
            findExpeditionErrorsHeaderColumn(
                row,
                expeditionErrorsHeaderAliases.sorting,
            );

        const labelingColumn =
            findExpeditionErrorsHeaderColumn(
                row,
                expeditionErrorsHeaderAliases.labeling,
            );

        if (
            sortingColumn === -1 ||
            labelingColumn === -1
        ) {
            continue;
        }

        const detailSearchLimit = Math.min(
            rows.length,
            rowIndex + 4,
        );

        for (
            let detailRowIndex = rowIndex + 1;
            detailRowIndex < detailSearchLimit;
            detailRowIndex += 1
        ) {
            const detailRow =
                rows[detailRowIndex] ?? [];

            const sortingHeader =
                normalizeExpeditionErrorsKey(
                    detailRow[sortingColumn],
                );

            const labelingHeader =
                normalizeExpeditionErrorsKey(
                    detailRow[labelingColumn],
                );

            if (
                expeditionErrorsHeaderAliases.code
                    .includes(sortingHeader) &&
                expeditionErrorsHeaderAliases.code
                    .includes(labelingHeader)
            ) {
                return {
                    headerRowIndex: detailRowIndex,
                    sortingColumn,
                    labelingColumn,
                };
            }
        }
    }

    throw new Error(
        "Não encontrei os blocos Erro de Sorting e Erro de Etiqueta. Selecione e copie toda a planilha.",
    );
}

/* LÊ OS TOTAIS COPIADOS DA PLANILHA */

function parseExpeditionErrorsClipboardText(text) {
    const rows =
        getExpeditionErrorsClipboardRows(text);

    const source =
        findExpeditionErrorsClipboardSource(rows);

    let sortingErrors = 0;
    let labelingErrors = 0;

    for (
        let rowIndex = source.headerRowIndex + 1;
        rowIndex < rows.length;
        rowIndex += 1
    ) {
        const row = rows[rowIndex] ?? [];

        if (
            isExpeditionPackageCode(
                row[source.sortingColumn],
            )
        ) {
            sortingErrors += 1;
        }

        if (
            isExpeditionPackageCode(
                row[source.labelingColumn],
            )
        ) {
            labelingErrors += 1;
        }
    }

    if (
        sortingErrors === 0 &&
        labelingErrors === 0
    ) {
        throw new Error(
            "Nenhum Código BR foi encontrado nas listas de Sorting e Etiqueta.",
        );
    }

    return {
        sortingErrors,
        labelingErrors,
    };
}

/* ACESSA A ÁREA DE TRANSFERÊNCIA */

async function readExpeditionErrorsClipboardText() {
    if (!navigator.clipboard) {
        throw new Error(
            "O navegador não disponibilizou acesso à área de transferência.",
        );
    }

    let readError = null;

    if (
        typeof navigator.clipboard.readText ===
        "function"
    ) {
        try {
            const text =
                await navigator.clipboard.readText();

            if (text) {
                return text;
            }
        } catch (error) {
            readError = error;
        }
    }

    if (
        typeof navigator.clipboard.read ===
        "function"
    ) {
        try {
            const items =
                await navigator.clipboard.read();

            for (const item of items) {
                if (
                    !item.types.includes("text/plain")
                ) {
                    continue;
                }

                const blob = await item.getType(
                    "text/plain",
                );

                const text = await blob.text();

                if (text) {
                    return text;
                }
            }
        } catch (error) {
            readError = error;
        }
    }

    if (readError?.name === "NotAllowedError") {
        throw new Error(
            "O navegador bloqueou a área de transferência. Permita o acesso e clique novamente.",
        );
    }

    throw new Error(
        "Não foi possível ler a área de transferência.",
    );
}

/* CONTROLA A IMPORTAÇÃO */

function getExpeditionErrorsSuccessMessage(analysis) {
    const spreadsheetTotal =
        analysis.spreadsheetTotal.toLocaleString(
            "pt-BR",
        );

    if (!analysis.hasSpXData) {
        return (
            `A planilha importada possui ${spreadsheetTotal} erro(s). ` +
            "Importe também a conferência do SPX para calcular os totais."
        );
    }

    const spxTotal =
        analysis.spxTotal.toLocaleString("pt-BR");

    if (analysis.hasDivergence) {
        return (
            `A planilha importada possui ${spreadsheetTotal} erro(s), ` +
            `mas o SPX possui ${spxTotal}. ` +
            "O total do SPX prevaleceu e a distribuição foi balanceada proporcionalmente."
        );
    }

    return (
        `A planilha importada possui ${spreadsheetTotal} erro(s), ` +
        "igual ao total do SPX."
    );
}

async function importExpeditionErrorsFromClipboard(
    importButton,
) {
    const originalTitle = importButton.title;

    const originalAriaLabel =
        importButton.getAttribute(
            "aria-label",
        );

    importButton.disabled = true;
    importButton.title =
        "Importando erros da área de transferência...";

    importButton.setAttribute(
        "aria-label",
        "Importando erros da área de transferência",
    );

    importButton.setAttribute(
        "aria-busy",
        "true",
    );

    try {
        const clipboardText =
            await readExpeditionErrorsClipboardText();

        const result =
            parseExpeditionErrorsClipboardText(
                clipboardText,
            );

        replaceExpeditionErrorData(
            result,
            "Área de transferência",
        );

        const analysis =
            getExpeditionErrorAnalysis(
                getExpeditionState(),
            );

        const message =
            getExpeditionErrorsSuccessMessage(
                analysis,
            );

        setReportNotification({
            reportId: "expedition",

            type:
                analysis.hasDivergence ||
                !analysis.hasSpXData
                    ? "warning"
                    : "success",
            message,
        });
    } catch (error) {
        const errorMessage =
            error instanceof Error
                ? error.message
                : "Não foi possível importar os erros copiados.";

        console.error(
            "Não foi possível importar os erros copiados:",
            error,
        );

        setReportNotification({
            reportId: "expedition",

            type: "error",
            message:
                `Falha na importação: ${errorMessage}`,
        });
    } finally {
        importButton.title =
            originalTitle;

        if (originalAriaLabel) {
            importButton.setAttribute(
                "aria-label",
                originalAriaLabel,
            );
        }

        importButton.removeAttribute(
            "aria-busy",
        );

        importButton.disabled = false;
    }
}

/* INICIALIZAÇÃO */

function initializeExpeditionErrorsImport(
    rootElement = document,
) {
    const importButton =
        rootElement.querySelector(
            "#expeditionImportActionButton",
        );

    if (
        !(
            importButton instanceof
                HTMLButtonElement
        )
    ) {
        console.error(
            "Não foi possível inicializar a importação dos erros: botão não encontrado.",
        );

        return false;
    }

    if (
        importButton.dataset
            .expeditionErrorsImportInitialized ===
        "true"
    ) {
        return true;
    }

    importButton.dataset
        .expeditionErrorsImportInitialized =
            "true";

    importButton.addEventListener(
        "click",
        function () {
            const activeTarget =
                rootElement.querySelector(
                    "#expedition-view-tabs .tabs-title.is-active > a",
                )?.getAttribute(
                    "href",
                );

            if (
                activeTarget !== "#expedition-mistakes" &&
                activeTarget !== "#expedition-streets"
            ) {
                return;
            }

            importExpeditionErrorsFromClipboard(
                importButton,
            );
        },
    );

    return true;
}

export {
    initializeExpeditionErrorsImport,
    parseExpeditionErrorsClipboardText,
    readExpeditionErrorsClipboardText,
};
