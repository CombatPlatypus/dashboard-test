import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";
import * as clipboardSource from "../js/filter/clipboard-source.js";

const require = createRequire(import.meta.url);
const XLSX = require("../js/libraries/xlsx.full.min.js");
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const source = readFileSync(new URL("../js/filter/init.js", import.meta.url), "utf8")
    .replace(/^import \{[\s\S]*?\} from "\.\/clipboard-source\.js";\r?\n/, "");

// Run the panel's event handlers with the real CSV/XLSX library and a small DOM.
class Element {
    constructor(tagName = "") {
        this.tagName = tagName;
        this.value = "";
        this.textContent = "";
        this.children = [];
        this.dataset = {};
        this.listeners = new Map();
        this.classList = { add() {} };
    }
    addEventListener(name, handler) {
        const handlers = this.listeners.get(name) ?? [];
        handlers.push(handler);
        this.listeners.set(name, handlers);
    }
    async dispatch(name) {
        for (const handler of this.listeners.get(name) ?? []) await handler();
    }
    click() { return this.dispatch("click"); }
    focus() {}
    remove() {}
    setAttribute(name, value) { this[name] = value; }
    appendChild(child) {
        this.children.push(...(child.tagName === "fragment" ? child.children : [child]));
        return child;
    }
    replaceChildren(...children) {
        this.children = [];
        children.forEach(child => this.appendChild(child));
    }
    querySelector(tagName) {
        return this.children.find(child => child.tagName === tagName);
    }
}

function setup() {
    const ids = new Set(Array.from(html.matchAll(/id="([^"]+)"/g), match => match[1]));
    const elements = new Map();
    const copies = [];
    const downloads = [];
    const blobs = new Map();
    const document = {
        body: new Element("body"),
        createDocumentFragment: () => new Element("fragment"),
        createElement(tagName) {
            const element = new Element(tagName);
            if (tagName === "a") {
                element.click = () => downloads.push({
                    name: element.download,
                    blob: blobs.get(element.href),
                });
            }
            return element;
        },
        getElementById(id) {
            assert.ok(ids.has(id), "Missing HTML element: " + id);
            if (!elements.has(id)) elements.set(id, new Element());
            return elements.get(id);
        },
    };
    const get = id => document.getElementById(id);
    const table = get("filterPreviewTable");
    table.appendChild(new Element("thead"));
    table.appendChild(new Element("tbody"));

    // The dashboard uses jQuery/Select2 for the purpose selector.
    const jQuery = element => ({
        trigger() {},
        on(name, handler) { element.addEventListener(name.split(".")[0], handler); },
    });
    jQuery.fn = { select2() {} };
    vm.runInNewContext(source, {
        ...clipboardSource,
        document,
        window: { XLSX, jQuery, setTimeout: callback => callback() },
        navigator: { clipboard: { writeText: async text => copies.push(text) } },
        URL: {
            createObjectURL(blob) {
                const url = "blob:test-" + blobs.size;
                blobs.set(url, blob);
                return url;
            },
            revokeObjectURL: url => blobs.delete(url),
        },
        Blob,
        TextDecoder,
        console,
    }, { filename: "js/filter/init.js" });

    return {
        get, copies, downloads,
        async select(value) {
            const selectMarkup = html.match(/<select[^>]+id="filterPurpose"[\s\S]*?<\/select>/)[0];
            assert.ok(selectMarkup.includes('value="' + value + '"'));
            get("filterPurpose").value = value;
            await get("filterPurpose").dispatch("change");
        },
        async import(file) {
            await get("filterImportButton").click();
            get("filterFileInput").files = [file];
            await get("filterFileInput").dispatch("change");
        },
        async filter(values) {
            get("filterValues").value = values;
            await get("filterValues").dispatch("input");
            await get("filterApplyButton").click();
        },
        rows(tagName = "tbody") {
            return table.querySelector(tagName).children.map(row =>
                row.children.map(cell => cell.textContent));
        },
        message() { return get("filterNotificationText").textContent; },
        type() { return get("filterNotification").dataset.notificationType; },
    };
}

function csvFile(csv, name = "erros.csv") {
    return new File([csv], name, { type: "text/csv" });
}

function workbookFile(rows, name) {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), "Base");
    const bookType = name.endsWith(".xls") ? "xls" : "xlsx";
    return new File([XLSX.write(workbook, { type: "array", bookType })], name);
}

test("Export Erros filtra por BR, mostra as duas colunas e copia/salva o CSV na ordem informada", async () => {
    const panel = setup();
    await panel.select("export-errors");
    assert.equal(panel.get("filterFileInput").accept, ".csv");
    await panel.import(csvFile([
        "Extra,Operator,SPX Tracking Number",
        'ignorar,"João, Silva",BR001',
        "ignorar,Bruno,BR002",
        "ignorar,Outro,BR003",
    ].join("\n")));
    assert.equal(panel.type(), "success");
    assert.equal(panel.get("filterValues").disabled, false);
    await panel.filter("BR002\nBR001\nBR999\nBR001");
    assert.deepEqual(panel.rows("thead"), [["SPX Tracking Number", "Operator"]]);
    assert.deepEqual(panel.rows(), [["BR002", "Bruno"], ["BR001", "João, Silva"]]);
    assert.equal(panel.type(), "warning");
    assert.match(panel.message(), /1 não encontrado/);
    assert.match(panel.message(), /1 repetido/);
    assert.ok(panel.message().length <= 140);
    assert.equal(panel.get("filterCopyButton").disabled, false);
    assert.equal(panel.get("filterSaveButton").disabled, false);

    await panel.get("filterCopyButton").click();
    assert.deepEqual(panel.copies, ["BR002\tBruno\nBR001\tJoão, Silva"]);
    await panel.get("filterSaveButton").click();
    assert.equal(panel.downloads[0].name, "erros_export-erros.csv");
    const bytes = new Uint8Array(await panel.downloads[0].blob.arrayBuffer());
    assert.deepEqual(Array.from(bytes.slice(0, 3)), [0xEF, 0xBB, 0xBF]);
    const exported = XLSX.read(bytes, { type: "array" });
    assert.deepEqual(XLSX.utils.sheet_to_json(exported.Sheets[exported.SheetNames[0]], { header: 1 }), [
        ["SPX Tracking Number", "Operator"],
        ["BR002", "Bruno"],
        ["BR001", "João, Silva"],
    ]);
});

test("a validação identifica exatamente cada coluna obrigatória ausente e limpa os resultados anteriores", async t => {
    for (const [csv, missing] of [
        ["SPX Tracking Number\nBR001", ["Operator"]],
        ["Operator\nAna", ["SPX Tracking Number"]],
        ["Outra,Coluna\nBR001,Ana", ["SPX Tracking Number", "Operator"]],
    ]) {
        await t.test(missing.join(", "), async () => {
            const panel = setup();
            await panel.select("export-errors");
            await panel.import(csvFile("SPX Tracking Number,Operator\nBR001,Ana"));
            await panel.filter("BR001");
            await panel.import(csvFile(csv));
            assert.equal(panel.type(), "error");
            assert.equal(panel.message(), "Colunas obrigatórias ausentes: " + missing.join(", ") + ".");
            assert.ok(panel.message().length <= 140);
            assert.equal(panel.get("filterValues").disabled, true);
            assert.equal(panel.get("filterCopyButton").disabled, true);
            assert.equal(panel.get("filterSaveButton").disabled, true);
            assert.equal(panel.get("filterPreviewResult").hidden, true);
        });
    }
});

test("aceita CSV com BOM, cabeçalhos normalizados e separador ponto e vírgula", async () => {
    const panel = setup();
    await panel.select("export-errors");
    await panel.import(csvFile(
        '\uFEFF operator ; SPX TRACKING NUMBER \r\n"João; Souza";BR001',
        "erros.CSV",
    ));
    assert.equal(panel.type(), "success");
    await panel.filter("br001");
    assert.deepEqual(panel.rows(), [["BR001", "João; Souza"]]);
});

test("preserva operadores com acentos também em CSV de codificação antiga", async () => {
    const panel = setup();
    await panel.select("export-errors");
    const bytes = Buffer.from("SPX Tracking Number,Operator\nBR001,João Souza", "latin1");
    await panel.import(new File([bytes], "erros.csv", { type: "text/csv" }));
    assert.equal(panel.type(), "success");
    await panel.filter("BR001");
    assert.deepEqual(panel.rows(), [["BR001", "João Souza"]]);
});

test("Export Erros recusa XLSX/XLS e mantém esses formatos disponíveis nas demais finalidades", async () => {
    const panel = setup();
    const errors = [["SPX Tracking Number", "Operator"], ["BR001", "Ana"]];
    await panel.select("export-errors");
    for (const name of ["erros.xlsx", "erros.xls", "erros.txt"]) {
        await panel.import(workbookFile(errors, name));
        assert.equal(panel.type(), "error");
        assert.equal(panel.message(), "Selecione um arquivo CSV para Export Erros.");
        assert.equal(panel.get("filterValues").disabled, true);
    }

    await panel.select("export-damage");
    assert.deepEqual(panel.get("filterFileInput").accept.split(",").sort(), [".csv", ".xls", ".xlsx"]);
    for (const name of ["avarias.xlsx", "avarias.xls"]) {
        await panel.import(workbookFile([
            ["Order ID", "Status", "Current Station", "Current Station Received Time"],
            ["BR001", "Novo", "SoC_SP_Santana", "2026-10-02 10:00:00"],
            ["BR001", "Antigo", "LM Hub", "2026-10-01 10:00:00"],
        ], name));
        assert.equal(panel.type(), "success");
        await panel.filter("BR001");
        assert.deepEqual(panel.rows(), [["BR001", "Antigo", "LM Hub"]]);
    }
});

test("trocar de finalidade ou editar os BRs invalida a prévia e o descarte restaura os formatos", async () => {
    const panel = setup();
    await panel.select("export-errors");
    await panel.import(csvFile("SPX Tracking Number,Operator\nBR001,Ana"));
    await panel.filter("BR001");
    panel.get("filterValues").value = "BR999";
    await panel.get("filterValues").dispatch("input");
    assert.equal(panel.get("filterCopyButton").disabled, true);
    assert.equal(panel.get("filterSaveButton").disabled, true);
    await panel.get("filterApplyButton").click();
    assert.equal(panel.type(), "warning");
    assert.equal(panel.get("filterCopyButton").disabled, true);
    await panel.select("export-analysis");
    assert.equal(panel.get("filterValues").disabled, true);
    assert.equal(panel.get("filterPreviewResult").hidden, true);
    await panel.import(csvFile([
        "Shipment_id,binding_entity,AT_Number,driver_id,motorista,item_names",
        "BR001,Primeira,AT1,ID1,Ana,Produto",
        "BR001,Segunda,AT2,ID2,Bruno,Outro",
    ].join("\n")));
    await panel.filter("BR001");
    assert.deepEqual(panel.rows(), [["BR001", "Primeira", "AT1", "ID1", "Ana"]]);
    await panel.get("filterClearButton").click();
    assert.equal(panel.get("filterPurpose").value, "");
    assert.equal(panel.get("filterImportButton").disabled, true);
    assert.deepEqual(panel.get("filterFileInput").accept.split(",").sort(), [".csv", ".xls", ".xlsx"]);
});

test("as notificações de importação e exportação ficam curtas mesmo com nomes de arquivo longos", async () => {
    const panel = setup();
    await panel.select("export-errors");
    await panel.import(csvFile("SPX Tracking Number,Operator\nBR001,Ana", "x".repeat(180) + ".csv"));
    assert.ok(panel.message().length <= 140);
    await panel.filter("BR001");
    await panel.get("filterSaveButton").click();
    assert.equal(panel.type(), "success");
    assert.ok(panel.message().length <= 140);
});
