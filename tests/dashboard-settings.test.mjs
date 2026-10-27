import assert from "node:assert/strict";
import { test } from "node:test";
import {
    createDashboardSettingsFileName,
    parseDashboardSettingsFile, readDashboardSettingsFile, serializeDashboardSettingsFile,
} from "../js/settings/settings-file.js";
import {
    DASHBOARD_SETTINGS_SESSION_KEY, readDashboardSettingsFromSession, saveDashboardSettingsToSession,
    exportDashboardSettings, importDashboardSettings, validateDashboardSettings,
} from "../js/spreadsheets/load-spreadsheets.js";
import {
    getReportContext, restoreReportContext, updateReportContextField,
} from "../js/reports/core/report-context.js";

const settings = {
    profile: { name: "Analista de teste", email: "analista@example.com", shift: "PM2", icon: "owl" },
    spreadsheets: [{ link: "https://docs.google.com/spreadsheets/d/test/", menuName: "Minha Planilha", visible: true }],
    externalLinks: { reverseForm: "https://example.com/reversa", packRecovery: "",
        damageApp: "https://example.com/avarias", collectionApp: "" },
    footerVisibility: { reverseForm: false, packRecovery: true, damageApp: false, collectionApp: true },
};

test("nome do arquivo inclui o analista quando escolhido e dispensa a data", () => {
    assert.equal(createDashboardSettingsFileName(), "configurações-dashboard.js");
    assert.equal(createDashboardSettingsFileName("   "), "configurações-dashboard.js");
    assert.equal(createDashboardSettingsFileName("Caio"), "Caio-configurações-dashboard.js");
    assert.equal(createDashboardSettingsFileName("  João da Silva  "), "João da Silva-configurações-dashboard.js");
    assert.equal(createDashboardSettingsFileName("Caio/Teste:*?"), "CaioTeste-configurações-dashboard.js");
});

test("arquivo preserva perfil, nomes, links e escolhas do footer sem executar código", () => {
    assert.deepEqual(parseDashboardSettingsFile(serializeDashboardSettingsFile(settings)), settings);
    assert.throws(() => parseDashboardSettingsFile(serializeDashboardSettingsFile(settings) + "alert(1);"));
    assert.throws(() => parseDashboardSettingsFile('const DASHBOARD_SETTINGS = {"version":99};'));
});

test("tema acompanha as configurações no arquivo e na sessão; arquivos antigos usam o padrão", () => {
    const values = new Map();
    const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
    for (const theme of ["default", "red", "blue", "green", "pink", "purple"]) {
        importDashboardSettings({ ...settings, theme });
        const snapshot = exportDashboardSettings();
        saveDashboardSettingsToSession(snapshot, storage);
        assert.equal(parseDashboardSettingsFile(serializeDashboardSettingsFile(snapshot)).theme, theme);
        assert.equal(readDashboardSettingsFromSession(storage).theme, theme);
    }
    importDashboardSettings(settings);
    assert.equal(exportDashboardSettings().theme, "default");
});

test("cópia na sessão preserva os mesmos dados do arquivo e fica independente das edições", () => {
    importDashboardSettings(settings);
    const snapshot = exportDashboardSettings();
    const values = new Map();
    const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
    saveDashboardSettingsToSession(snapshot, storage);
    const fileSettings = parseDashboardSettingsFile(serializeDashboardSettingsFile(snapshot));
    assert.deepEqual(JSON.parse(values.get(DASHBOARD_SETTINGS_SESSION_KEY)), fileSettings);
    snapshot.profile.name = "Rascunho não salvo";
    assert.deepEqual(readDashboardSettingsFromSession(storage), fileSettings);
});

test("sessão inválida usa os padrões e falha de gravação não altera a cópia anterior", t => {
    t.mock.method(console, "warn", () => {});
    assert.equal(readDashboardSettingsFromSession({ getItem: () => "conteúdo inválido" }), null);
    assert.equal(readDashboardSettingsFromSession({ getItem: () => JSON.stringify({ spreadsheets: [] }) }), null);
    const storage = { setItem() { throw new Error("QuotaExceededError"); } };
    assert.throws(() => saveDashboardSettingsToSession(settings, storage), /QuotaExceededError/);
});

test("importação antiga mantém o perfil atual e usa footer visível por padrão", () => {
    importDashboardSettings(settings);
    const legacy = structuredClone(settings);
    delete legacy.profile;
    delete legacy.footerVisibility;
    assert.equal(validateDashboardSettings(legacy), true);
    const session = `const DASHBOARD_REPORT_SESSION = ${JSON.stringify({
        schema: "dashboard-report-session", version: 1, settings: legacy,
    })};`;
    importDashboardSettings(parseDashboardSettingsFile(session));
    const current = exportDashboardSettings();
    assert.deepEqual(current.profile, settings.profile);
    assert.equal(current.spreadsheets.length, 20);
    assert.equal(current.spreadsheets[0].menuName, "Minha Planilha");
    assert.ok(Object.values(current.footerVisibility).every(Boolean));
});

test("perfil e visibilidade inválidos são rejeitados antes de alterar o estado", () => {
    const previous = exportDashboardSettings();
    for (const invalid of [
        { ...settings, profile: { ...settings.profile, icon: "../../arquivo.svg" } },
        { ...settings, profile: { ...settings.profile, shift: "XX" } },
        { ...settings, footerVisibility: { damageApp: "false" } },
        { ...settings, theme: "tema-desconhecido" },
        { ...settings, theme: { name: "purple" } },
    ]) {
        assert.throws(() => importDashboardSettings(invalid), TypeError);
        assert.deepEqual(exportDashboardSettings(), previous);
    }
});

test("importação limita tamanho e extensão dos arquivos", async () => {
    await assert.rejects(readDashboardSettingsFile({ name: "settings.html", size: 1, text: async () => "" }));
    await assert.rejects(readDashboardSettingsFile({ name: "settings.js", size: 51 * 1024 * 1024, text: async () => "" }));
});

test("capacidade temporária continua em 20.000 ao restaurar sessões antigas", () => {
    restoreReportContext({ window: "PM1", analyst: "Teste", plannedVolume: 5000, shiftCapacity: 30000 });
    assert.equal(getReportContext().shiftCapacity, 20000);
    updateReportContextField("shiftCapacity", "1000");
    assert.equal(getReportContext().shiftCapacity, 20000);
    restoreReportContext({});
    assert.equal(getReportContext().shiftCapacity, 20000);
});
