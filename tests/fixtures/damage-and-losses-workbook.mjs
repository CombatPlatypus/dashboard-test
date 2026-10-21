import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const XLSX = require("../../js/libraries/xlsx.full.min.js");

export function createDamageAndLossesWorkbook(
    returnedSheetName = "Históricos de Retornados",
) {
    const workbook = XLSX.utils.book_new();
    const history = [
        ["Histórico de Avarias", "", "", "", "", "Ocorrências do Mês", "", "", "", "", "Histórico de Perdas"],
        ["Semana", "Data", "Código BR", "Situação", "", "", "", "", "", "", "Semana", "Data", "Código BR", "Situação"],
        ["W40", new Date(2026, 9, 1, 12), "AV1", "Recebido", "", "", "", "", "", "", "W40", new Date(2026, 9, 1, 12), "BR1", "Lost"],
        ["W41", new Date(2026, 9, 5, 12), "AV2", "Não Recebido", "", "", "", "", "", "", "W40", new Date(2026, 9, 2, 12), "BR2", "Em Análise"],
        ["W41", new Date(2026, 9, 6, 12), "AV3", "Recebido", "", "", "", "", "", "", "W40", new Date(2026, 9, 3, 12), "BR3", "Lost"],
        ["", "", "", "", "", "", "", "", "", "", "W40", new Date(2026, 9, 3, 12), "BR4", "Lost"],
    ];
    const damageBase = [
        ["Informações dos Pacotes Avariados"],
        ["Código BR", "Status Inicial", "Estação Inicial", "Data", "Ticket"],
        ["AV1", "LMHub_Received", "LM Hub_SP_Santos_PraiaGrande_02", new Date(2026, 9, 1, 12), "Aprovado"],
        ["AV2", "SOC_Received", "SOC_SP_Cajamar", new Date(2026, 9, 5, 12), "Aprovado"],
        ["AV3", "LMHub_Received", "LM Hub_SP_Santos_PraiaGrande_02", new Date(2026, 9, 6, 12), "Aprovado"],
    ];
    const products = [
        ["Apuração de Avarias Recebidas"],
        ["Semana", "Data", "Código BR", "Turno", "Tipo de Produto"],
        ["W40", new Date(2026, 9, 1, 12), "AV1", "AM", "Líquido"],
        ["W41", new Date(2026, 9, 6, 12), "AV3", "AM", "Vidro"],
    ];
    const lossesBase = [
        ["Acompanhamento dos Pacotes em Análise"],
        ["Data", "Código BR", "Situação", "Rota", "AT", "ID do Motorista", "Motorista", "Produto", "Pack Recovery"],
        [new Date(2026, 9, 1, 12), "BR1", "Lost", "", "", "", "", "", "Feito"],
        [new Date(2026, 9, 2, 12), "BR2", "Em Análise", "", "", "", "", "", "Não Feito"],
        [new Date(2026, 9, 3, 12), "BR3", "Lost", "", "", "", "", "", "ID Inválido"],
        [new Date(2026, 9, 3, 12), "BR4", "Lost", "", "", "", "", "", "-"],
    ];
    const returned = [
        ["Informações dos Pacotes Retornados", "", "", "", "", "", "", "", "", "", "Base de Análise"],
        ["Semana", "Devolução", "Expedição", "Código BR", "", "", "", "", "", "", "Código BR"],
        ["W40", new Date(2026, 9, 2, 12), new Date(2026, 9, 1, 12), "RET1", "", "", "", "", "", "", "IGNORAR"],
        ["W40", new Date(2026, 9, 3, 12), new Date(2026, 9, 2, 12), "RET2"],
    ];
    const months = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
    ];
    const rate = [
        ["LM HUB SP Santos Praia Grande 02 / LSP-63 - SPM07", "", "", "", "", "", "", "Mês Atual"],
        ["Possíveis Perdas", "Lost", "Avaria", "Volume Movimentado", "Taxa", "Mês", "", "Lost", "Avarias"],
        ...months.map((month, index) => index === 9
            ? [111, 26, 60, 356741, 0.000241071, month, "", 999, 888]
            : [0, 0, 0, 0, 0, month]),
    ];

    for (const [name, rows] of [
        ["Histórico de Avarias e Perdas", history],
        ["Taxa de Perdas", rate],
        [returnedSheetName, returned],
        ["Avarias Recebidas", products],
        ["Base de Avarias", damageBase],
        ["Base de Análises", lossesBase],
    ]) {
        XLSX.utils.book_append_sheet(
            workbook,
            XLSX.utils.aoa_to_sheet(rows),
            name,
        );
    }

    return workbook;
}
