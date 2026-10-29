import { getExpeditionErrorAnalysis, getExpeditionOperatorRanking, getExpeditionSummary } from "./state.js";
import { createXlsxTemplateBlob } from "../xlsx-template.js";
import { createReportSpreadsheetFileName, fillSpreadsheetTable, spreadsheetDuration, spreadsheetQuantity, spreadsheetRate, spreadsheetText } from "../spreadsheet-utils.js";

function canExportExpeditionSpreadsheet(state) {
    return Boolean(getExpeditionSummary(state).hasData || state.hasErrorData);
}

async function updateExpeditionSpreadsheetChart(archive, analysis) {
    const labels = ["Erros de Sorting", "Erros de Etiquetagem", "Revertidos", "Saldo Final"];
    const values = [analysis.sortingErrors, analysis.labelingErrors, analysis.totalRevertedErrors, analysis.finalErrors];
    // O gráfico nativo mantém o desenho e as referências; atualiza apenas os dados em cache.
    for (const filename of Object.keys(archive.files).filter(name => /^xl\/charts\/chart\d+\.xml$/.test(name))) {
        let xml = await archive.file(filename).async("string");
        if (!xml.includes("'Tabelas dos Gráficos'!$A$1:$A$4")) continue;
        const points = (items, numeric) => `<c:ptCount val="${items.length}"/>` + items.map((value, index) =>
            `<c:pt idx="${index}"><c:v>${numeric ? value ?? 0 : value}</c:v></c:pt>`).join("");
        xml = xml.replace(/<c:strRef>[\s\S]*?<\/c:strRef>/g, reference => reference
            .replace(/<c:strCache\b[^>]*\/>|<c:strCache>[\s\S]*?<\/c:strCache>/g, "")
            .replace("</c:strRef>", `<c:strCache>${points(labels, false)}</c:strCache></c:strRef>`))
            .replace(/<c:numRef>[\s\S]*?<\/c:numRef>/g, reference => reference
                .replace(/<c:numCache\b[^>]*\/>|<c:numCache>[\s\S]*?<\/c:numCache>/g, "")
                .replace("</c:numRef>", `<c:numCache><c:formatCode>General</c:formatCode>${points(values, true)}</c:numCache></c:numRef>`));
        archive.file(filename, xml, { createFolders: false });
    }
}

function createExpeditionSpreadsheetBlob(state, date = new Date(), options = {}) {
    const summary = getExpeditionSummary(state);
    const analysis = getExpeditionErrorAnalysis(state);
    const operators = getExpeditionOperatorRanking(state).filter(operator => operator.selected !== false);
    const streets = analysis.streets ?? [];
    const ranked = [...streets].sort((a, b) => a.totalErrors - b.totalErrors || a.missingOrders - b.missingOrders ||
        a.name.localeCompare(b.name, "pt-BR", { numeric: true }));
    const best = ranked[0];
    const worst = ranked.at(-1);
    const quantity = value => spreadsheetQuantity(summary.hasData ? value : null);
    return createXlsxTemplateBlob({
        templateUrl: "xlsx/Relatório de Expedição.xlsx",
        sheets: [
            { sheetName: "Resumo da Expedição", cells(template) {
                const cells = new Map([
                    ["A3", spreadsheetText(state.window)], ["C3", quantity(summary.operatorCount)],
                    ["E3", quantity(summary.validatedRoutes)], ["G3", quantity(summary.volumeChecked)],
                    ["I3", quantity(summary.floorVolume)], ["K3", spreadsheetDuration(summary.hasData ? summary.expeditionDurationSeconds : null)],
                    ["A7", quantity(summary.missingOrders)], ["C7", quantity(summary.duplicatedOrders)],
                    ["E7", quantity(summary.missortedOrders)], ["G7", quantity(summary.exceptionOrders)],
                    ["I7", quantity(summary.withdrawnOrders)],
                    ["K7", "—"],
                ]);
                fillSpreadsheetTable(template, cells, {
                    columns: ["A", "E", "G", "I", "K"], headers: ["Conferentes SPX", "Rotas Feitas", "Tempo Médio", "Melhor Tempo", "Pior Tempo"], label: "conferentes",
                    rows: operators.map(operator => [operator.operator, operator.routesChecked, spreadsheetDuration(operator.averageDurationSeconds),
                        spreadsheetDuration(operator.bestDurationSeconds), spreadsheetDuration(operator.worstDurationSeconds)]),
                });
                return cells;
            } },
            { sheetName: "Análise de Erros e Ruas", cells(template) {
                const cells = new Map([
                    ["A3", spreadsheetQuantity(analysis.sortingErrors)], ["C3", spreadsheetQuantity(analysis.labelingErrors)],
                    ["E3", spreadsheetQuantity(analysis.totalErrors)], ["G3", spreadsheetRate(analysis.totalErrors, summary.hasData ? summary.volumeChecked : null)],
                    ["A7", spreadsheetQuantity(analysis.totalRevertedErrors)], ["C7", spreadsheetRate(analysis.totalRevertedErrors, analysis.totalErrors)],
                    ["E7", spreadsheetQuantity(analysis.finalErrors)], ["G7", spreadsheetRate(analysis.finalErrors, summary.hasData ? summary.volumeChecked : null)],
                    ["J3", spreadsheetText(best?.name)], ["L3", spreadsheetText(worst?.name)],
                    ["J6", spreadsheetRate(best?.totalErrors, analysis.totalErrors)], ["L6", spreadsheetRate(worst?.totalErrors, analysis.totalErrors)],
                ]);
                fillSpreadsheetTable(template, cells, {
                    columns: ["J", "K", "L", "M"], headers: ["Rua", "Pacotes Ausentes", "Erros da Rua", "Taxa de Erros"], label: "ruas",
                    rows: streets.map(street => [street.name, street.missingOrders, street.totalErrors,
                        spreadsheetRate(street.totalErrors, analysis.totalErrors)]),
                });
                cells.set("M9", "Taxa de Erros");
                return cells;
            } },
            { sheetName: "Tabelas dos Gráficos", cells: new Map([
                ["A2", "Erros de Etiquetagem"],
                ...[["A3", analysis.sortingErrors], ["C3", analysis.labelingErrors], ["A7", analysis.totalRevertedErrors], ["E7", analysis.finalErrors]]
                    .map(([cell, value], index) => [`B${index + 1}`, { formula: `'Análise de Erros e Ruas'!${cell}`, value }]),
            ]) },
        ],
        afterUpdate: archive => updateExpeditionSpreadsheetChart(archive, analysis),
        ...options,
    });
}

function createExpeditionSpreadsheetFileName(date = new Date()) {
    return createReportSpreadsheetFileName("expedicao", date);
}

export { canExportExpeditionSpreadsheet, createExpeditionSpreadsheetBlob, createExpeditionSpreadsheetFileName };
