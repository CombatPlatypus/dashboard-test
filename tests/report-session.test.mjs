import assert from "node:assert/strict";
import {
    test,
} from "node:test";

class TestElement {}
const restoredEvents = [];

globalThis.HTMLElement =
    TestElement;

globalThis.HTMLInputElement =
    TestElement;

globalThis.HTMLButtonElement =
    TestElement;

globalThis.HTMLImageElement =
    TestElement;

globalThis.document = {
    dispatchEvent(event) {
        restoredEvents.push(event);
        return true;
    },
    getElementById() {
        return null;
    },

    querySelectorAll() {
        return [];
    },
};

const originalConsoleError =
    console.error;

console.error = function () {};

const {
    REPORT_SESSION_IDS,
    REPORT_SESSION_SCHEMA,
    REPORT_SESSION_VERSION,
    createReportSessionPayload,
    parseReportSession,
    restoreReportSession,
    serializeReportSession,
    validateReportSessionPayload,
} = await import(
    "../js/reports/session.js"
);

console.error =
    originalConsoleError;

const { reportManager } = await import("../js/reports/core/report-manager.js");
const { getReportContext, restoreReportContext } = await import("../js/reports/core/report-context.js");
const { exportDashboardSettings, importDashboardSettings } = await import("../js/spreadsheets/load-spreadsheets.js");
const reportModules = await Promise.all([
    "planning", "receipt", "expedition", "losses-rate", "damage-and-losses", "parcel-sweeper", "reverse", "overall-analysis",
].map(async name => (await import(`../js/reports/${name}/index.js`)).default));

function registerReports(t) {
    const context = getReportContext();
    const settings = exportDashboardSettings();
    const rendered = [];
    reportManager.reports.clear();
    reportManager.initializedReports.clear();
    restoredEvents.length = 0;
    for (const report of reportModules) {
        if (report.id !== "overall-analysis") report.reset();
        // Exercise the real state import/export without initializing charts or DOM controls.
        reportManager.register({ ...report, init: () => true, render: () => {
            rendered.push(report.id);
            return true;
        } });
    }
    t.after(() => {
        for (const report of reportModules) if (report.id !== "overall-analysis") report.reset();
        reportManager.reports.clear();
        reportManager.initializedReports.clear();
        restoreReportContext(context);
        importDashboardSettings(settings, { applyProfileToReports: false });
    });
    return rendered;
}

function populateMissingReports() {
    const payload = createReportSessionPayload();
    payload.context = { ...payload.context, window: "PM2", analyst: "Ana Silva", plannedVolume: 3141 };
    payload.settings.theme = "purple";
    const damage = payload.reports["damage-and-losses"];
    Object.assign(damage, {
        monthIndex: 9, year: 2026, sourceFileName: "avarias.xlsx", sourceSheetName: "Histórico de Avarias e Perdas",
        days: [{ date: "2026-10-14", hub: 2, soc: 3, solid: 1, liquid: 2, glass: 2,
            socStations: [{ name: "SOC_SP_Cajamar", count: 3 }] }],
        socStations: [{ name: "SOC_SP_Cajamar", count: 3 }],
        history: [{ date: "2026-10-14", packageCode: "AV1", situation: "Recebido" }],
    });
    Object.assign(damage.losses, {
        monthIndex: 9, year: 2026, sourceFileName: "avarias.xlsx", sourceSheetName: "Histórico de Avarias e Perdas",
        days: [{ date: "2026-10-15", underReview: 4, confirmedLosses: 2, returnedPackages: 1,
            recoveryDone: 2, recoveryNotDone: 1, recoveryInvalidId: 1, recoveryUninformed: 2 }],
        history: [{ date: "2026-10-15", packageCode: "BRL1", situation: "Lost" }],
    });
    payload.reports.parcel = {
        rows: [
            { trackingNumber: "BRP1", countType: "Backlog", expected: "Y", operator: "[ops1]ANA", scannedStatus: "LMHub_Received" },
            { trackingNumber: "BRP2", countType: "Missing", expected: "Y" },
            { trackingNumber: "BRP3", countType: "Exception", expected: "N", operator: "[ops1]ANA", scannedStatus: "LMHub_Received" },
        ],
        sourceFileName: "parcel.csv", activeFilter: "exception", operatorKindOverrides: { "[ops1]ana": true },
    };
    payload.reports.reverse = { transfers: [{
        to: "TO1", destination: "SOC_SP_Cajamar", completedAt: "2026-10-15 08:00:00", sourceFileName: "reversa.csv",
        totalOrders: 3, scannedOrders: 3,
        quantities: { return: 2, missorted: 1, liquidate: 0, confiscated: 0 },
        packages: { return: ["BRR1", "BRR2"], missorted: ["BRR3"], liquidate: [], confiscated: [] },
    }] };
    reportManager.importSession(payload.reports);
    restoreReportContext(payload.context);
    importDashboardSettings(payload.settings, { applyProfileToReports: false });
    return createReportSessionPayload();
}

function createSessionPayload() {
    return {
        schema:
            REPORT_SESSION_SCHEMA,

        version:
            REPORT_SESSION_VERSION,

        createdAt:
            "2026-10-15T12:00:00.000Z",

        reports: {
            planning: {
                lhs: [],
                vehicleCounts: {},
                collectionPool: {},
            },

            receipt: {
                operators: [],
                linehaul: {
                    linehauls: [],
                },
            },

            expedition: {
                routes: [],
                errorStreets: [],
                excludedOperatorKeys: [],
                errorTotals: {},
                streetGuardians: {},
            },

            "losses-rate": {
                activeMonth: 9,
                year: 2026,
                months:
                    Array.from(
                        {
                            length: 12,
                        },
                        function () {
                            return {
                                moved: null,
                                possibleLosses: null,
                                lost: null,
                                damage: null,
                            };
                        },
                    ),
            },
        },
    };
}

test(
    "salva e lê a Taxa de Perdas no formato atual, sem identificação legada",
    function () {
        const payload =
            createSessionPayload();

        const source =
            serializeReportSession(
                payload,
            );

        assert.deepEqual(
            parseReportSession(
                source,
            ),
            payload,
        );
    },
);

test("arquivo salvo restaura os sete relatórios, incluindo avarias, perdas, Parcel e Reversa", t => {
    const rendered = registerReports(t);
    const original = populateMissingReports();
    const expectedIds = ["planning", "receipt", "expedition", "losses-rate", "damage-and-losses", "parcel", "reverse"];
    assert.deepEqual(REPORT_SESSION_IDS, expectedIds);
    assert.deepEqual(Object.keys(original.reports), expectedIds);
    assert.equal(original.reports.parcel.operatorKindOverrides["[ops1]ana"], true);
    assert.equal(original.reports["damage-and-losses"].losses.days[0].confirmedLosses, 2);
    const saved = parseReportSession(serializeReportSession(original));
    for (const report of reportModules) if (report.id !== "overall-analysis") report.reset();
    restoreReportContext({ window: "AM", plannedVolume: 1 });
    importDashboardSettings({ ...original.settings, theme: "blue" }, { applyProfileToReports: false });
    assert.equal(restoreReportSession(saved), true);
    const restored = createReportSessionPayload();
    assert.deepEqual(restored.reports, original.reports);
    assert.deepEqual(restored.context, original.context);
    assert.deepEqual(restored.settings, original.settings);
    assert.deepEqual(restoredEvents.at(-1).detail.reportIds, expectedIds);
    assert.ok(rendered.includes("overall-analysis"));
});

test("arquivo v1 antigo com quatro relatórios continua legível sem limpar os relatórios ausentes", t => {
    registerReports(t);
    const current = populateMissingReports();
    const legacy = parseReportSession(serializeReportSession(createSessionPayload()));
    assert.equal(restoreReportSession(legacy), true);
    const restored = createReportSessionPayload();
    for (const id of ["damage-and-losses", "parcel", "reverse"]) {
        assert.deepEqual(restored.reports[id], current.reports[id]);
    }
    assert.deepEqual(restoredEvents.at(-1).detail.reportIds, ["planning", "receipt", "expedition", "losses-rate"]);
});

test("cópia guardada na aba com Análise Geral continua restaurando todos os dados", t => {
    registerReports(t);
    const original = populateMissingReports();
    const cached = parseReportSession(serializeReportSession({
        ...original, reports: reportManager.exportSession(),
    }));
    for (const report of reportModules) if (report.id !== "overall-analysis") report.reset();
    restoreReportSession(cached, { includeAllReports: true });
    assert.deepEqual(createReportSessionPayload().reports, original.reports);
    assert.deepEqual(getReportContext(), original.context);
    assert.ok(restoredEvents.at(-1).detail.reportIds.includes("overall-analysis"));
});

test("valida dados adicionais antes de alterar os relatórios da sessão", t => {
    registerReports(t);
    const original = populateMissingReports();
    for (const [id, report, message] of [
        ["damage-and-losses", { days: {} }, /Avarias e Perdas/],
        ["damage-and-losses", { days: [], losses: { days: null } }, /Avarias e Perdas/],
        ["parcel", { rows: null }, /Parcel Sweeper/],
        ["parcel", { rows: [], operatorKindOverrides: { ana: "sim" } }, /Parcel Sweeper/],
        ["reverse", { transfers: [{ quantities: null }] }, /Reversa/],
        ["reverse", { transfers: [{ quantities: {}, packages: { return: "BRR1" } }] }, /Reversa/],
    ]) {
        const invalid = structuredClone(original);
        invalid.reports[id] = report;
        assert.throws(() => restoreReportSession(invalid), message);
        assert.deepEqual(createReportSessionPayload().reports, original.reports);
    }
    for (const id of ["damage-and-losses", "parcel", "reverse"]) {
        const invalid = structuredClone(original);
        invalid.reports[id] = null;
        assert.throws(() => validateReportSessionPayload(invalid), /dados válidos/);
    }
});

test("falha ao restaurar Reversa reverte também Parcel, avarias, perdas e configurações", t => {
    registerReports(t);
    const original = populateMissingReports();
    const incoming = structuredClone(original);
    incoming.context.window = "PM1";
    incoming.settings.theme = "green";
    incoming.reports.parcel.rows = [];
    incoming.reports["damage-and-losses"].days = [];
    incoming.reports["damage-and-losses"].losses.days = [];
    const reverse = reportManager.get("reverse");
    const importSession = reverse.importSession;
    let first = true;
    reverse.importSession = data => {
        if (first) { first = false; throw new Error("Falha na Reversa"); }
        return importSession(data);
    };
    assert.throws(() => restoreReportSession(incoming), /Falha na Reversa/);
    const restored = createReportSessionPayload();
    assert.deepEqual(restored.reports, original.reports);
    assert.deepEqual(restored.context, original.context);
    assert.deepEqual(restored.settings, original.settings);
});

test("falha na renderização final reverte os dados e as preferências já aplicados", t => {
    registerReports(t);
    const original = populateMissingReports();
    const incoming = structuredClone(original);
    incoming.settings.theme = "green";
    incoming.context.window = "PM1";
    incoming.reports.parcel.rows = [];
    incoming.reports["damage-and-losses"].days = [];
    incoming.reports["damage-and-losses"].losses.days = [];
    incoming.reports.reverse.transfers = [];
    const overall = reportManager.get("overall-analysis");
    const render = overall.render;
    let first = true;
    overall.render = () => {
        if (first) {
            first = false;
            assert.equal(exportDashboardSettings().theme, "green");
            assert.equal(getReportContext().window, "PM1");
            throw new Error("Falha no gráfico");
        }
        return render();
    };
    assert.throws(() => restoreReportSession(incoming), /Falha no gráfico/);
    assert.deepEqual(createReportSessionPayload().reports, original.reports);
    assert.deepEqual(exportDashboardSettings(), original.settings);
    assert.deepEqual(getReportContext(), original.context);
});

test("restaurar configurações da sessão preserva analista e janela dos campos operacionais", t => {
    registerReports(t);
    const original = populateMissingReports();
    original.settings.profile = { ...original.settings.profile, name: "Perfil Padrão", shift: "AM" };
    const getElementById = document.getElementById;
    document.getElementById = id => id === "reportWindowInput" ? new TestElement() : null;
    t.after(() => { document.getElementById = getElementById; });
    restoreReportSession(original);
    assert.equal(getReportContext().window, "PM2");
    assert.equal(getReportContext().analyst, "Ana Silva");
    assert.equal(exportDashboardSettings().profile.name, "Perfil Padrão");
});

test(
    "continua rejeitando histórico da Taxa de Perdas incompleto",
    function () {
        const payload =
            createSessionPayload();

        payload.reports[
            "losses-rate"
        ].months.pop();

        assert.throws(
            function () {
                serializeReportSession(
                    payload,
                );
            },
            {
                name: "TypeError",
                message:
                    "Os dados da Taxa de Perdas são inválidos.",
            },
        );
    },
);
