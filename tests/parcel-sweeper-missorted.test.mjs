import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import { createParcelSummary } from "../js/reports/parcel-sweeper/model.js";
import { readParcelFile } from "../js/reports/parcel-sweeper/import.js";
import { initializeParcelView } from "../js/reports/parcel-sweeper/view.js";
import { replaceParcelRows, resetParcelReport, restoreParcelState, updateParcelFilter } from "../js/reports/parcel-sweeper/state.js";

function replaceGlobal(t, name, value) {
    const original = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
    t.after(() => {
        if (original) Object.defineProperty(globalThis, name, original);
        else delete globalThis[name];
    });
}

test("Missorted conta somente Count Type, sem depender de bipagem ou operador", () => {
    const summary = createParcelSummary([
        { countType: "Mis-sorted", scannedStatus: "Scanned", operator: "[Ops1]ANA" },
        { countType: " mis-SORTED ", scannedStatus: "-", operator: "" },
        { countType: "MIS-SORTED", scannedStatus: "Scanned", operator: "outro@empresa.com" },
        { countType: "Backlog", finalStatus: "Mis-sorted", nextStepAction: "Mis-sorted" },
        { countType: "Exception" }, { countType: "Missing" }, { countType: "Processed" },
        { countType: "Mis-sorted extra" }, { countType: "Not Mis-sorted" }, {},
    ]);
    assert.equal(summary.missortedCount, 3);
    assert.equal(summary.backlogCount, 1);
    assert.equal(summary.exceptionCount, 1);
    assert.equal(summary.totalRows, 10);
    assert.equal(createParcelSummary([]).missortedCount, 0);
    assert.equal(createParcelSummary(null).missortedCount, 0);
});

test("importador lê Mis-sorted da coluna Count Type do CSV", async t => {
    const require = createRequire(import.meta.url);
    replaceGlobal(t, "window", { XLSX: require("../js/libraries/xlsx.full.min.js") });
    const csv = [
        "SPX Tracking Number,Scanned Status,Count Type,Operator,Aging Time,Scanned Time",
        "BR1,Scanned,Mis-sorted,[Ops1]ANA,5h,2026-10-02 14:00:00",
        "BR2,-,Mis-sorted,,,",
        "BR3,Scanned,Backlog,[Ops1]ANA,5h,2026-10-02 14:00:02",
    ].join("\n");
    const imported = await readParcelFile(new File([csv], "parcel-missorted.csv", { type: "text/csv" }));
    assert.equal(createParcelSummary(imported.rows).missortedCount, 2);
});

test("novo card tem id único e mantém o layout fornecido", () => {
    const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
    assert.equal([...html.matchAll(/id="parcelMissortedTotal"/g)].length, 1);
    assert.match(html, /<h4 id="parcelMissortedTotal">—<\/h4>\s*<\/div>\s*<p>Pacotes Missorted<\/p>/);
});

test("card acompanha importação, filtros, restauração e limpeza, com número em pt-BR", t => {
    resetParcelReport();
    class Element {
        constructor(tag = "div") { this.tag = tag; this.dataset = {}; this.children = []; this.textContent = ""; }
        addEventListener() {}
        setAttribute() {}
        querySelector() { return null; }
        querySelectorAll() { return []; }
        closest() { return this.table ?? this; }
        replaceChildren() { this.children = []; }
        appendChild(child) {
            if (child.tag === "fragment") this.children.push(...child.children);
            else this.children.push(child);
        }
    }
    class Button extends Element {}
    replaceGlobal(t, "HTMLElement", Element);
    replaceGlobal(t, "HTMLButtonElement", Button);
    replaceGlobal(t, "document", {
        createElement: tag => tag === "button" ? new Button(tag) : new Element(tag),
        createDocumentFragment: () => new Element("fragment"),
    });
    const ids = ["parcelTotalScanned", "parcelBacklogTotal", "parcelExceptionTotal", "parcelMissortedTotal",
        "parcelUnscannedTotal", "parcelCoverageScanned", "parcelCoverageUnscanned", "parcelOperatorDistributionBody",
        "parcelPackageFilter", "parcelCommonPackagesBody", "parcelBulkyPackagesBody"];
    const elements = new Map(ids.map(id => [id, new Element()]));
    for (const id of ["parcelCommonPackagesBody", "parcelBulkyPackagesBody"]) elements.get(id).table = new Element("table");
    const root = { querySelector: selector => elements.get(selector.slice(1)) };
    assert.equal(initializeParcelView(root), true);
    const card = elements.get("parcelMissortedTotal");
    assert.equal(card.textContent, "—");
    replaceParcelRows(Array.from({ length: 2185 }, (_, index) => ({ trackingNumber: `BR${index}`, countType: "Mis-sorted" })));
    assert.equal(card.textContent, "2.185");
    for (const filter of ["backlog", "exception", "all"]) {
        updateParcelFilter(filter);
        assert.equal(card.textContent, "2.185");
    }
    replaceParcelRows([{ trackingNumber: "BR1", countType: "Backlog" }]);
    assert.equal(card.textContent, "0");
    assert.equal(restoreParcelState({ rows: [{ trackingNumber: "BR2", countType: "Mis-sorted" }] }), true);
    assert.equal(card.textContent, "1");
    resetParcelReport();
    assert.equal(card.textContent, "—");
});
