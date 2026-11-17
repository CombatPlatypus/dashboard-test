import assert from "node:assert/strict";
import { test } from "node:test";

import {
    buildEmployeeExpeditionRanking,
    buildEmployeeLabelingErrorRanking,
    buildEmployeeReceiptRanking,
    formatEmployeeRankingDuration,
} from "../js/reports/employee-ranking/model.js";
import { getExpeditionOperatorRanking } from "../js/reports/expedition/state.js";
import { parseEmployeeRankingClipboard } from "../js/reports/employee-ranking/clipboard.js";

test("mescla pelo nome completo e exibe os dois primeiros nomes sem preposições", () => {
    const current = getExpeditionOperatorRanking({
        routes: [
            { status: "Validated", validationOperator: "[ops123] MARIA DA SILVA NUNES", validationDurationSeconds: 300 },
            { status: "Validado", validationOperator: "[ops123] MARIA DA SILVA NUNES", validationDurationSeconds: null },
            { status: "Validated", validationOperator: "[ops456] Maria da Silva Reis", validationDurationSeconds: 90 },
            { status: "Not Validated", validationOperator: "Ana Rosa Lima", validationDurationSeconds: 120 },
        ],
        excludedOperatorKeys: ["[ops123] maria da silva nunes"],
    });
    const imported = [{
        operator: " Maria  da Silva Nunes ",
        routesChecked: 10,
        totalDurationSeconds: 3600,
        routesWithDuration: 10,
    }];

    const ranking = buildEmployeeExpeditionRanking(current, imported);
    assert.deepEqual(ranking.map(({ displayName, routesChecked }) => [displayName, routesChecked]), [
        ["Maria Silva", 12],
        ["Maria Silva", 1],
    ]);
    assert.equal(ranking[0].operator, "MARIA DA SILVA NUNES");
    assert.equal(ranking[0].routesWithDuration, 11);
    assert.equal(ranking[0].averageDurationSeconds, 3900 / 11);
    assert.equal(formatEmployeeRankingDuration(ranking[0].averageDurationSeconds), "05:55");

    const resetRanking = buildEmployeeExpeditionRanking(current);
    assert.equal(resetRanking[0].routesChecked, 2);
    assert.equal(formatEmployeeRankingDuration(resetRanking[0].averageDurationSeconds), "05:00");
});

test("mantém as rotas sem tempo e ordena empates por tempo e nome inteiro", () => {
    const ranking = buildEmployeeExpeditionRanking([
        { operator: "Fabio de Almeida", routesChecked: 12, totalDurationSeconds: 3948, routesWithDuration: 12 },
        { operator: "Ana Rosa", routesChecked: 12, totalDurationSeconds: 3948, routesWithDuration: 12 },
        { operator: "Bruno Gomes", routesChecked: 12, totalDurationSeconds: 0, routesWithDuration: 0 },
        { operator: "Caio Lopes", routesChecked: 12, totalDurationSeconds: 60, routesWithDuration: 1 },
    ]);

    assert.deepEqual(ranking.map(({ displayName, averageDurationSeconds }) => `${displayName} / ${formatEmployeeRankingDuration(averageDurationSeconds)}`), [
        "Caio Lopes / 01:00",
        "Ana Rosa / 05:29",
        "Fabio Almeida / 05:29",
        "Bruno Gomes / —",
    ]);
});

test("Recebimento soma por nome completo e inclui todos os recebedores importados", () => {
    const current = [
        { receiver: "[ops123] MARIA DA SILVA NUNES", packagesReceived: 1000, selected: false },
        { receiver: "Maria da Silva Reis", packagesReceived: 200 },
        { receiver: "Ana Rosa Lima", packagesReceived: null },
    ];
    const historical = [
        { operator: " Maria  da Silva Nunes ", quantity: 800 },
        { operator: "José de Oliveira Santos", quantity: 300 },
    ];

    assert.deepEqual(buildEmployeeReceiptRanking(current, historical), [
        { operator: "MARIA DA SILVA NUNES", displayName: "Maria Silva", quantity: 1800 },
        { operator: "José de Oliveira Santos", displayName: "José Oliveira", quantity: 300 },
        { operator: "Maria da Silva Reis", displayName: "Maria Silva", quantity: 200 },
    ]);
});

test("Erros de Etiquetagem somam por etiquetador e recorrem ao recebedor quando o nome está vazio", () => {
    const current = [
        { receiver: "Recebedor Andrade", labeler: " Pedro da Costa Santos ", errorQuantity: 3, selected: false },
        { receiver: "Recebedor Bastos", labeler: "[ops123] PEDRO DA COSTA SANTOS", errorQuantity: 2 },
        { receiver: "João de Souza Lima", labeler: " ", errorQuantity: 2 },
        { receiver: "Zélia da Silva Alves", labeler: "—", errorQuantity: 0 },
        { receiver: "Ana da Rocha", labeler: "", errorQuantity: null },
    ];
    const historical = [
        { operator: "Pedro da Costa Santos", quantity: 10 },
        { operator: "Ana Rosa Lima", quantity: 2 },
    ];

    assert.deepEqual(buildEmployeeLabelingErrorRanking(current, historical), [
        { operator: "Zélia da Silva Alves", displayName: "Zélia Silva", quantity: 0 },
        { operator: "Ana Rosa Lima", displayName: "Ana Rosa", quantity: 2 },
        { operator: "João de Souza Lima", displayName: "João Souza", quantity: 2 },
        { operator: "Pedro da Costa Santos", displayName: "Pedro Costa", quantity: 15 },
    ]);
});

test("soma o nome abreviado da cópia em texto com o único nome correspondente do relatório", () => {
    const text = [
        "Recebimento\t\t\tErros de Etiquetagem\t\t\tAvarias Recebidas\t\t\tRotas Conferidas e Tempo Médio\t\t",
        "Colaborador\tQuantidade\t\tColaborador\tQuantidade\t\tColaborador\tQuantidade\t\tColaborador\tQuantidade\tTempo",
        "Mariane Ramos\t1.949\t\tPedro Costa\t10\t\t\t\t\tElizangela Aparecida\t3\t02:00",
    ].join("\n");
    const history = parseEmployeeRankingClipboard({ text });
    const operators = [
        { receiver: "[ops123] MARIANE RAMOS DE OLIVEIRA", packagesReceived: 1949,
            labeler: "Pedro da Costa Santos", errorQuantity: 5 },
    ];
    assert.deepEqual(buildEmployeeReceiptRanking(operators, history.receipt), [
        { operator: "MARIANE RAMOS DE OLIVEIRA", displayName: "Mariane Ramos", quantity: 3898 },
    ]);
    assert.deepEqual(buildEmployeeLabelingErrorRanking(operators, history.labelingErrors), [
        { operator: "Pedro da Costa Santos", displayName: "Pedro Costa", quantity: 15 },
    ]);
    const ranking = buildEmployeeExpeditionRanking([
        { operator: "Elizangela Aparecida do Brasil", routesChecked: 1, totalDurationSeconds: 240, routesWithDuration: 1 },
    ], history.expedition);
    assert.deepEqual(ranking, [{
        operator: "Elizangela Aparecida do Brasil", displayName: "Elizangela Aparecida",
        routesChecked: 4, totalDurationSeconds: 600, routesWithDuration: 4, averageDurationSeconds: 150,
    }]);
});

test("preserva homônimos e mantém separadas as linhas abreviadas sem correspondência única", () => {
    const current = [{ receiver: "Karina Santos de Lima", packagesReceived: 100 }];
    const historical = [
        { operator: "Karina Santos", quantity: 40 },
        { operator: "Karina Santos", quantity: 30 },
    ];
    assert.deepEqual(buildEmployeeReceiptRanking(current, historical), [
        { operator: "Karina Santos de Lima", displayName: "Karina Santos", quantity: 100 },
        { operator: "Karina Santos", displayName: "Karina Santos", quantity: 40, nameStatus: "ambiguous" },
        { operator: "Karina Santos", displayName: "Karina Santos", quantity: 30, nameStatus: "ambiguous" },
    ]);

    const homonyms = [...current, { receiver: "Karina Santos da Costa", packagesReceived: 10 }];
    assert.equal(buildEmployeeReceiptRanking(homonyms, [historical[0]])[1].nameStatus, "ambiguous");
    assert.deepEqual(buildEmployeeReceiptRanking(homonyms, [
        { operator: "Karina Santos de Lima", quantity: 40, fullNameConfirmed: true },
        { operator: "Karina Santos da Costa", quantity: 30, fullNameConfirmed: true },
        { operator: "Karina Santos", quantity: 4, fullNameConfirmed: true },
    ]).map(entry => [entry.operator, entry.quantity, entry.nameStatus]), [
        ["Karina Santos de Lima", 140, undefined],
        ["Karina Santos da Costa", 40, undefined],
        ["Karina Santos", 4, undefined],
    ]);
});

test("mantém um colaborador abreviado no histórico até que o relatório forneça o nome completo", () => {
    const historical = [{ operator: "João Souza", quantity: 20 }];
    assert.deepEqual(buildEmployeeReceiptRanking([], historical), [
        { operator: "João Souza", displayName: "João Souza", quantity: 20, nameStatus: "abbreviated" },
    ]);
    assert.deepEqual(buildEmployeeReceiptRanking([
        { receiver: "João de Souza Assis", packagesReceived: 15 },
    ], historical), [
        { operator: "João de Souza Assis", displayName: "João Souza", quantity: 35 },
    ]);
});
