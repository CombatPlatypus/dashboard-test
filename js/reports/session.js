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
} from "./core/report-context.js";

const REPORT_SESSION_SCHEMA =
    "dashboard-report-session";

const REPORT_SESSION_VERSION = 1;

const REPORT_SESSION_VARIABLE =
    "DASHBOARD_REPORT_SESSION";

const REPORT_SESSION_MAX_FILE_SIZE =
    50 * 1024 * 1024;

const REPORT_SESSION_IDS =
    Object.freeze([
        "planning",
        "receipt",
        "expedition",
        "losses-rate",
    ]);

const REPORT_SESSION_FEEDBACK_ICONS =
    Object.freeze({
        info:
            "images/geral-icons/bell-icon.svg",

        success:
            "images/geral-icons/success-icon.svg",

        error:
            "images/geral-icons/error-icon.svg",
    });

const REPORT_SESSION_FEEDBACK_DURATION =
    6000;

let reportSessionInitialized = false;

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

/* OBTÉM SOMENTE OS QUATRO RELATÓRIOS DA SESSÃO */

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

function createReportSessionPayload() {
    return {
        schema:
            REPORT_SESSION_SCHEMA,

        version:
            REPORT_SESSION_VERSION,

        createdAt:
            new Date().toISOString(),

        context:
            getReportContext(),

        reports:
            exportSessionReports(),
    };
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
        payload.context !== undefined &&
        (
            !isSessionObject(
                payload.context,
            ) ||
            typeof payload.context.window !==
                "string" ||
            (
                payload.context.analyst !==
                    undefined &&
                typeof payload.context.analyst !==
                    "string"
            ) ||
            [
                "plannedVolume",
                "collaboratorCount",
                "shiftCapacity",
            ].some(
                function (field) {
                    const value =
                        payload.context[field];

                    return value !==
                        undefined &&
                        value !== null &&
                        !(
                            Number.isSafeInteger(
                                value,
                            ) &&
                            value >= 0
                        );
                },
            )
        )
    ) {
        throw new TypeError(
            "Os dados globais da sessão são inválidos.",
        );
    }

    REPORT_SESSION_IDS.forEach(
        function (reportId) {
            if (
                !Object.prototype
                    .hasOwnProperty.call(
                        payload.reports,
                        reportId,
                    ) ||
                !isSessionObject(
                    payload.reports[
                        reportId
                    ],
                )
            ) {
                throw new TypeError(
                    `A sessão não possui dados válidos para ${reportId}.`,
                );
            }
        },
    );

    const planning =
        payload.reports.planning;

    const receipt =
        payload.reports.receipt;

    const expedition =
        payload.reports.expedition;

    const lossesRate =
        payload.reports[
            "losses-rate"
        ];

    if (
        !isSessionObjectList(
            planning.lhs,
        ) ||
        !planning.lhs.every(
            function (linehaul) {
                return isSessionObjectList(
                    linehaul.tos,
                );
            },
        ) ||
        !isSessionObject(
            planning.vehicleCounts,
        ) ||
        !isSessionObject(
            planning.collectionPool,
        )
    ) {
        throw new TypeError(
            "Os dados do Planejamento são inválidos.",
        );
    }

    if (
        !isSessionObjectList(
            receipt.operators,
        ) ||
        !isSessionObject(
            receipt.linehaul,
        ) ||
        !isSessionObjectList(
            receipt.linehaul.linehauls,
        )
    ) {
        throw new TypeError(
            "Os dados do Processamento são inválidos.",
        );
    }

    if (
        !isSessionObjectList(
            expedition.routes,
        ) ||
        !isSessionObjectList(
            expedition.errorStreets,
        ) ||
        !Array.isArray(
            expedition.excludedOperatorKeys,
        ) ||
        !isSessionObject(
            expedition.errorTotals,
        ) ||
        !isSessionObject(
            expedition.streetGuardians,
        )
    ) {
        throw new TypeError(
            "Os dados da Expedição são inválidos.",
        );
    }

    if (
        !isSessionObjectList(
            lossesRate.months,
        ) ||
        lossesRate.months.length !==
            12 ||
        !isSessionObject(
            lossesRate.identification,
        )
    ) {
        throw new TypeError(
            "Os dados da Taxa de Perdas são inválidos.",
        );
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
        REPORT_SESSION_IDS.map(
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
) {
    validateReportSessionPayload(
        payload,
    );

    const previousReports =
        exportSessionReports();

    const previousContext =
        getReportContext();

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
        restoreReportContext(
            sessionContext,
        );

        reportManager.importSession(
            selectSessionReports(
                payload.reports,
            ),
        );

        renderRestoredOverallAnalysis();
    } catch (error) {
        try {
            restoreReportContext(
                previousContext,
            );

            reportManager.importSession(
                previousReports,
            );

            renderRestoredOverallAnalysis();
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

                    reportIds: [
                        ...REPORT_SESSION_IDS,
                    ],
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

function downloadReportSession() {
    const fileName =
        createReportSessionFileName();

    const fileContent =
        serializeReportSession();

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

                const payload =
                    parseReportSession(
                        source,
                    );

                restoreReportSession(
                    payload,
                );

                setReportSessionNotification({
                    type: "success",
                    message:
                        `Sessão restaurada de ${file.name}.`,
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
