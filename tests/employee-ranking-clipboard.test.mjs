import assert from "node:assert/strict";
import test from "node:test";
import {
    createEmployeeRankingClipboardText,
    parseEmployeeRankingClipboardText,
} from "../js/reports/employee-ranking/clipboard.js";

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

test("copies full names and separate values to paste at K7, with space to overwrite an older list", () => {
    const records = [{ operator: "Maria da Silva Costa", routesChecked: 12, averageDurationSeconds: 329 }];
    const text = createEmployeeRankingClipboardText(records);
    const rows = text.split("\n");

    assert.equal(rows.length, 150);
    assert.equal(rows[0], "Maria da Silva Costa\t12\t00:05:29");
    assert.equal(rows.at(-1), "\t\t");
    assert.deepEqual(parseEmployeeRankingClipboardText(text), [
        { operator: "Maria da Silva Costa", routesChecked: 12, totalDurationSeconds: 3948, routesWithDuration: 12 },
    ]);
    assert.equal(createEmployeeRankingClipboardText(Array(151).fill(records[0])).split("\n").length, 151);
});

test("rejects invalid historical rows instead of adding partial totals", () => {
    assert.throws(() => parseEmployeeRankingClipboardText("Ana Santos\t4\t00:05:29\nJoão Souza\t6\t05:80"), /linha 2/);
    assert.throws(() => parseEmployeeRankingClipboardText("Nome\tTurno\tLocal\tObservação"), /Copie a aba Ranking de Colaboradores/);
});
