import assert from "node:assert/strict";
import { resolveObjectURL } from "node:buffer";
import { test } from "node:test";
import { reportManager } from "../js/reports/core/report-manager.js";
import { updateReportContextField } from "../js/reports/core/report-context.js";
import { addPlanningLh, getPlanningState, resetPlanningReport } from "../js/reports/planning/state.js";
import { getReceiptLinehaulState, replaceReceiptLinehauls } from "../js/reports/receipt/linehaul-state.js";
import {
    createReportSessionPayload,
    initializeReportSession,
    parseReportSession,
    serializeReportSession,
} from "../js/reports/session.js";

class Element {
    listeners = new Map();
    setAttribute() {}
    remove() {}
    addEventListener(name, listener) { this.listeners.set(name, listener); }
}

test("restaura, salva alterações automaticamente e usa o botão apenas para baixar", async t => {
    for (const name of ["planning", "receipt", "expedition", "losses-rate", "damage-and-losses",
        "parcel-sweeper", "reverse", "overall-analysis"]) {
        const { default: report } = await import(`../js/reports/${name}/index.js`);
        reportManager.register({ ...report, init: () => true, render: () => true });
    }

    const reportsKey = "dashboard-report-session-v1";
    addPlanningLh({ code: "LH-ANTIGO", origin: "SOC", quantity: 20 });
    const legacySnapshot = JSON.stringify(createReportSessionPayload());
    resetPlanningReport();

    const items = new Map([[reportsKey, legacySnapshot]]);
    const writes = [];
    let storageFull = false;
    const downloads = [];
    const save = new Element();
    const importButton = new Element();
    const fileInput = new Element();
    const elements = {
        reportDownloadButton: save,
        reportImportButton: importButton,
        reportSessionFileInput: fileInput,
    };
    Object.assign(globalThis, {
        HTMLElement: Element,
        HTMLButtonElement: Element,
        HTMLInputElement: Element,
        document: {
            getElementById: id => elements[id] ?? null,
            querySelector: () => null,
            querySelectorAll: () => [],
            dispatchEvent: () => true,
            body: { appendChild() {} },
            createElement: () => ({
                click() { downloads.push(resolveObjectURL(this.href)); },
                remove() {},
            }),
        },
        window: {
            sessionStorage: {
                getItem: key => items.get(key) ?? null,
                setItem(key, value) {
                    if (storageFull) throw new DOMException("Cota excedida", "QuotaExceededError");
                    writes.push(key);
                    items.set(key, value);
                },
            },
            setTimeout,
        },
    });

    assert.equal(initializeReportSession(), true);
    assert.equal(getPlanningState().lhs.some(lh => lh.code === "LH-ANTIGO"), true);
    assert.deepEqual(writes, []);

    addPlanningLh({ code: "LH-PLANO", origin: "SOC", quantity: 100 });
    replaceReceiptLinehauls([{ code: "LH-RECEB", loadedOrders: 120 }]);
    updateReportContextField("plannedVolume", 4321);
    await Promise.resolve();
    assert.deepEqual(writes, [reportsKey]);
    const saved = JSON.parse(items.get(reportsKey));
    assert.equal(saved.context.plannedVolume, 4321);
    assert.equal(saved.reports.planning.lhs.some(lh => lh.code === "LH-PLANO"), true);
    assert.equal(saved.reports.receipt.linehaul.linehauls.some(lh => lh.code === "LH-RECEB"), true);

    save.listeners.get("click")();
    assert.deepEqual(writes, [reportsKey]);
    assert.equal(downloads.length, 1);
    const file = parseReportSession(await downloads[0].text());
    assert.deepEqual(file.context, saved.context);
    assert.deepEqual(file.reports.planning, saved.reports.planning);
    assert.deepEqual(file.reports.receipt, saved.reports.receipt);

    resetPlanningReport();
    await Promise.resolve();
    assert.equal(JSON.parse(items.get(reportsKey)).reports.planning.lhs.some(lh => lh.code === "LH-PLANO"), false);

    fileInput.files = [new File([serializeReportSession(file)], "sessao.js")];
    await fileInput.listeners.get("change")();
    assert.equal(writes.filter(key => key === reportsKey).length, 3);
    assert.equal(getPlanningState().lhs.some(lh => lh.code === "LH-PLANO"), true);
    assert.equal(getReceiptLinehaulState().linehauls.some(lh => lh.code === "LH-RECEB"), true);

    const warning = t.mock.method(console, "warn", () => {});
    storageFull = true;
    updateReportContextField("plannedVolume", 7654);
    await Promise.resolve();
    assert.equal(warning.mock.callCount(), 1);
    assert.equal(JSON.parse(items.get(reportsKey)).context.plannedVolume, 4321);
    save.listeners.get("click")();
    assert.equal(downloads.length, 2);
    assert.equal(parseReportSession(await downloads[1].text()).context.plannedVolume, 7654);
});
