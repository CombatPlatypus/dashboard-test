import assert from "node:assert/strict";
import test from "node:test";
import {
    createEmployeeRankingClipboard,
    parseEmployeeRankingClipboardText,
} from "../js/reports/employee-ranking/clipboard.js";
import { buildEmployeeExpeditionRanking } from "../js/reports/employee-ranking/model.js";

test("imports only the expedition block from the complete ranking worksheet", () => {
    const worksheet = [
        "\tRANKING MENSAL DE DESEMPENHO",
        "\tRecebimento de Pacotes\t\t\tErros de Etiquetagem\t\t\tAvarias Recebidas\t\t\tRotas Conferidas e Tempo Médio\t\t\t\tPacotes OFF",
        "\tColaborador\tTotal Recebido\t\tColaborador\tQuantidade\t\tColaborador\tQuantidade\t\tColaborador\tQuantidade\tTempo\t\tColaborador\tQuantidade",
        "\tAna Santos\t100\t\tAna Santos\t2\t\tAna Santos\t1\t\t[ops123] Maria da Silva Costa\t12\t05:29\t\tAna Santos\t3",
        "\tAna Santos\t80\t\t\t\t\t\t\t\t—\t—\t—\t\t\t",
        "\t\t\t\t\t\t\t\t\t\tJoão de Souza\t1.234\t\t\t\t",
    ].join("\r\n");

    assert.deepEqual(parseEmployeeRankingClipboardText(worksheet), [
        { operator: "Maria da Silva Costa", routesChecked: 12, totalDurationSeconds: 3948, routesWithDuration: 12 },
        { operator: "João de Souza", routesChecked: 1234, totalDurationSeconds: 0, routesWithDuration: 0 },
    ]);
});

test("copies the formatted ranking from B2 and keeps short names in the visible table", () => {
    const operators = [
        { operator: "Maria da Silva Costa", routesChecked: 12, totalDurationSeconds: 3948, routesWithDuration: 12 },
        { operator: "Maria da Silva Souza", routesChecked: 4, totalDurationSeconds: 1200, routesWithDuration: 4 },
    ];
    const ranking = buildEmployeeExpeditionRanking(operators);
    const { text, html } = createEmployeeRankingClipboard(ranking, 153);
    const rows = text.split("\n").map(row => row.split("\t"));

    assert.equal(rows.length, 158);
    assert.ok(rows.every(row => row.length === 17));
    assert.equal(rows[0][0], "RANKING MENSAL DE DESEMPENHO");
    assert.deepEqual([0, 3, 6, 9, 13].map(column => rows[3][column]), [
        "Recebimento", "Erros de Etiquetagem", "Avarias Recebidas", "Rotas Conferidas e Tempo Médio", "Pacotes OFF",
    ]);
    assert.deepEqual(rows[4].slice(9, 12), ["Colaborador", "Quantidade", "Tempo"]);
    assert.deepEqual(rows[5].slice(9, 12), ["Maria Silva", "12", "00:05:29"]);
    assert.deepEqual(rows[6].slice(9, 12), ["Maria Silva", "4", "00:05:00"]);
    assert.equal(rows[5][16], "Maria da Silva Costa");
    assert.equal(rows[6][16], "Maria da Silva Souza");
    assert.ok(rows.at(-1).every(cell => cell === ""));

    assert.match(html, /<google-sheets-html-origin>/);
    assert.match(html, /<td rowspan="2" colspan="15"[^>]*>RANKING MENSAL DE DESEMPENHO<\/td>/);
    assert.match(html, /<td rowspan="155" colspan="1"/);
    assert.doesNotMatch(html, /data-sheets-userformat/);
    const cellStyles = new Map(Array.from(html.matchAll(/<td\b[^>]*style="([^"]+)"[^>]*>([^<]*)<\/td>/g),
        ([, style, text]) => [text, style]));
    for (const [text, fontSize] of [
        ["RANKING MENSAL DE DESEMPENHO", 20],
        ["Rotas Conferidas e Tempo Médio", 12],
        ["Colaborador", 11],
        ["Maria Silva", 10],
        ["00:05:29", 10],
    ]) {
        assert.match(cellStyles.get(text), new RegExp(`font-size:${fontSize}pt;`));
        assert.match(cellStyles.get(text), /text-align:center;vertical-align:middle;/);
    }
    assert.deepEqual(parseEmployeeRankingClipboardText(text), operators);

    const fullWorksheet = rows.map(row => ["", ...row].join("\t")).join("\n");
    assert.deepEqual(parseEmployeeRankingClipboardText(fullWorksheet), operators);

    rows[5][16] = "";
    assert.throws(() => parseEmployeeRankingClipboardText(rows.map(row => row.join("\t")).join("\n")), /coluna R/);
});

test("rejects invalid historical rows instead of adding partial totals", () => {
    assert.throws(() => parseEmployeeRankingClipboardText("Ana Santos\t4\t00:05:29\nJoão Souza\t6\t05:80"), /linha 2/);
    assert.throws(() => parseEmployeeRankingClipboardText("Nome\tTurno\tLocal\tObservação"), /Copie a aba Ranking de Colaboradores/);
});
