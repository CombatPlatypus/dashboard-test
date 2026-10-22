import { getDamageAndLossesState, subscribeDamageAndLossesState } from "./state.js";
import { getLossesState, subscribeLossesState } from "./losses-state.js";
import { subscribeLossesRateState } from "../losses-rate/state.js";
import { setReportNotification } from "../report-notifications.js";
import { createHistoryClipboardText, formatOccurrenceDate } from "./history.js";
import { getConsolidatedSummary } from "./consolidated-model.js";
import { createConsolidatedCompositionChart } from "./consolidated-charts.js";

const quantity = new Intl.NumberFormat("pt-BR");
const percentage = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1 });
const lossRate = new Intl.NumberFormat("pt-BR", {
    style: "percent", minimumFractionDigits: 3, maximumFractionDigits: 3,
});
let elements = null;
let compositionChart = null;
const renderedHistories = new WeakMap();
const copyingButtons = new Set();

function renderHistory(body, records) {
    const previous = renderedHistories.get(body);
    if (previous?.length === records.length && previous.every((record, index) =>
        ["date", "packageCode", "situation"].every(field => record[field] === records[index][field]))) {
        return;
    }
    const fragment = document.createDocumentFragment();
    if (records.length === 0) {
        for (let index = 0; index < 8; index += 1) {
            const row = document.createElement("tr");
            row.className = "empty-row";
            for (let column = 0; column < 3; column += 1) {
                const cell = document.createElement("td");
                cell.textContent = "—";
                row.appendChild(cell);
            }
            fragment.appendChild(row);
        }
    }
    for (const record of records) {
        const row = document.createElement("tr");
        for (const value of [formatOccurrenceDate(record.date), record.packageCode, record.situation || "—"]) {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);
        }
        fragment.appendChild(row);
    }
    body.replaceChildren(fragment);
    renderedHistories.set(body, records);
}

function renderConsolidatedView() {
    if (!elements || !compositionChart) return false;
    const damage = getDamageAndLossesState();
    const losses = getLossesState();
    const summary = getConsolidatedSummary(damage, losses);
    for (const [key, value, available] of [
        ["hub", summary.hub, summary.hasDamageData],
        ["soc", summary.soc, summary.hasDamageData],
        ["underReview", summary.underReview, summary.hasLossesData],
        ["confirmedLosses", summary.confirmedLosses, summary.hasLossesData],
    ]) {
        elements[key].textContent = available ? quantity.format(value) : "—";
    }
    elements.lossRate.textContent = summary.lossRate === null ? "—" : lossRate.format(summary.lossRate);

    renderHistory(elements.damageBody, damage.history);
    renderHistory(elements.lossesBody, losses.history);
    elements.copyDamage.disabled = damage.history.length === 0 || copyingButtons.has(elements.copyDamage);
    elements.copyLosses.disabled = losses.history.length === 0 || copyingButtons.has(elements.copyLosses);

    [elements.compositionUnderReview, elements.compositionLost, elements.compositionDamage]
        .forEach((element, index) => {
            const value = summary.composition[index];
            const available = index === 2 ? summary.hasDamageData : summary.hasLossesData;
            element.textContent = available
                ? `${quantity.format(value)} (${percentage.format(summary.total ? value / summary.total : 0)})`
                : "—";
        });
    compositionChart.data.datasets[0].data = summary.composition;
    compositionChart.options.plugins.consolidatedCenterText.text =
        summary.hasData ? quantity.format(summary.total) : "—";
    elements.canvas.setAttribute("aria-label", summary.hasData
        ? `Composição das ocorrências de ${summary.monthName} de ${summary.year}: ${summary.underReview} em análise, ${summary.confirmedLosses} perdas confirmadas e ${summary.hub} avarias do Hub.`
        : "Composição das ocorrências: sem dados importados.");
    compositionChart.update("none");
    return true;
}

async function copyHistory(button, getRecords, label) {
    const records = getRecords();
    if (!records.length || copyingButtons.has(button)) return;
    copyingButtons.add(button);
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    try {
        if (typeof navigator.clipboard?.writeText !== "function") {
            throw new Error("A cópia exige um navegador com acesso à área de transferência.");
        }
        await navigator.clipboard.writeText(createHistoryClipboardText(records));
        setReportNotification({
            reportId: "damage-and-losses", type: "success",
            message: `Histórico de ${label} copiado (${quantity.format(records.length)} registros).`,
        });
    } catch (error) {
        console.error("Não foi possível copiar o histórico:", error);
        setReportNotification({
            reportId: "damage-and-losses", type: "error",
            message: `Não foi possível copiar o histórico de ${label}. Verifique a permissão da área de transferência.`,
        });
    } finally {
        copyingButtons.delete(button);
        button.removeAttribute("aria-busy");
        button.disabled = getRecords().length === 0;
    }
}

function initializeConsolidatedView(rootElement = document.getElementById("damage-and-losses")) {
    const panel = rootElement?.querySelector("#consolidated-history");
    if (!(panel instanceof HTMLElement) || typeof window.Chart !== "function") return false;
    if (panel.dataset.consolidatedInitialized === "true") return true;
    const ids = {
        hub: "consolidatedHubValue", soc: "consolidatedSocValue", lossRate: "consolidatedLossRateValue",
        underReview: "consolidatedUnderReviewValue", confirmedLosses: "consolidatedConfirmedLossesValue",
        damageBody: "consolidatedDamageHistoryBody", lossesBody: "consolidatedLossesHistoryBody",
        copyDamage: "consolidatedCopyDamageButton", copyLosses: "consolidatedCopyLossesButton",
        canvas: "consolidatedCompositionChart",
        compositionUnderReview: "consolidatedCompositionUnderReview",
        compositionLost: "consolidatedCompositionLost", compositionDamage: "consolidatedCompositionDamage",
    };
    const found = Object.fromEntries(Object.entries(ids).map(([key, id]) => [key, panel.querySelector(`#${id}`)]));
    if (!Object.values(found).every(element => element instanceof HTMLElement)) return false;
    elements = found;
    compositionChart = createConsolidatedCompositionChart(elements.canvas);
    panel.dataset.consolidatedInitialized = "true";
    elements.copyDamage.addEventListener("click", () =>
        copyHistory(elements.copyDamage, () => getDamageAndLossesState().history, "avarias"));
    elements.copyLosses.addEventListener("click", () =>
        copyHistory(elements.copyLosses, () => getLossesState().history, "perdas"));
    subscribeDamageAndLossesState(renderConsolidatedView);
    subscribeLossesState(renderConsolidatedView);
    subscribeLossesRateState(renderConsolidatedView);
    new MutationObserver(() => {
        if (!rootElement.classList.contains("is-active") || !panel.classList.contains("is-active")) return;
        window.requestAnimationFrame(() => {
            compositionChart.resize();
            compositionChart.update("none");
        });
    }).observe(rootElement, { attributes: true, attributeFilter: ["class"], subtree: true });
    return renderConsolidatedView();
}

export { initializeConsolidatedView, renderConsolidatedView };
