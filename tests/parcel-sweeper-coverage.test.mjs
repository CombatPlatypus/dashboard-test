import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";
import { readParcelFile } from "../js/reports/parcel-sweeper/import.js";
import { initializeParcelCharts } from "../js/reports/parcel-sweeper/charts.js";
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

function initializeReport(t) {
    t.after(resetParcelReport);
    class Element {
        constructor(tag = "div") {
            this.tag = tag; this.dataset = {}; this.style = {}; this.children = []; this.textContent = "";
        }
        addEventListener() {}
        setAttribute(name, value) { this[name] = value; }
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
    class Canvas extends Element {
        constructor() { super("canvas"); this.parentElement = new Element(); }
    }
    const charts = [];
    const ids = ["parcelTotalScanned", "parcelBacklogTotal", "parcelExceptionTotal", "parcelMissortedTotal",
        "parcelUnscannedTotal", "parcelCoverageScanned", "parcelCoverageUnscanned", "parcelOperatorDistributionBody",
        "parcelPackageFilter", "parcelCommonPackagesBody", "parcelBulkyPackagesBody"];
    const elements = new Map(ids.map(id => [id, new Element()]));
    for (const id of ["parcelCommonPackagesBody", "parcelBulkyPackagesBody"]) elements.get(id).table = new Element("table");
    for (const id of ["parcelCoverageChart", "parcelAgingChart", "parcelScannedStatusChart", "parcelFinalStatusChart", "parcelNextStepActionChart"]) {
        elements.set(id, new Canvas());
    }
    const panel = new Element();
    panel.id = "parcel";
    panel.querySelector = selector => elements.get(selector.slice(1));
    replaceGlobal(t, "HTMLElement", Element);
    replaceGlobal(t, "HTMLButtonElement", Button);
    replaceGlobal(t, "HTMLCanvasElement", Canvas);
    replaceGlobal(t, "MutationObserver", class { observe() {} disconnect() {} });
    replaceGlobal(t, "document", {
        createElement: tag => tag === "button" ? new Button(tag) : new Element(tag),
        createDocumentFragment: () => new Element("fragment"),
    });
    const require = createRequire(import.meta.url);
    replaceGlobal(t, "window", { XLSX: require("../js/libraries/xlsx.full.min.js"), Chart: class {
        constructor(canvas, config) { Object.assign(this, config); this.canvas = canvas; charts.push(this); }
        resize() {} update() {}
    } });
    resetParcelReport();
    assert.equal(initializeParcelCharts(panel), true);
    assert.equal(initializeParcelView(panel), true);
    return { elements, coverage: charts[0] };
}

function centerText(chart) {
    const texts = [];
    chart.ctx = { save() {}, restore() {}, fillText: text => texts.push(text) };
    chart.$parcelCoverageGeometry = { centerX: 100, textCenterY: 100 };
    chart.plugins.find(plugin => plugin.id === "parcelCoverageCenterText").afterDraw(chart);
    return texts[0];
}

test("CSV do SPX exibe 354 escaneados, 370 não escaneados e 48,47%, inclusive após restaurar sessão", async t => {
    const { elements, coverage } = initializeReport(t);
    // Quantidades e categorias do export de 09/10, sem códigos ou nomes reais.
    const groups = [
        [370, "Missing", "-", "Y"], [239, "Backlog", "LMHub_Received", "Y"],
        [51, "Exception", "LMHub_Received", "Y"], [26, "Mis-sorted", "LMHub_Received", "Y"],
        [19, "Exception", "Return_LMHub_Received", "Y"], [9, "Backlog", "Return_LMHub_Received", "Y"],
        [3, "Backlog", "SOC_LHTransported", "Y"], [1, "Processed", "-", "Y"],
        [3, "Exception", "Delivered", "N"], [1, "Mis-sorted", "SOC_Received", "N"],
        [1, "Backlog", "OnHold", "N"], [1, "Exception", "SP_Collection_Collected", "N"],
    ];
    const lines = ["SPX Tracking Number,Scanned Status,Count Type,Expected,Operator,Aging Time,Scanned Time"];
    for (const [quantity, countType, status, expected] of groups) {
        for (let i = 0; i < quantity; i += 1) lines.push(`BRTEST${lines.length},${status},${countType},${expected},,,`);
    }
    const imported = await readParcelFile(new File([lines.join("\n")], "parcel.csv"));
    assert.equal(imported.rows.length, 724);
    const check = () => {
        assert.equal(elements.get("parcelCoverageScanned").textContent, "354");
        assert.equal(elements.get("parcelTotalScanned").textContent, "354");
        assert.equal(elements.get("parcelCoverageUnscanned").textContent, "370");
        assert.equal(elements.get("parcelUnscannedTotal").textContent, "370");
        assert.deepEqual(coverage.data.datasets[0].data, [348, 370]);
        assert.equal(coverage.$parcelTotal, 718);
        assert.equal(centerText(coverage), "48,47%");
    };
    replaceParcelRows(imported.rows);
    check();
    for (const filter of ["backlog", "exception", "all"]) {
        updateParcelFilter(filter);
        check();
    }
    resetParcelReport();
    assert.equal(elements.get("parcelCoverageScanned").textContent, "—");
    assert.equal(elements.get("parcelCoverageUnscanned").textContent, "—");
    assert.equal(centerText(coverage), "—");
    assert.equal(restoreParcelState({ rows: imported.rows }), true);
    check();
});

test("totais da legenda preservam outros exports, arquivos sem Expected e arquivos sem pacotes esperados", t => {
    const { elements, coverage } = initializeReport(t);
    const groups = [[319, "Backlog", "Y"], [242, "Missing", "Y"], [7, "Backlog", "N"]];
    const rows = groups.flatMap(([quantity, countType, expected], group) => Array.from(
        { length: quantity }, (_, index) => ({ trackingNumber: `BR${group}-${index}`, countType, expected }),
    ));
    replaceParcelRows(rows);
    assert.equal(elements.get("parcelCoverageScanned").textContent, "326");
    assert.equal(elements.get("parcelCoverageUnscanned").textContent, "242");
    assert.equal(centerText(coverage), "56,86%");
    const small = [{ trackingNumber: "BR1", countType: "Backlog" }, { trackingNumber: "BR2", countType: "Missing" }];
    replaceParcelRows(small);
    assert.equal(elements.get("parcelCoverageScanned").textContent, "1");
    assert.equal(elements.get("parcelCoverageUnscanned").textContent, "1");
    assert.equal(centerText(coverage), "50,00%");
    replaceParcelRows(small.map(row => ({ ...row, expected: "N" })));
    assert.equal(elements.get("parcelCoverageScanned").textContent, "1");
    assert.equal(elements.get("parcelCoverageUnscanned").textContent, "1");
    assert.equal(centerText(coverage), "—");
});
