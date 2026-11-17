import {
    getExpeditionChangeScope,
    getExpeditionOperatorRanking,
    subscribeExpeditionState,
} from "../expedition/state.js";
import { getDamageAndLossesState, subscribeDamageAndLossesState } from "../damage-and-losses/state.js";
import { getLossesState, subscribeLossesState } from "../damage-and-losses/losses-state.js";
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
    parseEmployeeRankingClipboard,
    readEmployeeRankingClipboard,
} from "./clipboard.js";
import { buildEmployeeExpeditionRanking, buildEmployeeOccurrenceRanking, formatEmployeeRankingDuration } from "./model.js";
import {
    getEmployeeRankingHistory,
    replaceEmployeeRankingHistory,
    subscribeEmployeeRankingHistory,
} from "./state.js";

const numberFormat = new Intl.NumberFormat("pt-BR");
const monthFormat = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
const emptyRankingMessage = "Importe Expedição ou a planilha de Avarias e Perdas para preencher o ranking.";
let initialized = false;

function notify(type, message) {
    setReportNotification({ reportId: "employee-ranking", type, message });
}

function renderRankingRows(body, ranking = [], formatStats = entry => numberFormat.format(entry.quantity)) {
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
        const stats = entry ? formatStats(entry) : "—";
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
    const receivedDamageBody = area?.querySelector("#employeeRankingReceivedDamageBody");
    const expeditionBody = area?.querySelector("#employeeRankingExpeditionBody");
    const offPackagesBody = area?.querySelector("#employeeRankingOffPackagesBody");
    const copyButton = panel?.querySelector("#employeeRankingCopyButton");
    const imageButton = panel?.querySelector("#employeeRankingImageButton");
    const importButton = panel?.querySelector("#employeeRankingImportButton");
    const clearButton = panel?.querySelector("#employeeRankingClearButton");
    if (!tables || !receivedDamageBody || !expeditionBody || !offPackagesBody ||
        !copyButton || !imageButton || !importButton || !clearButton) {
        return false;
    }

    const monthlyTables = {
        receivedDamageRanking: { body: receivedDamageBody, label: "Avarias Recebidas" },
        offPackagesRanking: { body: offPackagesBody, label: "Pacotes OFF" },
    };
    const monthlySources = {};
    const rankings = { receivedDamageRanking: [], expeditionRanking: [], offPackagesRanking: [] };
    let current = getExpeditionOperatorRanking();
    let busy = false;
    let clipboardRowCount = 0;

    function renderActions() {
        const hasData = Object.values(rankings).some(ranking => ranking.length > 0);
        copyButton.disabled = busy || !hasData;
        imageButton.disabled = busy || !hasData;
        importButton.disabled = busy;
        clearButton.disabled = busy || getEmployeeRankingHistory().length === 0;
    }

    function renderExpeditionRanking() {
        const expeditionRanking = buildEmployeeExpeditionRanking(current, getEmployeeRankingHistory());
        rankings.expeditionRanking = expeditionRanking;
        clipboardRowCount = Math.max(clipboardRowCount, expeditionRanking.length);
        renderRankingRows(expeditionBody, expeditionRanking, entry =>
            `${numberFormat.format(entry.routesChecked)} / ${formatEmployeeRankingDuration(entry.averageDurationSeconds)}`,
        );
        renderActions();
        return true;
    }

    function renderMonthlyRankings(changes, announce = true) {
        for (const [section, data] of Object.entries(changes)) {
            monthlySources[section] = data;
            const ranking = buildEmployeeOccurrenceRanking(data?.operators ?? []);
            rankings[section] = ranking;
            clipboardRowCount = Math.max(clipboardRowCount, ranking.length);
            renderRankingRows(monthlyTables[section].body, ranking);
        }
        renderActions();
        if (announce) {
            const message = getMonthlyRankingMessage();
            if (message) notify("info", message);
            else notifyCurrentRanking();
        }
        return true;
    }

    function getMonthlyRankingMessage() {
        const messages = [];
        for (const [section, data] of Object.entries(monthlySources)) {
            if (!data) continue;
            const { label } = monthlyTables[section];
            const month = monthFormat.format(new Date(`${data.month}-01T00:00:00Z`));
            messages.push(data.operators.length
                ? `Ranking de ${label} atualizado para ${month}.`
                : `Sem registros atribuídos em ${label} para ${month}.`);
        }
        return messages.join(" ");
    }

    function notifyCurrentRanking() {
        if (current.length) {
            notify("info", "Ranking atualizado com os dados de Expedição.");
        } else if (getEmployeeRankingHistory().length) {
            notify("info", "Ranking mostra o acumulado importado de Expedição.");
        } else {
            notify("info", getMonthlyRankingMessage() || emptyRankingMessage);
        }
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
            await writeSummaryClipboard(createEmployeeRankingClipboard(rankings, clipboardRowCount));
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
        let clipboard;
        try {
            clipboard = await readEmployeeRankingClipboard();
        } catch {
            throw new Error("Não foi possível ler a área de transferência. Permita o acesso e clique novamente.");
        }
        const history = parseEmployeeRankingClipboard(clipboard);
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
        if (body !== receivedDamageBody && body !== expeditionBody && body !== offPackagesBody) renderRankingRows(body);
    }
    subscribeExpeditionState((_, change, derived) => {
        if (!getExpeditionChangeScope(change).routes) return;

        current = derived.getRanking();
        requestReportUpdate(renderExpeditionRanking);
        notifyCurrentRanking();
    });
    subscribeDamageAndLossesState((damage, change) => {
        if (change.receivedDamageChanged) {
            requestReportUpdate(renderMonthlyRankings, { receivedDamageRanking: damage.receivedDamage });
        }
    });
    subscribeLossesState((losses, change) => {
        if (change.offPackagesChanged) {
            requestReportUpdate(renderMonthlyRankings, { offPackagesRanking: losses.offPackages });
        }
    });
    subscribeEmployeeRankingHistory(() => requestReportUpdate(renderExpeditionRanking));
    renderExpeditionRanking();
    initialized = renderMonthlyRankings({
        receivedDamageRanking: getDamageAndLossesState().receivedDamage,
        offPackagesRanking: getLossesState().offPackages,
    }, false);
    return initialized;
}

export { initializeEmployeeRankingController };
