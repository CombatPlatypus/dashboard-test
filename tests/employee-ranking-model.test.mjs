import assert from "node:assert/strict";
import { test } from "node:test";

import {
    buildEmployeeExpeditionRanking,
    buildEmployeeLabelingErrorRanking,
    buildEmployeeReceiptRanking,
    formatEmployeeRankingDuration,
} from "../js/reports/employee-ranking/model.js";
import { getExpeditionOperatorRanking } from "../js/reports/expedition/state.js";

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
