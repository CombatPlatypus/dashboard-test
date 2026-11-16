import {
    getExpeditionChangeScope,
    getExpeditionOperatorRanking,
    subscribeExpeditionState,
} from "../expedition/state.js";
import { requestReportUpdate } from "../core/report-updates.js";
import {
    bindReportImageExportButton,
    copyReportBlob,
    createReportImageBlob,
    downloadReportBlob,
} from "../export.js";
import { setReportNotification } from "../report-notifications.js";
import { writeSummaryClipboard } from "../summary-copy.js";
import {
    MIN_EMPLOYEE_RANKING_ROWS,
    createEmployeeRankingClipboard,
    parseEmployeeRankingClipboardText,
} from "./clipboard.js";
import { buildEmployeeExpeditionRanking, formatEmployeeRankingDuration } from "./model.js";
import {
    getEmployeeRankingHistory,
    replaceEmployeeRankingHistory,
    subscribeEmployeeRankingHistory,
} from "./state.js";

const numberFormat = new Intl.NumberFormat("pt-BR");
let initialized = false;

function notify(type, message) {
    setReportNotification({ reportId: "employee-ranking", type, message });
}

function renderRankingRows(body, ranking = []) {
    const rowCount = Math.max(MIN_EMPLOYEE_RANKING_ROWS, ranking.length);
    while (body.rows.length > rowCount) body.deleteRow(-1);

    const addedRows = document.createDocumentFragment();
    for (let index = 0; index < rowCount; index += 1) {
        const entry = ranking[index];
        let row = body.rows[index];
        if (!row) {
            row = document.createElement("tr");
            row.insertCell();
            row.insertCell();
            addedRows.append(row);
        }
        const name = entry?.displayName ?? "—";
        const stats = entry
            ? `${numberFormat.format(entry.routesChecked)} / ${formatEmployeeRankingDuration(entry.averageDurationSeconds)}`
            : "—";
        if (row.cells[0].textContent !== name) row.cells[0].textContent = name;
        if (row.cells[1].textContent !== stats) row.cells[1].textContent = stats;
        row.toggleAttribute("data-placeholder", !entry);
    }
    body.append(addedRows);
}

function initializeEmployeeRankingController(root) {
    if (initialized) return true;

    const panel = root.querySelector("#employee-ranking");
    const area = panel?.querySelector("#employeeRankingExportArea");
    const tables = area?.querySelector(".employee-ranking");
    const expeditionBody = area?.querySelector("#employeeRankingExpeditionBody");
    const copyButton = panel?.querySelector("#employeeRankingCopyButton");
    const imageButton = panel?.querySelector("#employeeRankingImageButton");
    const importButton = panel?.querySelector("#employeeRankingImportButton");
    const clearButton = panel?.querySelector("#employeeRankingClearButton");
    if (!tables || !expeditionBody || !copyButton || !imageButton || !importButton || !clearButton) {
        return false;
    }

    let current = getExpeditionOperatorRanking();
    let ranking = [];
    let busy = false;
    let clipboardRowCount = 0;

    function renderActions() {
        copyButton.disabled = busy || ranking.length === 0;
        imageButton.disabled = busy || ranking.length === 0;
        importButton.disabled = busy;
        clearButton.disabled = busy || getEmployeeRankingHistory().length === 0;
    }

    function renderExpeditionRanking() {
        ranking = buildEmployeeExpeditionRanking(current, getEmployeeRankingHistory());
        clipboardRowCount = Math.max(clipboardRowCount, ranking.length);
        renderRankingRows(expeditionBody, ranking);
        renderActions();
        return true;
    }

    async function runAction(button, action) {
        if (busy) return;
        busy = true;
        button.setAttribute("aria-busy", "true");
        renderActions();
        try {
            await action();
        } catch (error) {
            notify("error", error.message);
        } finally {
            busy = false;
            button.removeAttribute("aria-busy");
            renderActions();
        }
    }

    async function exportImage(mode) {
        await runAction(imageButton, async () => {
            const tableOverflow = tables.scrollWidth - tables.clientWidth;
            const blob = await createReportImageBlob(area, {
                onclone(clonedDocument) {
                    const exportArea = clonedDocument.getElementById(area.id);
                    exportArea.classList.add("employee-ranking-image");
                    if (tableOverflow > 0) {
                        exportArea.style.minWidth = `${area.offsetWidth + tableOverflow}px`;
                    }
                },
            });
            if (mode === "download") {
                downloadReportBlob(blob, "ranking-de-colaboradores.png");
                notify("success", "Imagem do ranking baixada.");
            } else {
                await copyReportBlob(blob);
                notify("success", "Imagem do ranking copiada.");
            }
        });
    }

    copyButton.addEventListener("click", () => runAction(copyButton, async () => {
        try {
            await writeSummaryClipboard(createEmployeeRankingClipboard(ranking, clipboardRowCount));
        } catch {
            throw new Error("Não foi possível copiar o ranking com formatação. Verifique a permissão da área de transferência.");
        }
        notify("success", "Ranking copiado. Use Ctrl+V na célula B2 da aba Ranking de Colaboradores.");
    }));

    bindReportImageExportButton(imageButton, {
        onCopy: () => exportImage("copy"),
        onDownload: () => exportImage("download"),
    });

    importButton.addEventListener("click", () => runAction(importButton, async () => {
        let text;
        try {
            text = await navigator.clipboard.readText();
        } catch {
            throw new Error("Não foi possível ler a área de transferência. Permita o acesso e clique novamente.");
        }
        const history = parseEmployeeRankingClipboardText(text);
        replaceEmployeeRankingHistory(history);
        if (history.length) {
            notify("success", "Acumulado anterior de Expedição importado.");
        } else {
            notify("info", "A planilha está sem registros acumulados de Expedição.");
        }
    }));

    clearButton.addEventListener("click", () => {
        replaceEmployeeRankingHistory([]);
        notify("info", "Acumulado descartado. O ranking mostra os dados atuais de Expedição.");
    });

    for (const body of area.querySelectorAll("tbody")) {
        if (body !== expeditionBody) renderRankingRows(body);
    }
    subscribeExpeditionState((_, change, derived) => {
        if (!getExpeditionChangeScope(change).routes) return;

        current = derived.getRanking();
        requestReportUpdate(renderExpeditionRanking);
        if (current.length) {
            notify("info", "Ranking atualizado com os dados de Expedição.");
        } else if (getEmployeeRankingHistory().length) {
            notify("info", "Ranking mostra o acumulado importado de Expedição.");
        } else {
            notify("info", "Importe o relatório de Expedição para preencher o ranking.");
        }
    });
    subscribeEmployeeRankingHistory(() => requestReportUpdate(renderExpeditionRanking));
    initialized = renderExpeditionRanking();
    return initialized;
}

export { initializeEmployeeRankingController };
