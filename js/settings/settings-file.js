const DASHBOARD_SETTINGS_SCHEMA = "dashboard-settings";
const DASHBOARD_SETTINGS_VERSION = 1;
const MAX_SETTINGS_FILE_SIZE = 50 * 1024 * 1024;

// Os arquivos .js contêm apenas uma atribuição de JSON. Nunca executamos seu código.
function parseDashboardDataFile(source) {
    const normalized = String(source ?? "").replace(/^\uFEFF/, "").trim();
    const assignment = normalized.match(/^const\s+(DASHBOARD_SETTINGS|DASHBOARD_REPORT_SESSION)\s*=\s*([\s\S]*);\s*$/);
    if (!assignment) throw new TypeError("O arquivo não segue o formato de configurações ou sessão esperado.");
    try {
        return JSON.parse(assignment[2]);
    } catch {
        throw new TypeError("O conteúdo do arquivo está corrompido.");
    }
}

function parseDashboardSettingsFile(source) {
    const payload = parseDashboardDataFile(source);
    if (!payload || typeof payload !== "object" ||
        ![DASHBOARD_SETTINGS_SCHEMA, "dashboard-report-session"].includes(payload.schema) ||
        payload.version !== DASHBOARD_SETTINGS_VERSION || !payload.settings) {
        throw new TypeError("O arquivo não contém configurações compatíveis com este dashboard.");
    }
    return payload.settings;
}

function serializeDashboardSettingsFile(settings, date = new Date()) {
    const payload = {
        schema: DASHBOARD_SETTINGS_SCHEMA,
        version: DASHBOARD_SETTINGS_VERSION,
        createdAt: date.toISOString(),
        settings,
    };
    return `const DASHBOARD_SETTINGS = ${JSON.stringify(payload, null, 4)
        .replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029")};\n`;
}

async function readDashboardSettingsFile(file) {
    if (!file || typeof file.text !== "function" || !/\.js$/i.test(file.name)) {
        throw new TypeError("Selecione um arquivo .js de configurações ou sessão.");
    }
    if (file.size > MAX_SETTINGS_FILE_SIZE) {
        throw new TypeError("O arquivo ultrapassa o limite de 50 MB.");
    }
    return file.text();
}

export {
    DASHBOARD_SETTINGS_SCHEMA,
    parseDashboardDataFile,
    parseDashboardSettingsFile,
    readDashboardSettingsFile,
    serializeDashboardSettingsFile,
};
