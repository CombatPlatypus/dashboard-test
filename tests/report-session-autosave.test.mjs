import assert from "node:assert/strict";
import { resolveObjectURL } from "node:buffer";
import { test } from "node:test";
import { reportManager } from "../js/reports/core/report-manager.js";
import { getReportContext, updateReportContextField } from "../js/reports/core/report-context.js";
import { addPlanningLh, getPlanningState, resetPlanningReport } from "../js/reports/planning/state.js";
import { getReceiptLinehaulState, replaceReceiptLinehauls } from "../js/reports/receipt/linehaul-state.js";
import { replaceReceiptOperators } from "../js/reports/receipt/state.js";
import { replaceExpeditionRoutes } from "../js/reports/expedition/state.js";
import { replaceEmployeeRankingHistory } from "../js/reports/employee-ranking/state.js";
import { replaceParcelRows, updateParcelFilter } from "../js/reports/parcel-sweeper/state.js";
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
    const reportExports = [];
    for (const name of ["planning", "receipt", "expedition", "losses-rate", "damage-and-losses",
        "parcel-sweeper", "reverse", "overall-analysis"]) {
        const { default: report } = await import(`../js/reports/${name}/index.js`);
        reportManager.register({ ...report, init: () => true, render: () => true, exportSession() {
            reportExports.push(report.id);
            return report.exportSession();
        } });
    }

    const legacyReportsKey = "dashboard-report-session-v1";
    const reportsKey = "dashboard-report-session-v2";
    const partKey = (id, revision) => `dashboard-report-state-v2:${id}:${revision}`;
    const contextKey = "dashboard-report-context-v1";
    addPlanningLh({ code: "LH-ANTIGO", origin: "SOC", quantity: 20 });
    updateReportContextField("plannedVolume", 2500);
    const legacySnapshot = createReportSessionPayload();
    delete legacySnapshot.reports["overall-analysis"];
    resetPlanningReport();

    const items = new Map([
        [legacyReportsKey, JSON.stringify(legacySnapshot)],
        [contextKey, JSON.stringify({
            storageRevision: 0,
            context: { ...getReportContext(), plannedVolume: null },
            profile: { name: "", shift: "AM" },
        })],
    ]);
    const writes = [];
    let blocksWrite = () => false;
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
                removeItem: key => items.delete(key),
                setItem(key, value) {
                    if (blocksWrite(key)) throw new DOMException("Cota excedida", "QuotaExceededError");
                    writes.push(key);
                    items.set(key, value);
                },
            },
            setTimeout,
        },
    });
    const readIndex = () => JSON.parse(items.get(reportsKey));
    const readPart = id => JSON.parse(items.get(partKey(id, readIndex().parts[id])));

    assert.equal(initializeReportSession(), true);
    assert.equal(getPlanningState().lhs.some(lh => lh.code === "LH-ANTIGO"), true);
    assert.equal(getReportContext().plannedVolume, null);
    assert.deepEqual(writes, []);

    addPlanningLh({ code: "LH-PLANO", origin: "SOC", quantity: 100 });
    replaceReceiptLinehauls([{ code: "LH-RECEB", loadedOrders: 120 }]);
    updateReportContextField("plannedVolume", 4321);
    await Promise.resolve();
    const saved = readIndex();
    assert.deepEqual(writes, [...Object.keys(saved.parts).map(id => partKey(id, saved.parts[id])), reportsKey]);
    assert.equal(items.has(legacyReportsKey), false);
    writes.length = 0;
    assert.equal(saved.context.plannedVolume, 4321);
    assert.equal(readPart("planning").lhs.some(lh => lh.code === "LH-PLANO"), true);
    assert.equal(readPart("receipt").linehaul.linehauls.some(lh => lh.code === "LH-RECEB"), true);

    updateReportContextField("plannedVolume", 5678);
    updateReportContextField("analyst", "Analista local");
    await Promise.resolve();
    assert.deepEqual(writes, [contextKey]);
    assert.equal(items.get(reportsKey), JSON.stringify(saved));
    const savedContext = JSON.parse(items.get(contextKey));
    assert.equal(savedContext.storageRevision, saved.storageRevision);
    assert.equal(savedContext.context.plannedVolume, 5678);
    assert.equal(savedContext.context.analyst, "Analista local");

    save.listeners.get("click")();
    assert.deepEqual(writes, [contextKey]);
    assert.equal(downloads.length, 1);
    const file = parseReportSession(await downloads[0].text());
    assert.deepEqual(file.context, savedContext.context);
    assert.equal(Object.hasOwn(file, "storageRevision"), false);
    assert.deepEqual(file.reports.planning, readPart("planning"));
    assert.deepEqual(file.reports.receipt, { ...readPart("receipt"), expectedVolume: 5678 });

    reportExports.length = 0;
    writes.length = 0;
    resetPlanningReport();
    await Promise.resolve();
    assert.deepEqual(reportExports, ["planning"]);
    assert.deepEqual(writes, [partKey("planning", saved.parts.planning)]);
    assert.equal(readPart("planning").lhs.some(lh => lh.code === "LH-PLANO"), false);

    updateReportContextField("plannedVolume", 9999);
    await Promise.resolve();
    const contextBeforeImport = JSON.parse(items.get(contextKey));
    fileInput.files = [new File([serializeReportSession(file)], "sessao.js")];
    await fileInput.listeners.get("change")();
    assert.equal(writes.filter(key => key === reportsKey).length, 1);
    assert.equal(getPlanningState().lhs.some(lh => lh.code === "LH-PLANO"), true);
    assert.equal(getReceiptLinehaulState().linehauls.some(lh => lh.code === "LH-RECEB"), true);
    const imported = readIndex();
    assert.equal(imported.context.plannedVolume, 5678);
    assert.notEqual(contextBeforeImport.storageRevision, imported.storageRevision);

    const warning = t.mock.method(console, "warn", () => {});
    blocksWrite = () => true;
    updateReportContextField("plannedVolume", 7654);
    await Promise.resolve();
    assert.equal(warning.mock.callCount(), 1);
    assert.equal(items.get(contextKey), JSON.stringify(contextBeforeImport));
    assert.equal(JSON.parse(items.get(reportsKey)).context.plannedVolume, 5678);
    save.listeners.get("click")();
    assert.equal(downloads.length, 2);
    assert.equal(parseReportSession(await downloads[1].text()).context.plannedVolume, 7654);

    blocksWrite = () => false;
    replaceParcelRows([{ trackingNumber: "BR123", countType: "Backlog" }]);
    await Promise.resolve();
    const parcelBefore = readPart("parcel");
    reportExports.length = 0;
    writes.length = 0;
    updateParcelFilter("backlog");
    await Promise.resolve();
    assert.deepEqual(reportExports, []);
    assert.deepEqual(writes, [reportsKey]);
    assert.deepEqual(readPart("parcel"), parcelBefore);
    assert.equal(readIndex().parcelControls.activeFilter, "backlog");

    const storedBeforeFailure = new Map(items);
    blocksWrite = key => key === reportsKey;
    addPlanningLh({ code: "LH-RETRY", quantity: 42 });
    replaceReceiptLinehauls([{ code: "LH-RETRY", loadedOrders: 42 }]);
    await Promise.resolve();
    assert.equal(warning.mock.callCount(), 2);
    assert.deepEqual(items, storedBeforeFailure, "Partes em preparação não substituem uma gravação válida.");
    blocksWrite = () => false;
    updateReportContextField("analyst", "Analista recuperado");
    await Promise.resolve();
    assert.equal(readPart("planning").lhs.some(lh => lh.code === "LH-RETRY"), true);
    assert.equal(readPart("receipt").linehaul.linehauls.some(lh => lh.code === "LH-RETRY"), true);
    assert.equal(readIndex().parcelControls.activeFilter, "backlog");

    reportExports.length = 0;
    writes.length = 0;
    const ranking = [{ operator: "Ana Rosa Silva", routesChecked: 10, routesWithDuration: 8, totalDurationSeconds: 2400 }];
    const processingRanking = {
        receipt: [{ operator: "Ana Rosa Silva", quantity: 120 }],
        labelingErrors: [{ operator: "Ana Rosa Silva", quantity: 2 }],
    };
    const history = { expedition: ranking, ...processingRanking };
    replaceEmployeeRankingHistory(history);
    await Promise.resolve();
    assert.deepEqual(reportExports, ["overall-analysis"]);
    assert.deepEqual(writes, [partKey("overall-analysis", readIndex().parts["overall-analysis"])]);
    assert.deepEqual(readPart("overall-analysis"), { employeeRanking: ranking, processingRanking });

    reportExports.length = 0;
    writes.length = 0;
    replaceEmployeeRankingHistory(structuredClone(history));
    await Promise.resolve();
    assert.deepEqual(reportExports, []);
    assert.deepEqual(writes, []);

    replaceReceiptOperators([{ receiver: "Ana Rosa Silva", packagesReceived: 100, errorQuantity: 1 }]);
    await Promise.resolve();
    assert.deepEqual(reportExports, ["receipt"]);
    assert.deepEqual(writes, [partKey("receipt", readIndex().parts.receipt)]);
    assert.deepEqual(readPart("overall-analysis"), { employeeRanking: ranking, processingRanking });

    reportExports.length = 0;
    writes.length = 0;
    replaceExpeditionRoutes([{ code: "AT1", status: "Validated", validationOperator: "Ana Rosa Silva" }]);
    await Promise.resolve();
    assert.deepEqual(reportExports, ["expedition"]);
    assert.deepEqual(writes, [partKey("expedition", readIndex().parts.expedition)]);
    assert.deepEqual(readPart("overall-analysis"), { employeeRanking: ranking, processingRanking });

    replaceEmployeeRankingHistory({});
    await Promise.resolve();
    assert.deepEqual(readPart("overall-analysis"), {});
});
