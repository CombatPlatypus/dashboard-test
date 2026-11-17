import {
    reportManager,
} from "./core/report-manager.js";

import {
    setReportNotification,
} from "./report-notifications.js";

import {
    downloadReportBlob,
} from "./export.js";

import {
    getReportContext,
    restoreReportContext,
    subscribeReportContext,
} from "./core/report-context.js";
import { batchReportUpdates } from "./core/report-updates.js";
import { subscribePlanningState } from "./planning/state.js";
import { subscribeReceiptState } from "./receipt/state.js";
import { subscribeReceiptLinehaulState } from "./receipt/linehaul-state.js";
import { subscribeExpeditionState } from "./expedition/state.js";
import { subscribeEmployeeRankingHistory } from "./employee-ranking/state.js";
import { subscribeLossesRateState } from "./losses-rate/state.js";
import { subscribeDamageAndLossesState } from "./damage-and-losses/state.js";
import { isValidOffPackagesData, subscribeLossesState } from "./damage-and-losses/losses-state.js";
import { getParcelSnapshot, hasParcelRowsChanged, subscribeParcelState } from "./parcel-sweeper/state.js";
import { subscribeReverseState } from "./reverse/state.js";

import {
    exportDashboardSettings,
    importDashboardSettings,
    readDashboardSettingsFromSession,
    saveDashboardSettingsToSession,
    validateDashboardSettings,
} from "../spreadsheets/load-spreadsheets.js";
import {
    DASHBOARD_SETTINGS_SCHEMA,
    parseDashboardDataFile,
    parseDashboardSettingsFile,
} from "../settings/settings-file.js";

const REPORT_SESSION_SCHEMA =
    "dashboard-report-session";

const LEGACY_REPORT_SESSION_STORAGE_KEY = "dashboard-report-session-v1";
const REPORT_SESSION_INDEX_KEY = "dashboard-report-session-v2";
const REPORT_SESSION_PART_PREFIX = "dashboard-report-state-v2";
const REPORT_CONTEXT_STORAGE_KEY = "dashboard-report-context-v1";

const REPORT_SESSION_VERSION = 1;

const REPORT_SESSION_VARIABLE =
    "DASHBOARD_REPORT_SESSION";

const REPORT_SESSION_MAX_FILE_SIZE =
    50 * 1024 * 1024;

// Os arquivos v1 antigos possuem apenas estes quatro relatórios.
const REQUIRED_REPORT_SESSION_IDS =
    Object.freeze([
        "planning",
        "receipt",
        "expedition",
        "losses-rate",
    ]);

const REPORT_SESSION_IDS = Object.freeze([
    ...REQUIRED_REPORT_SESSION_IDS,
    "damage-and-losses",
    "parcel",
    "reverse",
    "overall-analysis",
]);

const REPORT_SESSION_FEEDBACK_ICONS =
    Object.freeze({
        info:
            "images/geral-icons/bell-icon.svg",

        success:
            "images/geral-icons/success-icon.svg",

        warning:
            "images/geral-icons/alert-icon.svg",

        error:
            "images/geral-icons/error-icon.svg",
    });

const REPORT_SESSION_FEEDBACK_DURATION =
    6000;

let reportSessionInitialized = false;
let pendingReportSessionSave = null;
let reportSessionSaveScheduled = false;
let savedReportSessionIndex = null;
let restoreUsedLegacyStorage = false;
let reportSessionStorageRevision = 0;
let reportSessionStorageWarningShown = false;

let reportSessionFeedbackTimeout =
    null;

let reportSessionVisibilityObserver =
    null;

/* VALIDA UM OBJETO SIMPLES */

function isSessionObject(
    value,
) {
    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
    );
}

function isSessionObjectList(
    value,
) {
    return (
        Array.isArray(value) &&
        value.every(
            isSessionObject,
        )
    );
}

function isValidSessionContext(context) {
    return isSessionObject(context) &&
        typeof context.window === "string" &&
        (context.analyst === undefined || typeof context.analyst === "string") &&
        ["plannedVolume", "collaboratorCount", "shiftCapacity"].every(field => {
            const value = context[field];
            return value == null || (Number.isSafeInteger(value) && value >= 0);
        });
}

/* OBTÉM OS RELATÓRIOS INCLUÍDOS NO ARQUIVO DE SESSÃO */

function getSessionReport(
    reportId,
) {
    const report =
        reportManager.get(
            reportId,
        );

    if (!report) {
        throw new Error(
            `O relatório ${reportId} não está disponível.`,
        );
    }

    return report;
}

function exportSessionReports() {
    return Object.fromEntries(
        REPORT_SESSION_IDS.map(
            function (reportId) {
                const report =
                    getSessionReport(
                        reportId,
                    );

                return [
                    reportId,
                    report.exportSession(),
                ];
            },
        ),
    );
}

/* CRIA E VALIDA O CONTEÚDO DA SESSÃO */

function createReportSessionPayload({ includeAllReports = false } = {}) {
    return {
        schema:
            REPORT_SESSION_SCHEMA,

        version:
            REPORT_SESSION_VERSION,

        createdAt:
            new Date().toISOString(),

        context:
            getReportContext(),

        settings:
            exportDashboardSettings(),

        reports:
            includeAllReports ? reportManager.exportSession() : exportSessionReports(),
    };
}

const validOccurrenceDays = state => isSessionObject(state) && isSessionObjectList(state.days) &&
    (state.history === undefined || isSessionObjectList(state.history));

const sessionReportValidators = {
    planning: ["do Planejamento", state =>
        isSessionObjectList(state.lhs) && state.lhs.every(linehaul => isSessionObjectList(linehaul.tos)) &&
        isSessionObject(state.vehicleCounts) && isSessionObject(state.collectionPool)],
    receipt: ["do Processamento", state =>
        isSessionObjectList(state.operators) && isSessionObject(state.linehaul) && isSessionObjectList(state.linehaul.linehauls)],
    expedition: ["da Expedição", state =>
        isSessionObjectList(state.routes) && isSessionObjectList(state.errorStreets) && Array.isArray(state.excludedOperatorKeys) &&
        isSessionObject(state.errorTotals) && isSessionObject(state.streetGuardians)],
    "losses-rate": ["da Taxa de Perdas", state => isSessionObjectList(state.months) && state.months.length === 12],
    "damage-and-losses": ["de Avarias e Perdas", state => {
        const damage = state.damage || state;
        return validOccurrenceDays(damage) &&
            (damage.socStations === undefined || isSessionObjectList(damage.socStations)) &&
            (state.losses === undefined || (validOccurrenceDays(state.losses) && isValidOffPackagesData(state.losses.offPackages)));
    }],
    parcel: ["do Parcel Sweeper", state => {
        const overrides = state.operatorKindOverrides;
        return isSessionObjectList(state.rows) && (overrides === undefined ||
            (isSessionObject(overrides) && Object.values(overrides).every(value => typeof value === "boolean")));
    }],
    reverse: ["da Reversa", state => isSessionObjectList(state.transfers) && state.transfers.every(transfer => {
        if (!isSessionObject(transfer.quantities)) return false;
        return transfer.packages === undefined || (isSessionObject(transfer.packages) && Object.values(transfer.packages)
            .every(codes => Array.isArray(codes) && codes.every(code => typeof code === "string")));
    })],
    "overall-analysis": ["do Ranking de Colaboradores", state => state.employeeRanking === undefined ||
        (isSessionObjectList(state.employeeRanking) && state.employeeRanking.every(row =>
            typeof row.operator === "string" && row.operator.trim() !== "" &&
            Number.isSafeInteger(row.routesChecked) && row.routesChecked >= 0 &&
            Number.isSafeInteger(row.routesWithDuration) && row.routesWithDuration >= 0 &&
            row.routesWithDuration <= row.routesChecked &&
            Number.isFinite(row.totalDurationSeconds) && row.totalDurationSeconds >= 0))],
};

function validateSessionReport(reportId, state) {
    if (!isSessionObject(state)) {
        throw new TypeError(`A sessão não possui dados válidos para ${reportId}.`);
    }
    const [label, isValid] = sessionReportValidators[reportId];
    if (!isValid(state)) {
        throw new TypeError(`Os dados ${label} são inválidos.`);
    }
}

function validateReportSessionPayload(
    payload,
) {
    if (!isSessionObject(payload)) {
        throw new TypeError(
            "O arquivo não possui uma sessão válida.",
        );
    }

    if (
        payload.schema !==
        REPORT_SESSION_SCHEMA
    ) {
        throw new TypeError(
            "O arquivo não pertence às sessões deste dashboard.",
        );
    }

    if (
        payload.version !==
        REPORT_SESSION_VERSION
    ) {
        throw new TypeError(
            "A versão do arquivo de sessão não é compatível.",
        );
    }

    if (
        typeof payload.createdAt !==
            "string" ||
        Number.isNaN(
            Date.parse(
                payload.createdAt,
            ),
        )
    ) {
        throw new TypeError(
            "A data da sessão é inválida.",
        );
    }

    if (!isSessionObject(payload.reports)) {
        throw new TypeError(
            "O arquivo não possui os dados dos relatórios.",
        );
    }

    if (
        payload.settings !== undefined
    ) {
        validateDashboardSettings(
            payload.settings,
        );
    }

    if (payload.context !== undefined && !isValidSessionContext(payload.context)) {
        throw new TypeError(
            "Os dados globais da sessão são inválidos.",
        );
    }

    for (const reportId of REPORT_SESSION_IDS) {
        const present = Object.hasOwn(payload.reports, reportId);
        if (present || REQUIRED_REPORT_SESSION_IDS.includes(reportId)) {
            validateSessionReport(reportId, present ? payload.reports[reportId] : undefined);
        }
    }
    return true;
}

/* GERA UM JS QUE CONTÉM SOMENTE DADOS JSON */

function serializeReportSession(
    payload =
        createReportSessionPayload(),
) {
    validateReportSessionPayload(
        payload,
    );

    const serializedPayload =
        JSON.stringify(
            payload,
            null,
            4,
        )
            .replace(
                /\u2028/g,
                "\\u2028",
            )
            .replace(
                /\u2029/g,
                "\\u2029",
            );

    return (
        `const ${REPORT_SESSION_VARIABLE} = ` +
        `${serializedPayload};\n`
    );
}

/* LÊ O JSON DO ARQUIVO SEM EXECUTAR O JAVASCRIPT */

function parseReportSession(
    source,
) {
    const normalizedSource =
        String(
            source ?? "",
        ).replace(
            /^\uFEFF/,
            "",
        );

    const assignmentPattern =
        new RegExp(
            "^\\s*const\\s+" +
            REPORT_SESSION_VARIABLE +
            "\\s*=\\s*([\\s\\S]*);\\s*$",
        );

    const assignmentMatch =
        normalizedSource.match(
            assignmentPattern,
        );

    if (!assignmentMatch) {
        throw new TypeError(
            "O arquivo não segue o formato de sessão esperado.",
        );
    }

    let payload;

    try {
        payload = JSON.parse(
            assignmentMatch[1],
        );
    } catch (error) {
        throw new TypeError(
            "O conteúdo da sessão está corrompido.",
        );
    }

    validateReportSessionPayload(
        payload,
    );

    return payload;
}

/* RESTAURA TODOS OS RELATÓRIOS COMO UMA ÚNICA OPERAÇÃO */

function selectSessionReports(
    reports,
) {
    return Object.fromEntries(
        REPORT_SESSION_IDS.filter(reportId => Object.prototype.hasOwnProperty.call(reports, reportId)).map(
            function (reportId) {
                return [
                    reportId,
                    reports[reportId],
                ];
            },
        ),
    );
}

function renderRestoredOverallAnalysis() {
    const overallAnalysis =
        reportManager.get(
            "overall-analysis",
        );

    if (overallAnalysis) {
        reportManager.render(
            "overall-analysis",
        );
    }
}

function restoreReportSession(
    payload,
    { includeAllReports = false } = {},
) {
    validateReportSessionPayload(
        payload,
    );

    const sessionReports = includeAllReports ? payload.reports : selectSessionReports(payload.reports);
    const previousReports = {};
    for (const reportId of Object.keys(sessionReports)) {
        const report = reportManager.get(reportId);
        if (report) previousReports[reportId] = report.exportSession();
    }

    const previousContext =
        getReportContext();

    const previousSettings =
        exportDashboardSettings();

    const sessionContext =
        payload.context ?? {
            window:
                payload.reports.receipt
                    .window ??
                payload.reports.expedition
                    .window ??
                "",
        };

    try {
        batchReportUpdates(() => {
            restoreReportContext(sessionContext);
            reportManager.importSession(sessionReports);
            if (payload.settings !== undefined) {
                importDashboardSettings(payload.settings, { applyProfileToReports: false });
            }
            renderRestoredOverallAnalysis();
        });
    } catch (error) {
        try {
            batchReportUpdates(() => {
                restoreReportContext(previousContext);
                reportManager.importSession(previousReports);
                importDashboardSettings(previousSettings, { applyProfileToReports: false });
                renderRestoredOverallAnalysis();
            });
        } catch (rollbackError) {
            console.error(
                "Não foi possível reverter a importação da sessão.",
                rollbackError,
            );
        }

        throw error;
    }

    document.dispatchEvent(
        new CustomEvent(
            "dashboard:session-restored",
            {
                detail: {
                    createdAt:
                        payload.createdAt,

                    reportIds: Object.keys(sessionReports).filter(reportId => reportManager.get(reportId)),
                },
            },
        ),
    );

    return true;
}

/* DOWNLOAD */

function createReportSessionFileName(
    date = new Date(),
) {
    const pad =
        function (value) {
            return String(value)
                .padStart(
                    2,
                    "0",
                );
        };

    const datePart = [
        date.getFullYear(),
        pad(
            date.getMonth() + 1,
        ),
        pad(
            date.getDate(),
        ),
    ].join("-");

    const timePart = [
        pad(
            date.getHours(),
        ),
        pad(
            date.getMinutes(),
        ),
        pad(
            date.getSeconds(),
        ),
    ].join("-");

    return (
        "sessao-dashboard-" +
        `${datePart}_${timePart}.js`
    );
}

function downloadReportSession(payload = createReportSessionPayload()) {
    const fileName =
        createReportSessionFileName();

    const fileContent =
        serializeReportSession(payload);

    const blob =
        new Blob(
            [fileContent],
            {
                type:
                    "text/javascript;charset=utf-8",
            },
        );

    downloadReportBlob(
        blob,
        fileName,
    );

    return fileName;
}

function reportSessionPartKey(reportId, revision) {
    return `${REPORT_SESSION_PART_PREFIX}:${reportId}:${revision}`;
}

function discardStoredPart(storage, key) {
    try {
        storage.removeItem(key);
    } catch (error) {
        console.warn("Não foi possível remover uma cópia antiga da sessão.", error);
    }
}

function saveReportSessionToStorage({ reportIds, contextChanged, parcelControlsChanged }) {
    const storage = window.sessionStorage;
    const ids = restoreUsedLegacyStorage ? REPORT_SESSION_IDS : [...reportIds];
    const previous = savedReportSessionIndex;
    const snapshots = ids.map(reportId => {
        const report = getSessionReport(reportId).exportSession();
        validateSessionReport(reportId, report);
        return [reportId, JSON.stringify(report)];
    });

    const onlyReportId = ids[0];
    const existingRevision = previous?.parts[onlyReportId];
    if (ids.length === 1 && existingRevision && !contextChanged && !parcelControlsChanged &&
        !(onlyReportId === "parcel" && previous.parcelControls)) {
        // A gravação de uma única parte já é atômica no sessionStorage e reutiliza o espaço atual.
        storage.setItem(reportSessionPartKey(onlyReportId, existingRevision), snapshots[0][1]);
        return;
    }

    const revision = reportSessionStorageRevision + 1;
    const parts = { ...previous?.parts };
    let parcelControls = previous?.parcelControls ?? null;
    if (ids.includes("parcel")) {
        parcelControls = null;
    } else if (parcelControlsChanged) {
        const { activeFilter, operatorKindOverrides } = getParcelSnapshot();
        parcelControls = { activeFilter, operatorKindOverrides };
    }
    const index = {
        storageRevision: revision,
        createdAt: new Date().toISOString(),
        context: getReportContext(),
        settings: exportDashboardSettings(),
        parts,
        parcelControls,
    };
    const staged = [];
    try {
        for (const [id, serialized] of snapshots) {
            const key = reportSessionPartKey(id, revision);
            storage.setItem(key, serialized);
            staged.push(key);
            parts[id] = revision;
        }
        // O índice passa a apontar para os novos dados somente após todas as partes estarem gravadas.
        storage.setItem(REPORT_SESSION_INDEX_KEY, JSON.stringify(index));
    } catch (error) {
        staged.forEach(key => discardStoredPart(storage, key));
        throw error;
    }

    savedReportSessionIndex = index;
    reportSessionStorageRevision = revision;
    for (const id of ids) {
        if (previous?.parts[id]) {
            discardStoredPart(storage, reportSessionPartKey(id, previous.parts[id]));
        }
    }
    if (restoreUsedLegacyStorage) {
        discardStoredPart(storage, LEGACY_REPORT_SESSION_STORAGE_KEY);
        restoreUsedLegacyStorage = false;
    }
}

function saveReportContextToStorage() {
    const { name, shift } = exportDashboardSettings().profile;
    const snapshot = {
        storageRevision: reportSessionStorageRevision,
        context: getReportContext(),
        profile: { name, shift },
    };
    window.sessionStorage.setItem(REPORT_CONTEXT_STORAGE_KEY, JSON.stringify(snapshot));
}

function persistPendingReportSessionSave() {
    reportSessionSaveScheduled = false;
    const pending = pendingReportSessionSave;
    if (!pending) return;

    if (pending.reportIds.size > 0 || pending.parcelControlsChanged) {
        saveReportSessionToStorage(pending);
    } else {
        saveReportContextToStorage();
    }
    pendingReportSessionSave = null;
    reportSessionStorageWarningShown = false;
}

function scheduleReportSessionSave({ reportId, contextChanged = false, parcelControlsChanged = false }) {
    const pending = pendingReportSessionSave ??= { reportIds: new Set(), contextChanged: false, parcelControlsChanged: false };
    if (reportId) pending.reportIds.add(reportId);
    pending.contextChanged ||= contextChanged;
    pending.parcelControlsChanged ||= parcelControlsChanged;
    if (reportSessionSaveScheduled) return;
    reportSessionSaveScheduled = true;

    // Uma operação pode notificar mais de um estado antes de terminar.
    queueMicrotask(() => {
        if (!reportSessionSaveScheduled) return;
        try {
            persistPendingReportSessionSave();
        } catch (error) {
            if (reportSessionStorageWarningShown) return;
            reportSessionStorageWarningShown = true;
            console.warn("Não foi possível guardar os relatórios na sessão da aba.", error);
            setReportSessionNotification({
                type: "warning",
                message: "As alterações dos relatórios não puderam ser guardadas nesta aba. Use Salvar sessão para baixar uma cópia.",
            });
        }
    });
}

function readStoredReportSession() {
    const storage = window.sessionStorage;
    const source = storage.getItem(REPORT_SESSION_INDEX_KEY);
    if (!source) {
        const legacy = storage.getItem(LEGACY_REPORT_SESSION_STORAGE_KEY);
        if (!legacy) return null;
        const payload = JSON.parse(legacy);
        validateReportSessionPayload(payload);
        restoreUsedLegacyStorage = true;
        return payload;
    }

    const index = JSON.parse(source);
    if (!isSessionObject(index?.parts) || !isValidSessionContext(index.context) ||
        !Number.isSafeInteger(index.storageRevision) || index.storageRevision < 1) {
        throw new TypeError("O índice da sessão de relatórios é inválido.");
    }

    const reports = {};
    for (const [id, revision] of Object.entries(index.parts)) {
        if (!REPORT_SESSION_IDS.includes(id) || !Number.isSafeInteger(revision) || revision < 1 || revision > index.storageRevision) {
            throw new TypeError("A versão de um relatório salvo na aba é inválida.");
        }
        const data = storage.getItem(reportSessionPartKey(id, revision));
        if (data === null) throw new TypeError(`A cópia de ${id} está ausente na sessão da aba.`);
        reports[id] = JSON.parse(data);
    }
    for (const id of REQUIRED_REPORT_SESSION_IDS) {
        if (!Object.hasOwn(reports, id)) reports[id] = getSessionReport(id).exportSession();
    }
    if (index.parcelControls) {
        const { activeFilter, operatorKindOverrides } = index.parcelControls;
        reports.parcel = { ...(reports.parcel ?? getSessionReport("parcel").exportSession()), activeFilter, operatorKindOverrides };
    }

    const payload = {
        schema: REPORT_SESSION_SCHEMA,
        version: REPORT_SESSION_VERSION,
        createdAt: index.createdAt,
        context: index.context,
        settings: index.settings,
        reports,
        storageRevision: index.storageRevision,
    };
    validateReportSessionPayload(payload);
    savedReportSessionIndex = index;
    return payload;
}

function readSavedReportContext() {
    const source = window.sessionStorage.getItem(REPORT_CONTEXT_STORAGE_KEY);
    if (!source) return null;

    try {
        const snapshot = JSON.parse(source);
        if (snapshot?.storageRevision === reportSessionStorageRevision &&
            isValidSessionContext(snapshot.context)) {
            return snapshot;
        }
    } catch {
        // Um contexto inválido não impede recuperar os relatórios do snapshot completo.
    }
    return null;
}

function restoreSavedReportSession() {
    const payload = readStoredReportSession();
    const revision = payload?.storageRevision;
    reportSessionStorageRevision = Number.isSafeInteger(revision) && revision >= 0 ? revision : 0;
    const savedContext = readSavedReportContext();
    if (!payload && !savedContext) return false;

    const savedSettings = readDashboardSettingsFromSession();

    // Restaura os campos operacionais sem substituí-los pelos padrões do perfil.
    if (payload) {
        const context = savedContext?.context ?? payload.context;
        // O importador de Processamento aceita expectedVolume como fallback de sessões legadas.
        const reports = savedContext || savedReportSessionIndex ? {
            ...payload.reports,
            receipt: { ...payload.reports.receipt, expectedVolume: context.plannedVolume },
        } : payload.reports;
        restoreReportSession({ ...payload, reports, context, settings: undefined }, { includeAllReports: true });
    } else {
        restoreReportContext(savedContext.context);
    }
    const settings = savedSettings ?? payload?.settings;
    if (settings) {
        const previousProfile = savedContext?.profile ?? payload?.settings?.profile;
        // Alterar apenas a aparência ou os links não substitui os campos operacionais salvos.
        const profileChanged = savedSettings !== null && (
            savedSettings.profile.name !== (previousProfile?.name ?? "") ||
            savedSettings.profile.shift !== (previousProfile?.shift ?? "AM")
        );
        importDashboardSettings(settings, { applyProfileToReports: profileChanged });
    }
    setReportSessionNotification({ type: "success", message: "Relatórios recuperados da sessão desta aba." });
    return true;
}

/* IMPORTAÇÃO */

async function readReportSessionFile(
    file,
) {
    if (
        !file ||
        typeof file.text !==
            "function"
    ) {
        throw new TypeError(
            "Selecione um arquivo de sessão.",
        );
    }

    if (
        !String(file.name)
            .toLowerCase()
            .endsWith(".js")
    ) {
        throw new TypeError(
            "A sessão deve estar em um arquivo .js.",
        );
    }

    if (
        file.size >
        REPORT_SESSION_MAX_FILE_SIZE
    ) {
        throw new TypeError(
            "O arquivo de sessão ultrapassa o limite de 50 MB.",
        );
    }

    return file.text();
}

function setReportSessionBusy(
    importButton,
    isBusy,
) {
    importButton.disabled =
        isBusy;

    importButton.setAttribute(
        "aria-busy",
        isBusy
            ? "true"
            : "false",
    );
}

/* EXIBE O RESULTADO MESMO FORA DA ABA DE RELATÓRIOS */

function hideReportSessionFeedback() {
    const container =
        document.getElementById(
            "reportSessionFeedback",
        );

    if (
        container instanceof
            HTMLElement
    ) {
        container.hidden = true;
    }

    window.clearTimeout(
        reportSessionFeedbackTimeout,
    );

    reportSessionFeedbackTimeout =
        null;
}

function setReportSessionNotification({
    type = "info",
    message,
} = {}) {
    setReportNotification({
        type,
        message,
    });

    const container =
        document.getElementById(
            "reportSessionFeedback",
        );

    const icon =
        document.getElementById(
            "reportSessionFeedbackIcon",
        );

    const text =
        document.getElementById(
            "reportSessionFeedbackText",
        );

    if (
        !(container instanceof
            HTMLElement) ||
        !(icon instanceof
            HTMLImageElement) ||
        !(text instanceof
            HTMLElement)
    ) {
        return false;
    }

    const reportsPanel =
        document.getElementById(
            "reports",
        );

    if (
        reportsPanel instanceof
            HTMLElement &&
        reportsPanel.classList
            .contains(
                "is-active",
            )
    ) {
        hideReportSessionFeedback();

        return true;
    }

    const normalizedType =
        Object.prototype
            .hasOwnProperty.call(
                REPORT_SESSION_FEEDBACK_ICONS,
                type,
            )
            ? type
            : "info";

    container.dataset
        .notificationType =
            normalizedType;

    icon.src =
        REPORT_SESSION_FEEDBACK_ICONS[
            normalizedType
        ];

    text.textContent =
        String(
            message ?? "",
        );

    container.hidden = false;

    window.clearTimeout(
        reportSessionFeedbackTimeout,
    );

    reportSessionFeedbackTimeout =
        normalizedType === "info"
            ? null
            : window.setTimeout(
                function () {
                    hideReportSessionFeedback();
                },
                REPORT_SESSION_FEEDBACK_DURATION,
            );

    return true;
}

/* INICIALIZA OS BOTÕES DO MENU */

function initializeReportSession() {
    if (reportSessionInitialized) {
        return true;
    }

    const saveButton =
        document.getElementById(
            "reportDownloadButton",
        );

    const importButton =
        document.getElementById(
            "reportImportButton",
        );

    const fileInput =
        document.getElementById(
            "reportSessionFileInput",
        );

    if (
        !(saveButton instanceof
            HTMLButtonElement) ||
        !(importButton instanceof
            HTMLButtonElement) ||
        !(fileInput instanceof
            HTMLInputElement)
    ) {
        console.error(
            "Não foi possível localizar os controles da sessão.",
        );

        return false;
    }

    const reportsPanel =
        document.getElementById(
            "reports",
        );

    reportSessionVisibilityObserver
        ?.disconnect();

    if (
        reportsPanel instanceof
            HTMLElement
    ) {
        reportSessionVisibilityObserver =
            new MutationObserver(
                function () {
                    if (
                        reportsPanel
                            .classList
                            .contains(
                                "is-active",
                            )
                    ) {
                        hideReportSessionFeedback();
                    }
                },
            );

        reportSessionVisibilityObserver
            .observe(
                reportsPanel,
                {
                    attributes: true,
                    attributeFilter: [
                        "class",
                    ],
                },
            );
    }

    saveButton.addEventListener(
        "click",
        function () {
            try {
                const fileName =
                    downloadReportSession();

                setReportSessionNotification({
                    type: "success",
                    message:
                        `Sessão salva em ${fileName}.`,
                });
            } catch (error) {
                console.error(
                    "Não foi possível salvar a sessão.",
                    error,
                );

                setReportSessionNotification({
                    type: "error",
                    message:
                        "Não foi possível salvar a sessão dos relatórios.",
                });
            }
        },
    );

    importButton.addEventListener(
        "click",
        function () {
            fileInput.click();
        },
    );

    fileInput.addEventListener(
        "change",
        async function () {
            const file =
                fileInput.files?.[0];

            fileInput.value = "";

            if (!file) {
                return;
            }

            setReportSessionBusy(
                importButton,
                true,
            );

            setReportSessionNotification({
                type: "info",
                message:
                    `Restaurando a sessão ${file.name}...`,
            });

            try {
                const source =
                    await readReportSessionFile(
                        file,
                    );

                const data = parseDashboardDataFile(source);
                const settingsOnly = data?.schema === DASHBOARD_SETTINGS_SCHEMA;
                const pendingBeforeImport = pendingReportSessionSave ? {
                    ...pendingReportSessionSave, reportIds: new Set(pendingReportSessionSave.reportIds),
                } : null;
                try {
                    if (settingsOnly) {
                        importDashboardSettings(parseDashboardSettingsFile(source));
                    } else {
                        const payload = parseReportSession(source);
                        restoreReportSession(payload);
                    }
                } catch (error) {
                    pendingReportSessionSave = pendingBeforeImport;
                    reportSessionSaveScheduled = false;
                    throw error;
                }

                scheduleReportSessionSave({ contextChanged: true });
                let sessionSaved = true;
                try {
                    persistPendingReportSessionSave();
                    saveDashboardSettingsToSession();
                } catch (error) {
                    sessionSaved = false;
                    console.warn("Os dados foram importados, mas não foi possível guardá-los na sessão.", error);
                }

                setReportSessionNotification({
                    type: sessionSaved ? "success" : "warning",
                    message:
                        (settingsOnly
                            ? `Configurações importadas de ${file.name}.`
                            : `Sessão restaurada de ${file.name}.`) +
                        (sessionSaved ? "" : " Não foi possível guardar os dados na sessão desta aba."),
                });
            } catch (error) {
                console.error(
                    "Não foi possível importar a sessão.",
                    error,
                );

                setReportSessionNotification({
                    type: "error",
                    message:
                        error instanceof Error
                            ? error.message
                            : "Não foi possível importar a sessão.",
                });
            } finally {
                setReportSessionBusy(
                    importButton,
                    false,
                );
            }
        },
    );

    try {
        restoreSavedReportSession();
    } catch (error) {
        console.warn("Não foi possível recuperar os relatórios da sessão da aba.", error);
        setReportSessionNotification({ type: "warning", message:
            "Não foi possível recuperar os relatórios da sessão desta aba. Você pode importar o arquivo salvo." });
    }

    subscribeReportContext(() => scheduleReportSessionSave({ contextChanged: true }));
    for (const [reportId, subscribe] of [
        ["planning", subscribePlanningState],
        ["receipt", subscribeReceiptState],
        ["receipt", subscribeReceiptLinehaulState],
        ["expedition", subscribeExpeditionState],
        ["losses-rate", subscribeLossesRateState],
        ["damage-and-losses", subscribeDamageAndLossesState],
        ["damage-and-losses", subscribeLossesState],
        ["reverse", subscribeReverseState],
        ["overall-analysis", subscribeEmployeeRankingHistory],
    ]) {
        subscribe(() => scheduleReportSessionSave({ reportId }));
    }
    subscribeParcelState((_, change) => {
        scheduleReportSessionSave(hasParcelRowsChanged(change) ? { reportId: "parcel" } : { parcelControlsChanged: true });
    });

    reportSessionInitialized = true;

    return true;
}

export {
    REPORT_SESSION_IDS,
    REPORT_SESSION_SCHEMA,
    REPORT_SESSION_VERSION,
    createReportSessionPayload,
    initializeReportSession,
    parseReportSession,
    restoreReportSession,
    serializeReportSession,
    validateReportSessionPayload,
};
