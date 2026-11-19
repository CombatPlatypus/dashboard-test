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

test("copia o ranking a partir de C2:S3 com ID OPS nos três acumulados", () => {
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
        { operator: "Maria da Silva Souza", quantity: 1 },
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
    assert.deepEqual([0, 4, 8, 12, 15].map(column => rows[3][column]), [
        "Mesa de Recebimento", "Erros de Etiquetagem", "Rotas Conferidas", "Avarias Recebidas", "Pacotes OFF",
    ]);
    assert.deepEqual(rows[5], [
        "ops25", "1º Ana Rocha", "1234", "", "ops90", "1º Pedro Costa", "0", "", "ops123", "1º Maria Silva", "12", "",
        "1º Maria Silva", "1", "", "1º Ana Rocha", "1",
    ]);
    assert.deepEqual(rows[6], [
        "", "", "", "", "", "", "", "", "ops124", "2º Maria Silva", "4", "",
        "2º João Souza", "4", "", "2º Maria Silva", "1",
    ]);
    for (const column of [0, 4, 8]) {
        assert.deepEqual(rows[4].slice(column, column + 3), ["ID OPS", "Colaborador", "Quantidade"]);
    }
    assert.deepEqual(rows[4].slice(12), ["Colaborador", "Quantidade", "", "Colaborador", "Quantidade"]);
    assert.ok(rows.at(-1).every(cell => cell === ""));

    assert.match(html, /<google-sheets-html-origin>/);
    assert.match(html, /<tbody><tr[^>]*><td rowspan="2" colspan="17"[^>]*>RANKING MENSAL DE DESEMPENHO<\/td><\/tr>/);
    const separators = [...html.matchAll(/<td rowspan="155" colspan="1" style="([^"]+)"><\/td>/g)];
    assert.equal(separators.length, 4);
    for (const [, style] of separators) {
        assert.match(style, /;border-top:1px solid #101010;border-right:none;border-bottom:1px solid #101010;border-left:none$/);
    }
    assert.deepEqual([...html.matchAll(/<col width="(\d+)"/g)].map(([, width]) => Number(width)),
        [101, 181, 121, 21, 101, 181, 121, 21, 101, 181, 121, 21, 181, 121, 21, 201, 121]);
    assert.doesNotMatch(html, /\bTempo\b|Base de Colaboradores|data-sheets-formula/);
    assert.match(html, /data-sheets-value="\{&quot;1&quot;:2,&quot;2&quot;:&quot;ops123&quot;\}">ops123<\/td>/);
    assert.doesNotMatch(html, /data-sheets-userformat/);
    const cellStyles = new Map(Array.from(html.matchAll(/<td\b[^>]*style="([^"]+)"[^>]*>([^<]*)<\/td>/g),
        ([, style, text]) => [text, style]));
    const mergedTitles = [...html.matchAll(/<td rowspan="1" colspan="([23])"[^>]*>([^<]+)<\/td>/g)]
        .map(([, span, title]) => [title, Number(span)]);
    assert.deepEqual(mergedTitles, [
        ["Mesa de Recebimento", 3], ["Erros de Etiquetagem", 3], ["Rotas Conferidas", 3],
        ["Avarias Recebidas", 2], ["Pacotes OFF", 2],
    ]);
    for (const title of ["RANKING MENSAL DE DESEMPENHO", ...mergedTitles.map(([title]) => title)]) {
        assert.match(cellStyles.get(title), /;border-top:1px solid #626262;border-right:1px solid #626262;border-bottom:1px solid #626262;border-left:1px solid #626262$/);
    }
    for (const cell of ["ID OPS", "Colaborador", "Quantidade", "ops123", "1º Maria Silva", "12"]) {
        assert.match(cellStyles.get(cell), /;border:1px solid #626262$/);
    }
    for (const [text, fontSize] of [
        ["RANKING MENSAL DE DESEMPENHO", 20],
        ["Avarias Recebidas", 12],
        ["Rotas Conferidas", 12],
        ["Pacotes OFF", 12],
        ["ID OPS", 11],
        ["Colaborador", 11],
        ["1º Maria Silva", 10],
        ["1º Ana Rocha", 10],
        ["1º Pedro Costa", 10],
        ["2º João Souza", 10],
    ]) {
        assert.match(cellStyles.get(text), new RegExp(`font-size:${fontSize}pt;`));
        assert.match(cellStyles.get(text), /text-align:center;vertical-align:middle;/);
    }
});

test("lê a identidade da célula de colaborador e ignora a coluna auxiliar antiga", () => {
    const legacyWorksheet = [
        ["Rotas Conferidas e Tempo Médio", "", "", "", "Pacotes OFF", "", "", ""],
        ["Colaborador", "Quantidade", "Tempo", "", "Colaborador", "Quantidade", "", "Nome completo do conferente"],
        ['="Maria Silva"&T(N("Nome e id do conferente: [ops123] Maria da Silva Costa"))', "12", "00:05:29",
            "", "", "", "", "Nome de outra linha"],
        ["Maria Silva", "4", "00:05:00", "", "", "", "", "[ops124] Maria da Silva Souza"],
    ];
    const clipboard = () => ({ text: legacyWorksheet.map(row => row.join("\t")).join("\n") });
    assert.deepEqual(parseEmployeeRankingClipboard(clipboard()).expedition, [
        { operator: "Maria da Silva Costa", opsCode: "ops123", routesChecked: 12 },
        { operator: "Maria Silva", routesChecked: 4 },
    ]);
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
        "ID OPS\tColaborador\tQuantidade\n[OPS123]\tAna Santos\t4",
        "ID OPS\tColaborador\tQuantidade\n123\tAna Santos\t4",
        "ID OPS\tColaborador\tQuantidade\n123\t1º\u00a0Ana Santos\t4",
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
    assert.deepEqual(rows.at(-1).split("\t").slice(0, 3), ["ops151", "151º Ana Rocha", "12"]);
    assert.deepEqual(parseEmployeeRankingClipboard({ text }).labelingErrors, []);
});

test("preserva o nome da fórmula mesmo quando o conteúdo vem sem o sinal de igual", () => {
    const text = [
        "Recebimento\t",
        "Colaborador\tQuantidade",
        '"Maria Silva"&T(N("Nome completo do conferente: [ops123] Maria Silva"))\t25',
    ].join("\n");
    assert.deepEqual(parseEmployeeRankingClipboard({ text }).receipt, [
        { operator: "Maria Silva", opsCode: "ops123", quantity: 25 },
    ]);
});

test("reimporta os IDs dos três rankings operacionais a partir do texto copiado", () => {
    const { text } = createEmployeeRankingClipboard({
        receiptRanking: [
            { opsCode: "ops114012", displayName: "Maria Silva", quantity: 1949 },
            { opsCode: "ops567", displayName: "Maria Silva", quantity: 50 },
        ],
        labelingErrorsRanking: [{ opsCode: "ops71", displayName: "Ana Santos", quantity: 0 }],
        expeditionRanking: [{ opsCode: "ops114012", displayName: "Maria Silva", quantity: 1 }],
        offPackagesRanking: [{ displayName: "Ana Santos", quantity: 3 }],
    });
    const history = parseEmployeeRankingClipboard({ text });
    assert.deepEqual(history, {
        receipt: [
            { operator: "Maria Silva", opsCode: "ops114012", quantity: 1949 },
            { operator: "Maria Silva", opsCode: "ops567", quantity: 50 },
        ],
        labelingErrors: [{ operator: "Ana Santos", opsCode: "ops71", quantity: 0 }],
        expedition: [{ operator: "Maria Silva", opsCode: "ops114012", routesChecked: 1 }],
    });
    const current = [{ receiver: "[ops567] Maria Silva Souza", packagesReceived: 20 }];
    const { ranking } = buildEmployeeReceiptRanking(current, history.receipt);
    assert.deepEqual(ranking.map(({ opsCode, quantity }) => [opsCode, quantity]), [["ops114012", 1949], ["ops567", 70]]);

    const textWithoutHiddenColumns = text.split("\n")
        .map(row => row.split("\t").filter((_, index) => ![0, 4, 8].includes(index)).join("\t")).join("\n");
    assert.throws(() => parseEmployeeRankingClipboard({ text: textWithoutHiddenColumns }), /ID OPS \(C, G e K\)/);
});

test("usa a versão da área de transferência que contém as colunas ID OPS", t => {
    const cell = (textContent, colSpan = 1) => ({
        textContent, colSpan, rowSpan: 1,
        getAttribute: () => null,
        querySelector: () => null,
    });
    const withIds = [
        { cells: [cell("Rotas Conferidas", 3)] },
        { cells: ["ID OPS", "Colaborador", "Quantidade"].map(value => cell(value)) },
        { cells: ["ops123", "1º Maria Silva", "12"].map(value => cell(value)) },
    ];
    const visibleOnly = [
        { cells: [cell("Rotas Conferidas", 2)] },
        ...withIds.slice(1).map(row => ({ cells: row.cells.slice(1) })),
    ];
    let tableRows = withIds;
    const original = Object.getOwnPropertyDescriptor(globalThis, "document");
    Object.defineProperty(globalThis, "document", {
        configurable: true,
        value: { createElement: () => ({ content: { querySelector: () => ({ rows: tableRows }) } }) },
    });
    t.after(() => {
        if (original) Object.defineProperty(globalThis, "document", original);
        else delete globalThis.document;
    });
    const html = "<table></table>";
    const expected = [{ operator: "Maria Silva", opsCode: "ops123", routesChecked: 12 }];
    const textWithoutIds = "Rotas Conferidas\t\nColaborador\tQuantidade\n1º Maria Silva\t12";
    assert.deepEqual(parseEmployeeRankingClipboard({ text: textWithoutIds, html }).expedition, expected);

    tableRows = visibleOnly;
    const textWithIds = "Rotas Conferidas\t\t\nID OPS\tColaborador\tQuantidade\nops123\tMaria Silva\t12";
    assert.deepEqual(parseEmployeeRankingClipboard({ text: textWithIds, html }).expedition, expected);
});

test("ignora a lista OPS de cópias antigas e mantém as linhas sem código pendentes", () => {
    const text = [
        "Recebimento\t\t\tBase de Colaboradores",
        "Colaborador\tQuantidade\t\tCódigo Ops\tNome do Colaborador",
        "Maria Silva\t25\t\tops123\tMaria Silva",
        "\t\t\tCódigo inválido\t",
    ].join("\n");
    const history = parseEmployeeRankingClipboard({ text });
    assert.deepEqual(history, { receipt: [{ operator: "Maria Silva", quantity: 25 }] });
    assert.deepEqual(buildEmployeeReceiptRanking([], history.receipt), { ranking: [], pending: history.receipt });
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
    assert.match(html, />ops5<\/td>/);
    assert.deepEqual(parseEmployeeRankingClipboard({ text }).receipt, [{ operator: "Ana Santos", opsCode: "ops5", quantity: 60 }]);
});
