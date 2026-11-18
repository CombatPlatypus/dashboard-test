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
        opsCode: "OPS123",
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

test("Recebimento exige OPS em cada registro mesmo com um nome já identificado", () => {
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
        ranking: [{ operator: "MARIA DA SILVA NUNES", opsCode: "ops123", displayName: "Maria Silva", quantity: 1000 }],
        pending: [
            { operator: "Maria da Silva Reis", quantity: 200 },
            { operator: "Maria da Silva Nunes", quantity: 800 },
            { operator: "José de Oliveira Santos", quantity: 300 },
        ],
    });
});

test("Erros de Etiquetagem usam o OPS do etiquetador ou o OPS do recebedor", () => {
    const current = [
        { receiver: "[ops18] Recebedor Andrade", labeler: " Pedro da Costa Santos ", errorQuantity: 3, selected: false },
        { receiver: "[ops19] Recebedor Bastos", labeler: "[ops123] PEDRO DA COSTA SANTOS", errorQuantity: 2 },
        { receiver: "[ops20] João de Souza Lima", labeler: " ", errorQuantity: 2 },
        { receiver: "[ops21] Zélia da Silva Alves", labeler: "—", errorQuantity: 0 },
        { receiver: "Ana da Rocha", labeler: "", errorQuantity: null },
        { receiver: "[ops22] Recebedor Costa", labeler: "[opsABC] Bruno Rodrigues Lima", errorQuantity: 4 },
        { receiver: "Recebedor Lima", labeler: "Bruno Rodrigues Lima", errorQuantity: 6 },
    ];
    const historical = [
        { operator: "Pedro da Costa Santos", opsCode: "ops123", quantity: 10 },
        { operator: "Ana Rosa Lima", opsCode: "ops23", quantity: 2 },
    ];

    assert.deepEqual(buildEmployeeLabelingErrorRanking(current, historical), {
        ranking: [
            { operator: "Zélia da Silva Alves", opsCode: "ops21", displayName: "Zélia Silva", quantity: 0 },
            { operator: "Ana Rosa Lima", opsCode: "ops23", displayName: "Ana Rosa", quantity: 2 },
            { operator: "João de Souza Lima", opsCode: "ops20", displayName: "João Souza", quantity: 2 },
            { operator: "Recebedor Andrade", opsCode: "ops18", displayName: "Recebedor Andrade", quantity: 3 },
            { operator: "Recebedor Costa", opsCode: "ops22", displayName: "Recebedor Costa", quantity: 4 },
            { operator: "PEDRO DA COSTA SANTOS", opsCode: "ops123", displayName: "Pedro Costa", quantity: 12 },
        ],
        pending: [{ operator: "Recebedor Lima", quantity: 6 }],
    });
});

test("cruza o OPS nas fórmulas da planilha com o dos relatórios nos três blocos acumuláveis", () => {
    const text = [
        "\tMesa de Recebimento\t\t\tErros de Etiquetagem\t\t\tRotas Conferidas",
        "\tColaborador\tQuantidade\t\tColaborador\tQuantidade\t\tColaborador\tQuantidade",
        '\t="Mariane Ramos"&T(N("Nome e id do conferente: [ops123] Mariane Ramos"))\t1.949\t' +
            '\t="Pedro Costa"&T(N("Nome e id do conferente: [ops124] Pedro da Costa"))\t10\t' +
            '\t="Elizangela Aparecida"&T(N("Nome e id do conferente: [OPS125] Elizangela Aparecida"))\t3',
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

test("preserva homônimos por OPS e deixa linhas abreviadas sem código pendentes", () => {
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
        { operator: "Karina Santos de Lima", opsCode: "ops30", quantity: 40 },
        { operator: "Karina Santos da Costa", opsCode: "ops31", quantity: 30 },
        { operator: "Karina Santos", quantity: 4 },
    ]);
    assert.deepEqual(ranking.map(entry => [entry.opsCode, entry.quantity]), [
        ["ops30", 140],
        ["ops31", 40],
    ]);
    assert.deepEqual(pending, [{ operator: "Karina Santos", quantity: 4 }]);
});

test("mantém o histórico sem OPS pendente mesmo quando o colaborador aparece no relatório", () => {
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
    ], historical), {
        ranking: [{ operator: "João de Souza Assis", opsCode: "ops32", displayName: "João Souza", quantity: 15 }],
        pending: historical,
    });
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

test("atribui os erros ao etiquetador identificado mesmo com apenas o código no campo", () => {
    const operators = [{ receiver: "[ops111] Ana Rocha Silva", labeler: "[OPS222]", errorQuantity: 5 }];
    const { ranking, pending } = buildEmployeeLabelingErrorRanking(operators, []);
    assert.deepEqual(ranking.map(entry => [entry.opsCode, entry.quantity]), [["ops222", 5]]);
    assert.deepEqual(pending, []);
});

test("separa rotas pendentes da soma mesmo com nomes completos iguais", () => {
    const current = [{ operator: "[ops114012] Cayo Bispo Silva", routesChecked: 3 }];
    const historical = [{ operator: "Cayo Bispo Silva", routesChecked: 7 }];
    assert.deepEqual(buildEmployeeExpeditionRanking(current, historical), {
        ranking: [{ operator: "Cayo Bispo Silva", opsCode: "ops114012", displayName: "Cayo Bispo", quantity: 3 }],
        pending: [{ operator: "Cayo Bispo Silva", quantity: 7 }],
    });
});
