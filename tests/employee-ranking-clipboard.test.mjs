import assert from "node:assert/strict";
import test from "node:test";
import {
    createEmployeeRankingClipboard,
    parseEmployeeRankingClipboard,
    readEmployeeRankingClipboard,
} from "../js/reports/employee-ranking/clipboard.js";
import {
    buildEmployeeExpeditionRanking,
    buildEmployeeOccurrenceRanking,
    buildEmployeeReceiptRanking,
} from "../js/reports/employee-ranking/model.js";

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
            { operator: "Maria da Silva Costa", opsCode: "ops123", routesChecked: 12 },
            { operator: "João de Souza", routesChecked: 1234 },
        ],
    });
});

test("copies the formatted ranking from B2 and keeps short names in the visible table", () => {
    const operators = [
        { operator: "[ops123] Maria da Silva Costa", routesChecked: 12, totalDurationSeconds: 3948, routesWithDuration: 12 },
        { operator: "[ops124] Maria da Silva Souza", routesChecked: 4, totalDurationSeconds: 1200, routesWithDuration: 4 },
    ];
    const { ranking } = buildEmployeeExpeditionRanking(operators);
    const receivedDamageRanking = buildEmployeeOccurrenceRanking([
        { operator: "João de Souza Lima", quantity: 4 },
        { operator: "Maria da Silva Costa", quantity: 1 },
    ]);
    const offPackagesRanking = buildEmployeeOccurrenceRanking([
        { operator: "Maria da Silva Souza", quantity: 5 },
        { operator: "Ana da Rocha Costa", quantity: 1 },
    ]);
    const receiptRanking = [{ operator: "Ana da Rocha Costa", opsCode: "ops25", displayName: "Ana Rocha", quantity: 1234 }];
    const labelingErrorsRanking = [{ operator: "Pedro da Costa Santos", opsCode: "ops90", displayName: "Pedro Costa", quantity: 0 }];
    const { text, html } = createEmployeeRankingClipboard({
        receiptRanking, labelingErrorsRanking, receivedDamageRanking, expeditionRanking: ranking, offPackagesRanking,
    }, 153);
    const rows = text.split("\n").map(row => row.split("\t"));

    assert.equal(rows.length, 158);
    assert.ok(rows.every(row => row.length === 17));
    assert.equal(rows[0][0], "RANKING MENSAL DE DESEMPENHO");
    assert.deepEqual([0, 3, 6, 9, 12].map(column => rows[3][column]), [
        "Recebimento", "Erros de Etiquetagem", "Avarias Recebidas", "Rotas Conferidas", "Pacotes OFF",
    ]);
    assert.deepEqual(rows[5].slice(0, 5), ["Ana Rocha", "1234", "", "Pedro Costa", "0"]);
    assert.deepEqual(rows[6].slice(0, 5), ["", "", "", "", ""]);
    assert.deepEqual(rows[4].slice(6, 8), ["Colaborador", "Quantidade"]);
    assert.deepEqual(rows[5].slice(6, 8), ["Maria Silva", "1"]);
    assert.deepEqual(rows[6].slice(6, 8), ["João Souza", "4"]);
    assert.deepEqual(rows[4].slice(9, 12), ["Colaborador", "Quantidade", ""]);
    assert.deepEqual(rows[5].slice(9, 12), ["Maria Silva", "12", ""]);
    assert.deepEqual(rows[6].slice(9, 12), ["Maria Silva", "4", ""]);
    assert.deepEqual(rows[4].slice(12, 14), ["Colaborador", "Quantidade"]);
    assert.deepEqual(rows[5].slice(12, 14), ["Ana Rocha", "1"]);
    assert.deepEqual(rows[6].slice(12, 14), ["Maria Silva", "5"]);
    assert.deepEqual(rows[3].slice(14), ["", "Base de Colaboradores", ""]);
    assert.deepEqual(rows[4].slice(14), ["", "Código Ops", "Nome do Colaborador"]);
    assert.deepEqual(rows[5].slice(14), ["", "ops25", "Ana da Rocha Costa"]);
    assert.deepEqual(rows[6].slice(14), ["", "ops123", "Maria da Silva Costa"]);
    assert.ok(rows.at(-1).every(cell => cell === ""));

    assert.match(html, /<google-sheets-html-origin>/);
    assert.match(html, /<td rowspan="2" colspan="17"[^>]*>RANKING MENSAL DE DESEMPENHO<\/td>/);
    const separators = [...html.matchAll(/<td rowspan="155" colspan="1" style="([^"]+)"><\/td>/g)];
    assert.equal(separators.length, 5);
    for (const [, style] of separators) {
        assert.match(style, /;border-top:1px solid #101010;border-right:none;border-bottom:1px solid #101010;border-left:none$/);
    }
    assert.deepEqual([...html.matchAll(/<col width="(\d+)"/g)].map(([, width]) => Number(width)),
        [181, 121, 21, 181, 121, 21, 181, 141, 21, 181, 121, 21, 201, 121, 21, 121, 301]);
    assert.doesNotMatch(html, /Tempo/);
    assert.doesNotMatch(text, /Nome e id do conferente/);
    assert.match(html, /data-sheets-formula="=&quot;Maria Silva&quot;&amp;T\(N\(&quot;Nome e id do conferente: \[ops123\] Maria da Silva Costa&quot;\)\)">Maria Silva/);
    assert.match(html, /data-sheets-formula="=&quot;Maria Silva&quot;&amp;T\(N\(&quot;Nome e id do conferente: \[ops124\] Maria da Silva Souza&quot;\)\)">Maria Silva/);
    assert.match(html, /data-sheets-formula="=&quot;João Souza&quot;&amp;T\(N\(&quot;Nome e id do conferente: João de Souza Lima&quot;\)\)">João Souza/);
    assert.match(html, /data-sheets-formula="=&quot;Pedro Costa&quot;&amp;T\(N\(&quot;Nome e id do conferente: \[ops90\] Pedro da Costa Santos&quot;\)\)">Pedro Costa/);
    assert.doesNotMatch(html, /data-sheets-userformat/);
    const cellStyles = new Map(Array.from(html.matchAll(/<td\b[^>]*style="([^"]+)"[^>]*>([^<]*)<\/td>/g),
        ([, style, text]) => [text, style]));
    const mergedTitles = [...html.matchAll(/<td rowspan="1" colspan="2"[^>]*>([^<]+)<\/td>/g)].map(([, title]) => title);
    assert.deepEqual(mergedTitles, [
        "Recebimento", "Erros de Etiquetagem", "Avarias Recebidas", "Rotas Conferidas", "Pacotes OFF", "Base de Colaboradores",
    ]);
    for (const title of ["RANKING MENSAL DE DESEMPENHO", ...mergedTitles]) {
        assert.match(cellStyles.get(title), /;border-top:1px solid #626262;border-right:1px solid #626262;border-bottom:1px solid #626262;border-left:1px solid #626262$/);
    }
    for (const cell of ["Colaborador", "Quantidade", "Código Ops", "Nome do Colaborador", "Maria Silva", "12", "ops25"]) {
        assert.match(cellStyles.get(cell), /;border:1px solid #626262$/);
    }
    for (const [text, fontSize] of [
        ["RANKING MENSAL DE DESEMPENHO", 20],
        ["Avarias Recebidas", 12],
        ["Rotas Conferidas", 12],
        ["Pacotes OFF", 12],
        ["Código Ops", 11],
        ["Nome do Colaborador", 11],
        ["Colaborador", 11],
        ["Maria Silva", 10],
        ["Ana Rocha", 10],
        ["Pedro Costa", 10],
        ["João Souza", 10],
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
        { operator: "Maria da Silva Costa", fullNameConfirmed: true, routesChecked: 12 },
        { operator: "Maria da Silva Souza", fullNameConfirmed: true, routesChecked: 4 },
    ]);

    legacyWorksheet[2][7] = "";
    assert.throws(() => parseEmployeeRankingClipboard(clipboard()), /coluna R/);
});

test("rejects invalid historical rows instead of adding partial totals", () => {
    assert.throws(() => parseEmployeeRankingClipboard({ text: "Ana Santos\t4\t00:05:29\nJoão Souza\t-6\t05:80" }), /linha 2/);
    assert.throws(() => parseEmployeeRankingClipboard({ text: "Nome\tTurno\tLocal\tObservação" }), /Copie a aba Ranking de Colaboradores/);
    assert.throws(() => parseEmployeeRankingClipboard({
        text: "Recebimento\t\t\tErros de Etiquetagem\t\nColaborador\tQuantidade\t\tColaborador\tQuantidade\nAna Santos\t100\t\tPedro Costa\t-1",
    }), /Erros de Etiquetagem na linha 3/);
});

test("imports the quantity from an isolated expedition block and ignores legacy time", () => {
    for (const text of [
        "Colaborador\tQuantidade\n[ops123] Ana Santos\t4",
        "Colaborador\tQuantidade\tTempo\n[ops123] Ana Santos\t4\t05:80",
    ]) {
        assert.deepEqual(parseEmployeeRankingClipboard({ text }).expedition,
            [{ operator: "Ana Santos", opsCode: "ops123", routesChecked: 4 }]);
    }
});

test("inclui todos os recebedores na cópia e mantém os blocos vazios com seus cabeçalhos", () => {
    const receiptRanking = Array.from({ length: 151 }, (_, index) =>
        ({ operator: "Ana da Rocha Costa", opsCode: `ops${index + 1}`, displayName: "Ana Rocha", quantity: 12 }));
    const { text } = createEmployeeRankingClipboard({ receiptRanking });
    const rows = text.split("\n");
    assert.equal(rows.length, 156);
    assert.equal(rows.at(-1).split("\t")[1], "12");
    assert.deepEqual(parseEmployeeRankingClipboard({ text }).labelingErrors, []);
});

test("preserva o nome da fórmula mesmo quando o conteúdo vem sem o sinal de igual", () => {
    const text = [
        "Recebimento\t",
        "Colaborador\tQuantidade",
        '"Maria Silva"&T(N("Nome completo do conferente: Maria Silva"))\t25',
    ].join("\n");
    assert.deepEqual(parseEmployeeRankingClipboard({ text }).receipt, [
        { operator: "Maria Silva", fullNameConfirmed: true, quantity: 25 },
    ]);
});

test("lê o OPS da fórmula do novo modelo e mantém a lista Q:R disponível na cópia em texto", () => {
    const receiptRanking = [
        { operator: "Cayo", opsCode: "ops114012", displayName: "Cayo", quantity: 1949 },
        { operator: "Mariane Ramos de Oliveira", opsCode: "ops567", displayName: "Mariane Ramos", quantity: 50 },
    ];
    const expeditionRanking = [{
        ...receiptRanking[0], operator: "Cayo Bispo", quantity: 1,
    }];
    const { text, html } = createEmployeeRankingClipboard({
        receiptRanking, expeditionRanking,
        operatorDirectory: [
            { opsCode: "OPS114012", operator: "Cayo Bispo" },
            { opsCode: "ops202", operator: "Pedro da Silva" },
        ],
    });
    const cells = text.split("\n").map(row => row.split("\t"));
    assert.match(html, /data-sheets-formula="=&quot;Cayo&quot;&amp;T\(N\(&quot;Nome e id do conferente: \[ops114012\] Cayo&quot;\)\)">Cayo/);
    assert.deepEqual(parseEmployeeRankingClipboard({ text }).operatorDirectory, [
        { opsCode: "ops114012", operator: "Cayo" },
        { opsCode: "ops567", operator: "Mariane Ramos de Oliveira" },
        { opsCode: "ops202", operator: "Pedro da Silva" },
    ]);
    assert.deepEqual(parseEmployeeRankingClipboard({ text }).expedition, [{ operator: "Cayo", routesChecked: 1 }]);
    cells[5][0] = '="Cayo"&T(N("Nome e id do conferente: [OPS114012] Cayo"))';
    assert.deepEqual(parseEmployeeRankingClipboard({ text: cells.map(row => row.join("\t")).join("\n") }).receipt[0], {
        operator: "Cayo", opsCode: "ops114012", fullNameConfirmed: true, quantity: 1949,
    });
});

test("confere as duas colunas da lista de OPS antes de somar", () => {
    assert.throws(() => parseEmployeeRankingClipboard({
        text: "Código Ops\tNome do Colaborador\nOPS123\t",
    }), /Código Ops e Nome do Colaborador/);
});

test("tenta a leitura padrão e recupera o HTML quando o navegador rejeita a opção sem sanitização", async () => {
    const clipboardItem = (type, value) => ({ types: [type], getType: async () => new Blob([value], { type }) });
    const clipboard = {
        async read(options) {
            if (options) throw new TypeError("Opção sem suporte");
            return [clipboardItem("text/plain", "Maria Silva\t25"), clipboardItem("text/html", "<table></table>")];
        },
        readText() { assert.fail("A leitura com formatos já retornou os dados"); },
    };
    assert.deepEqual(await readEmployeeRankingClipboard(clipboard), { text: "Maria Silva\t25", html: "<table></table>" });
});

test("exporta apenas os totais de recebimento com OPS identificado", () => {
    const history = [{ operator: "Maria Silva", quantity: 25 }, { operator: "Ana Santos", opsCode: "ops5", quantity: 60 }];
    const { ranking, pending } = buildEmployeeReceiptRanking([], history);
    assert.deepEqual(pending, [history[0]]);
    const { text, html } = createEmployeeRankingClipboard({ receiptRanking: ranking });
    assert.doesNotMatch(html, /Maria Silva/);
    assert.match(html, /Nome e id do conferente: \[ops5\] Ana Santos/);
    assert.deepEqual(parseEmployeeRankingClipboard({ text }).receipt, [{ operator: "Ana Santos", quantity: 60 }]);
});
