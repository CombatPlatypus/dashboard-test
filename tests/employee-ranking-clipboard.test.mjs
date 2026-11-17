import assert from "node:assert/strict";
import test from "node:test";
import {
    createEmployeeRankingClipboard,
    parseEmployeeRankingClipboard,
} from "../js/reports/employee-ranking/clipboard.js";
import { buildEmployeeExpeditionRanking, buildEmployeeOccurrenceRanking } from "../js/reports/employee-ranking/model.js";

test("imports the three accumulated blocks from the complete ranking worksheet", () => {
    const worksheet = [
        "\tRANKING MENSAL DE DESEMPENHO",
        "\tRecebimento de Pacotes\t\t\tErros de Etiquetagem\t\t\tAvarias Recebidas\t\t\tRotas Conferidas e Tempo Médio\t\t\t\tPacotes OFF",
        "\tColaborador\tTotal Recebido\t\tColaborador\tQuantidade\t\tColaborador\tQuantidade\t\tColaborador\tQuantidade\tTempo\t\tColaborador\tQuantidade",
        "\tAna Santos\t100\t\tAna Santos\t2\t\tAna Santos\t1\t\t[ops123] Maria da Silva Costa\t12\t05:29\t\tAna Santos\t3",
        "\tAna Santos\t80\t\t\t\t\t\t\t\t—\t—\t—\t\t\t",
        "\t\t\t\t\t\t\t\t\t\tJoão de Souza\t1.234\t\t\t\t",
    ].join("\r\n");

    assert.deepEqual(parseEmployeeRankingClipboard({ text: worksheet }), {
        receipt: [{ operator: "Ana Santos", quantity: 100 }, { operator: "Ana Santos", quantity: 80 }],
        labelingErrors: [{ operator: "Ana Santos", quantity: 2 }],
        expedition: [
            { operator: "Maria da Silva Costa", routesChecked: 12, totalDurationSeconds: 3948, routesWithDuration: 12 },
            { operator: "João de Souza", routesChecked: 1234, totalDurationSeconds: 0, routesWithDuration: 0 },
        ],
    });
});

test("copies the formatted ranking from B2 and keeps short names in the visible table", () => {
    const operators = [
        { operator: "Maria da Silva Costa", routesChecked: 12, totalDurationSeconds: 3948, routesWithDuration: 12 },
        { operator: "Maria da Silva Souza", routesChecked: 4, totalDurationSeconds: 1200, routesWithDuration: 4 },
    ];
    const ranking = buildEmployeeExpeditionRanking(operators);
    const receivedDamageRanking = buildEmployeeOccurrenceRanking([
        { operator: "João de Souza Lima", quantity: 4 },
        { operator: "Maria da Silva Costa", quantity: 1 },
    ]);
    const offPackagesRanking = buildEmployeeOccurrenceRanking([
        { operator: "Maria da Silva Souza", quantity: 5 },
        { operator: "Ana da Rocha Costa", quantity: 1 },
    ]);
    const receiptRanking = [{ operator: "Ana da Rocha Costa", displayName: "Ana Rocha", quantity: 1234 }];
    const labelingErrorsRanking = [{ operator: "Pedro da Costa Santos", displayName: "Pedro Costa", quantity: 0 }];
    const { text, html } = createEmployeeRankingClipboard({
        receiptRanking, labelingErrorsRanking, receivedDamageRanking, expeditionRanking: ranking, offPackagesRanking,
    }, 153);
    const rows = text.split("\n").map(row => row.split("\t"));

    assert.equal(rows.length, 158);
    assert.ok(rows.every(row => row.length === 15));
    assert.equal(rows[0][0], "RANKING MENSAL DE DESEMPENHO");
    assert.deepEqual([0, 3, 6, 9, 13].map(column => rows[3][column]), [
        "Recebimento", "Erros de Etiquetagem", "Avarias Recebidas", "Rotas Conferidas e Tempo Médio", "Pacotes OFF",
    ]);
    assert.deepEqual(rows[5].slice(0, 5), ["Ana Rocha", "1234", "", "Pedro Costa", "0"]);
    assert.deepEqual(rows[6].slice(0, 5), ["", "", "", "", ""]);
    assert.deepEqual(rows[4].slice(6, 8), ["Colaborador", "Quantidade"]);
    assert.deepEqual(rows[5].slice(6, 8), ["Maria Silva", "1"]);
    assert.deepEqual(rows[6].slice(6, 8), ["João Souza", "4"]);
    assert.deepEqual(rows[4].slice(9, 12), ["Colaborador", "Quantidade", "Tempo"]);
    assert.deepEqual(rows[5].slice(9, 12), ["Maria Silva", "12", "00:05:29"]);
    assert.deepEqual(rows[6].slice(9, 12), ["Maria Silva", "4", "00:05:00"]);
    assert.deepEqual(rows[4].slice(13), ["Colaborador", "Quantidade"]);
    assert.deepEqual(rows[5].slice(13), ["Ana Rocha", "1"]);
    assert.deepEqual(rows[6].slice(13), ["Maria Silva", "5"]);
    assert.ok(rows.at(-1).every(cell => cell === ""));

    assert.match(html, /<google-sheets-html-origin>/);
    assert.match(html, /<td rowspan="2" colspan="15"[^>]*>RANKING MENSAL DE DESEMPENHO<\/td>/);
    assert.match(html, /<td rowspan="155" colspan="1"/);
    assert.equal([...html.matchAll(/<col width="/g)].length, 15);
    assert.doesNotMatch(text, /Nome completo do conferente/);
    assert.match(html, /data-sheets-formula="=&quot;Maria Silva&quot;&amp;T\(N\(&quot;Nome completo do conferente: Maria da Silva Costa&quot;\)\)">Maria Silva/);
    assert.match(html, /data-sheets-formula="=&quot;Maria Silva&quot;&amp;T\(N\(&quot;Nome completo do conferente: Maria da Silva Souza&quot;\)\)">Maria Silva/);
    assert.match(html, /data-sheets-formula="=&quot;João Souza&quot;&amp;T\(N\(&quot;Nome completo do conferente: João de Souza Lima&quot;\)\)">João Souza/);
    assert.match(html, /data-sheets-formula="=&quot;Pedro Costa&quot;&amp;T\(N\(&quot;Nome completo do conferente: Pedro da Costa Santos&quot;\)\)">Pedro Costa/);
    assert.doesNotMatch(html, /data-sheets-userformat/);
    const cellStyles = new Map(Array.from(html.matchAll(/<td\b[^>]*style="([^"]+)"[^>]*>([^<]*)<\/td>/g),
        ([, style, text]) => [text, style]));
    for (const [text, fontSize] of [
        ["RANKING MENSAL DE DESEMPENHO", 20],
        ["Rotas Conferidas e Tempo Médio", 12],
        ["Colaborador", 11],
        ["Maria Silva", 10],
        ["Ana Rocha", 10],
        ["Pedro Costa", 10],
        ["João Souza", 10],
        ["00:05:29", 10],
    ]) {
        assert.match(cellStyles.get(text), new RegExp(`font-size:${fontSize}pt;`));
        assert.match(cellStyles.get(text), /text-align:center;vertical-align:middle;/);
    }
});

test("still imports full names from the auxiliary column in previously copied worksheets", () => {
    const legacyWorksheet = [
        ["Rotas Conferidas e Tempo Médio", "", "", "", "Pacotes OFF", "", "", ""],
        ["Colaborador", "Quantidade", "Tempo", "", "Colaborador", "Quantidade", "", "Nome completo do conferente"],
        ["Maria Silva", "12", "00:05:29", "", "", "", "", "Maria da Silva Costa"],
        ["Maria Silva", "4", "00:05:00", "", "", "", "", "Maria da Silva Souza"],
    ];
    const clipboard = () => ({ text: legacyWorksheet.map(row => row.join("\t")).join("\n") });
    assert.deepEqual(parseEmployeeRankingClipboard(clipboard()).expedition, [
        { operator: "Maria da Silva Costa", routesChecked: 12, totalDurationSeconds: 3948, routesWithDuration: 12 },
        { operator: "Maria da Silva Souza", routesChecked: 4, totalDurationSeconds: 1200, routesWithDuration: 4 },
    ]);

    legacyWorksheet[2][7] = "";
    assert.throws(() => parseEmployeeRankingClipboard(clipboard()), /coluna R/);
});

test("rejects invalid historical rows instead of adding partial totals", () => {
    assert.throws(() => parseEmployeeRankingClipboard({ text: "Ana Santos\t4\t00:05:29\nJoão Souza\t6\t05:80" }), /linha 2/);
    assert.throws(() => parseEmployeeRankingClipboard({ text: "Nome\tTurno\tLocal\tObservação" }), /Copie a aba Ranking de Colaboradores/);
    assert.throws(() => parseEmployeeRankingClipboard({
        text: "Recebimento\t\t\tErros de Etiquetagem\t\nColaborador\tQuantidade\t\tColaborador\tQuantidade\nAna Santos\t100\t\tPedro Costa\t-1",
    }), /Erros de Etiquetagem na linha 3/);
});

test("inclui todos os recebedores na cópia e mantém os blocos vazios com seus cabeçalhos", () => {
    const receiptRanking = Array.from({ length: 151 }, () =>
        ({ operator: "Ana da Rocha Costa", displayName: "Ana Rocha", quantity: 12 }));
    const { text } = createEmployeeRankingClipboard({ receiptRanking });
    const rows = text.split("\n");
    assert.equal(rows.length, 156);
    assert.equal(rows.at(-1).split("\t")[1], "12");
    assert.deepEqual(parseEmployeeRankingClipboard({ text }).labelingErrors, []);
});
