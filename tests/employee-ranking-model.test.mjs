import assert from "node:assert/strict";
import { test } from "node:test";

import {
    buildEmployeeExpeditionRanking,
    buildEmployeeLabelingErrorRanking,
    buildEmployeeReceiptRanking,
} from "../js/reports/employee-ranking/model.js";
import { getExpeditionOperatorRanking } from "../js/reports/expedition/state.js";
import { parseEmployeeRankingClipboard } from "../js/reports/employee-ranking/clipboard.js";

test("soma rotas pelo OPS identificado e exibe os dois primeiros nomes sem preposições", () => {
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

    assert.deepEqual(buildEmployeeExpeditionRanking(current, imported), {
        ranking: [
            { operator: "MARIA DA SILVA NUNES", opsCode: "ops123", displayName: "Maria Silva", quantity: 12 },
            { operator: "Maria da Silva Reis", opsCode: "ops456", displayName: "Maria Silva", quantity: 1 },
        ],
        pending: [],
    });

    const { ranking: resetRanking } = buildEmployeeExpeditionRanking(current);
    assert.equal(resetRanking[0].quantity, 2);
});

test("ordena rotas por quantidade e nome, independentemente das durações", () => {
    const { ranking } = buildEmployeeExpeditionRanking([
        { operator: "[ops11] Fabio de Almeida", routesChecked: 12, totalDurationSeconds: 3948, routesWithDuration: 12 },
        { operator: "[ops12] Ana Rosa", routesChecked: 12, totalDurationSeconds: 3948, routesWithDuration: 12 },
        { operator: "[ops13] Bruno Gomes", routesChecked: 12 },
        { operator: "[ops14] Caio Lopes", routesChecked: 12, totalDurationSeconds: 60, routesWithDuration: 1 },
    ]);

    assert.deepEqual(ranking.map(({ displayName, quantity }) => [displayName, quantity]), [
        ["Ana Rosa", 12],
        ["Bruno Gomes", 12],
        ["Caio Lopes", 12],
        ["Fabio Almeida", 12],
    ]);
});

test("Recebimento soma por código e deixa recebedores sem OPS pendentes", () => {
    const current = [
        { receiver: "[ops123] MARIA DA SILVA NUNES", packagesReceived: 1000, selected: false },
        { receiver: "Maria da Silva Reis", packagesReceived: 200 },
        { receiver: "Ana Rosa Lima", packagesReceived: null },
    ];
    const historical = [
        { operator: " Maria  da Silva Nunes ", quantity: 800 },
        { operator: "José de Oliveira Santos", quantity: 300 },
    ];

    assert.deepEqual(buildEmployeeReceiptRanking(current, historical), {
        ranking: [{ operator: "MARIA DA SILVA NUNES", opsCode: "ops123", displayName: "Maria Silva", quantity: 1800 }],
        pending: [
            { operator: "Maria da Silva Reis", quantity: 200 },
            { operator: "José de Oliveira Santos", quantity: 300 },
        ],
    });
});

test("Erros de Etiquetagem somam por etiquetador e recorrem ao recebedor quando o nome está vazio", () => {
    const current = [
        { receiver: "Recebedor Andrade", labeler: " Pedro da Costa Santos ", errorQuantity: 3, selected: false },
        { receiver: "Recebedor Bastos", labeler: "[ops123] PEDRO DA COSTA SANTOS", errorQuantity: 2 },
        { receiver: "[ops20] João de Souza Lima", labeler: " ", errorQuantity: 2 },
        { receiver: "[ops21] Zélia da Silva Alves", labeler: "—", errorQuantity: 0 },
        { receiver: "Ana da Rocha", labeler: "", errorQuantity: null },
        { receiver: "[ops22] Recebedor Costa", labeler: "Bruno Rodrigues Lima", errorQuantity: 3 },
    ];
    const historical = [
        { operator: "Pedro da Costa Santos", quantity: 10 },
        { operator: "Ana Rosa Lima", opsCode: "ops23", quantity: 2 },
    ];

    assert.deepEqual(buildEmployeeLabelingErrorRanking(current, historical), {
        ranking: [
            { operator: "Zélia da Silva Alves", opsCode: "ops21", displayName: "Zélia Silva", quantity: 0 },
            { operator: "Ana Rosa Lima", opsCode: "ops23", displayName: "Ana Rosa", quantity: 2 },
            { operator: "João de Souza Lima", opsCode: "ops20", displayName: "João Souza", quantity: 2 },
            { operator: "Pedro da Costa Santos", opsCode: "ops123", displayName: "Pedro Costa", quantity: 15 },
        ],
        pending: [{ operator: "Bruno Rodrigues Lima", quantity: 3 }],
    });
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
            labeler: "[ops124] Pedro da Costa Santos", errorQuantity: 5 },
    ];
    assert.deepEqual(buildEmployeeReceiptRanking(operators, history.receipt).ranking, [
        { operator: "MARIANE RAMOS DE OLIVEIRA", opsCode: "ops123", displayName: "Mariane Ramos", quantity: 3898 },
    ]);
    assert.deepEqual(buildEmployeeLabelingErrorRanking(operators, history.labelingErrors).ranking, [
        { operator: "Pedro da Costa Santos", opsCode: "ops124", displayName: "Pedro Costa", quantity: 15 },
    ]);
    const { ranking } = buildEmployeeExpeditionRanking([
        { operator: "[ops125] Elizangela Aparecida do Brasil", routesChecked: 1 },
    ], history.expedition);
    assert.deepEqual(ranking, [{
        operator: "Elizangela Aparecida do Brasil", opsCode: "ops125", displayName: "Elizangela Aparecida", quantity: 4,
    }]);
});

test("preserva homônimos e deixa linhas abreviadas ambíguas fora da soma", () => {
    const current = [{ receiver: "[ops30] Karina Santos de Lima", packagesReceived: 100 }];
    const historical = [
        { operator: "Karina Santos", quantity: 40 },
        { operator: "Karina Santos", quantity: 30 },
    ];
    assert.deepEqual(buildEmployeeReceiptRanking(current, historical), {
        ranking: [{ operator: "Karina Santos de Lima", opsCode: "ops30", displayName: "Karina Santos", quantity: 100 }],
        pending: historical,
    });

    const homonyms = [...current, { receiver: "[ops31] Karina Santos da Costa", packagesReceived: 10 }];
    assert.deepEqual(buildEmployeeReceiptRanking(homonyms, [historical[0]]).pending, [historical[0]]);
    const { ranking, pending } = buildEmployeeReceiptRanking(homonyms, [
        { operator: "Karina Santos de Lima", quantity: 40, fullNameConfirmed: true },
        { operator: "Karina Santos da Costa", quantity: 30, fullNameConfirmed: true },
        { operator: "Karina Santos", quantity: 4, fullNameConfirmed: true },
    ]);
    assert.deepEqual(ranking.map(entry => [entry.opsCode, entry.quantity]), [
        ["ops30", 140],
        ["ops31", 40],
    ]);
    assert.deepEqual(pending, [{ operator: "Karina Santos", quantity: 4 }]);
});

test("mantém um colaborador do histórico pendente até identificar seu OPS", () => {
    const historical = [{ operator: "João Souza", quantity: 20 }];
    assert.deepEqual(buildEmployeeReceiptRanking([], historical), { ranking: [], pending: historical });
    const uncoded = buildEmployeeReceiptRanking([
        { receiver: "João de Souza Assis", packagesReceived: 15 },
    ], historical);
    assert.deepEqual(uncoded, {
        ranking: [],
        pending: [{ operator: "João de Souza Assis", quantity: 15 }, ...historical],
    });
    assert.deepEqual(buildEmployeeReceiptRanking([
        { receiver: "[ops32] João de Souza Assis", packagesReceived: 15 },
    ], historical).ranking, [
        { operator: "João de Souza Assis", opsCode: "ops32", displayName: "João Souza", quantity: 35 },
    ]);
});

test("OPS iguais acumulam mesmo com grafias diferentes e OPS diferentes mantêm homônimos separados", () => {
    const current = [
        { operator: "[OPS114012] Cayo Bispo", routesChecked: 3, totalDurationSeconds: 600, routesWithDuration: 3 },
        { operator: "[ops105] Cayo Bispo", routesChecked: 1, totalDurationSeconds: 240, routesWithDuration: 1 },
    ];
    const history = [{ operator: "Cayo", opsCode: "ops114012", routesChecked: 1, totalDurationSeconds: 240, routesWithDuration: 1 }];
    assert.deepEqual(buildEmployeeExpeditionRanking(current, history).ranking.map(entry =>
        [entry.opsCode, entry.displayName, entry.quantity]), [
        ["ops114012", "Cayo Bispo", 4],
        ["ops105", "Cayo Bispo", 1],
    ]);

    const receipt = current.map(({ operator }) => ({ receiver: operator, packagesReceived: 10 }));
    assert.deepEqual(buildEmployeeReceiptRanking(receipt, [{ operator: "Cayo", opsCode: "ops114012", quantity: 5 }])
        .ranking.map(entry => [entry.opsCode, entry.quantity]), [["ops114012", 15], ["ops105", 10]]);
});

test("usa a lista de OPS para identificar um nome abreviado e sinaliza quando a lista contém homônimos", () => {
    const current = [{ receiver: "[ops114012] Cayo Bispo Silva", packagesReceived: 10 }];
    const history = [{ operator: "Cayo Bispo", quantity: 5 }];
    const person = { opsCode: "ops114012", operator: "Cayo Bispo Oliveira" };
    const other = { opsCode: "ops105", operator: "Cayo Bispo Santos" };
    assert.deepEqual(buildEmployeeReceiptRanking(current, history, [person]).ranking.map(entry => [entry.opsCode, entry.quantity]),
        [["ops114012", 15]]);
    const { ranking, pending } = buildEmployeeReceiptRanking(current, history, [person, other]);
    assert.deepEqual(ranking.map(entry => [entry.opsCode, entry.quantity]), [["ops114012", 10]]);
    assert.deepEqual(pending, history);
});

test("atribui o OPS do etiquetador pelo nome completo cadastrado", () => {
    const operators = [{ receiver: "[ops111] Ana Rocha Silva", labeler: "Pedro da Costa Santos", errorQuantity: 5 }];
    const directory = [{ opsCode: "ops222", operator: "Pedro da Costa Santos" }];
    assert.deepEqual(buildEmployeeLabelingErrorRanking(operators, [
        { operator: "Pedro Costa", opsCode: "ops222", quantity: 10 },
    ], directory).ranking.map(entry => [entry.opsCode, entry.quantity]), [["ops222", 15]]);
});

test("deixa rotas de nomes completos iguais pendentes até identificar o OPS de cada registro", () => {
    const current = [{ operator: "Cayo Bispo Silva", routesChecked: 3 }];
    const historical = [{ operator: "Cayo Bispo Silva", routesChecked: 7, fullNameConfirmed: true }];
    const pending = [{ operator: "Cayo Bispo Silva", quantity: 3 }, { operator: "Cayo Bispo Silva", quantity: 7 }];
    assert.deepEqual(buildEmployeeExpeditionRanking(current, historical), { ranking: [], pending });

    const person = { operator: "Cayo Bispo Silva", opsCode: "ops114012" };
    assert.deepEqual(buildEmployeeExpeditionRanking(current, historical, [person]), {
        ranking: [{ ...person, displayName: "Cayo Bispo", quantity: 10 }],
        pending: [],
    });
    assert.deepEqual(buildEmployeeExpeditionRanking(current, historical, [person, { ...person, opsCode: "ops105" }]),
        { ranking: [], pending });
});
