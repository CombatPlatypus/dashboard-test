import { getReceiptSummary } from "./state.js";
import { getReceiptLinehaulSummary } from "./linehaul-state.js";
import { formatReportPersonFirstName } from "../core/person-name.js";
import { createXlsxTemplateBlob } from "../xlsx-template.js";
import { createReportSpreadsheetFileName, fillSpreadsheetTable, spreadsheetQuantity, spreadsheetRate, spreadsheetText } from "../spreadsheet-utils.js";

function canExportReceiptSpreadsheet({ receipt, linehaul }) {
    return getReceiptSummary(receipt).receivedVolume !== null || getReceiptLinehaulSummary(linehaul).hasData;
}

function createReceiptSpreadsheetBlob({ receipt, linehaul }, date = new Date(), options = {}) {
    const received = getReceiptSummary(receipt);
    const unloaded = getReceiptLinehaulSummary(linehaul);
    const operators = receipt.operators.filter(operator => operator.selected !== false);
    return createXlsxTemplateBlob({
        templateUrl: "xlsx/Relatório de Processamento.xlsx",
        sheets: [
            { sheetName: "Descarregamento de LHs", cells(template) {
                const cells = new Map([
                    ["A3", spreadsheetText(linehaul.window)],
                    ["C3", spreadsheetQuantity(unloaded.hasData ? linehaul.expectedVolume : null)],
                    ["E3", spreadsheetQuantity(unloaded.hasData ? unloaded.unloadedVolume : null)],
                    ["G3", spreadsheetQuantity(unloaded.hasData ? unloaded.unloadedCount : null)],
                ]);
                fillSpreadsheetTable(template, cells, {
                    columns: ["A", "C", "E", "G"], headers: ["Código do LH", "Motorista", "Origem", "Volume"], label: "LHs descarregados",
                    rows: unloaded.selectedLinehauls.map(lh => [spreadsheetText(lh.code), spreadsheetText(lh.driver),
                        spreadsheetText(lh.origin), spreadsheetQuantity(lh.loadedOrders)]),
                });
                return cells;
            } },
            { sheetName: "Mesa de Recebimento", cells(template) {
                const cells = new Map([
                    ["A3", spreadsheetText(receipt.window)], ["C3", spreadsheetQuantity(receipt.expectedVolume)],
                    ["E3", spreadsheetQuantity(received.receivedVolume)], ["G3", spreadsheetQuantity(received.totalErrors)],
                    ["I3", spreadsheetRate(received.totalErrors, received.receivedVolume)],
                ]);
                fillSpreadsheetTable(template, cells, {
                    columns: ["A", "E", "G", "I"], headers: ["Recebedores SPX", "Pacotes Recebidos", "Erros", "Taxa de Erros"], label: "recebedores",
                    rows: operators.map(operator => [spreadsheetText(operator.receiver), spreadsheetQuantity(operator.packagesReceived),
                        spreadsheetQuantity(operator.errorQuantity), spreadsheetRate(operator.errorQuantity,
                            receipt.useTotalErrorParticipation ? received.totalErrors : operator.packagesReceived)]),
                });
                fillSpreadsheetTable(template, cells, {
                    columns: ["L", "N"], headers: ["Recebedor", "Etiquetador"], label: "duplas do recebimento",
                    rows: operators.map(operator => [formatReportPersonFirstName(operator.receiver), formatReportPersonFirstName(operator.labeler)]),
                });
                // O cálculo já vem do relatório; dispensa a fórmula de matriz específica do Planilhas.
                cells.set("L2", "Recebedor");
                if (receipt.useTotalErrorParticipation) cells.set("I6", "Participação nos Erros");
                return cells;
            } },
        ],
        ...options,
    });
}

function createReceiptSpreadsheetFileName(date = new Date()) {
    return createReportSpreadsheetFileName("processamento", date);
}

export { canExportReceiptSpreadsheet, createReceiptSpreadsheetBlob, createReceiptSpreadsheetFileName };
