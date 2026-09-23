const REPORT_NOTIFICATION_ICONS =
    Object.freeze({
        idle:
            "images/geral-icons/bell-icon.svg",

        info:
            "images/geral-icons/bell-icon.svg",

        success:
            "images/geral-icons/success-icon.svg",

        warning:
            "images/geral-icons/alert-icon.svg",

        error:
            "images/geral-icons/error-icon.svg",
    });

const IDLE_REPORT_NOTIFICATION =
    Object.freeze({
    type: "idle",

    message:
        "Tudo em silêncio por enquanto.",
    });

const SPX_LINEHAUL_IMPORT_NOTIFICATION =
    Object.freeze({
        type: "idle",

        message:
            "No SPX, acesse Transporte Principal / Viagens de Carga Direta, escolha Inbound e aperte Crtl A, depois Crtl C, então volte aqui e clique em importar.",
    });

const DAMAGE_AND_LOSSES_IMPORT_NOTIFICATION =
    Object.freeze({
        type: "idle",

        message:
            "Importe uma planilha com a aba Histórico de Avarias e Histórico de Análises, seguindo exatamente o modelo fornecido no footer do dashboard.",
    });

const LOSSES_RATE_IMPORT_NOTIFICATION =
    Object.freeze({
        type: "idle",

        message:
            "Importe uma planilha com a aba Taxa de Perdas, seguindo exatamente o modelo fornecido no footer do dashboard.",
    });

const EXPEDITION_IMPORT_NOTIFICATION =
    Object.freeze({
        type: "idle",

        message:
            "No SPX, acesse Gestão Audit / Conferencia: LM Hub AT/TO, escolha uma tarefa para exportar, então volte aqui e clique em importar.",
    });

const OVERALL_ANALYSIS_NOTIFICATION =
    Object.freeze({
        type: "idle",

        message:
            "Preencha os relatórios para completar a análise geral, tudo aqui vai se atualizar automaticamente.",
    });

const DEFAULT_REPORT_NOTIFICATIONS =
    Object.freeze({
        receipt:
            SPX_LINEHAUL_IMPORT_NOTIFICATION,

        planning:
            SPX_LINEHAUL_IMPORT_NOTIFICATION,

        expedition:
            EXPEDITION_IMPORT_NOTIFICATION,

        "damage-and-losses":
            DAMAGE_AND_LOSSES_IMPORT_NOTIFICATION,

        "losses-rate":
            LOSSES_RATE_IMPORT_NOTIFICATION,

        "overall-analysis":
            OVERALL_ANALYSIS_NOTIFICATION,
    });

const reportNotifications =
    new Map();

const REPORT_NOTIFICATION_PREFIXES =
    Object.freeze({
        planning: "planning",
        receipt: "receipt",
        expedition: "expedition",
        "damage-and-losses":
            "damageAndLosses",
        "losses-rate": "lossesRate",
        "overall-analysis":
            "overallAnalysis",
    });

/* IDENTIFICA O RELATÓRIO ATIVO */

function normalizeReportId(
    value,
) {
    return String(
        value ?? "",
    )
        .trim()
        .replace(/^#/, "");
}

function getActiveReportId() {
    const activeLink =
        document.querySelector(
            "#report-choice " +
            ".tabs-title.is-active > " +
            'a[href^="#"]',
        );

    return normalizeReportId(
        activeLink?.getAttribute(
            "href",
        ),
    );
}

function getReportNotification(
    reportId,
) {
    const normalizedReportId =
        normalizeReportId(
            reportId,
        );

    return (
        reportNotifications.get(
            normalizedReportId,
        ) ||
        DEFAULT_REPORT_NOTIFICATIONS[
            normalizedReportId
        ] ||
        IDLE_REPORT_NOTIFICATION
    );
}

/* LOCALIZA OS ELEMENTOS */

function getReportNotificationElements(
    reportId,
) {
    const prefix =
        REPORT_NOTIFICATION_PREFIXES[
            normalizeReportId(
                reportId,
            )
        ];

    if (!prefix) {
        return null;
    }

    return {
        container:
            document.getElementById(
                `${prefix}Notification`,
            ),

        icon:
            document.getElementById(
                `${prefix}NotificationIcon`,
            ),

        text:
            document.getElementById(
                `${prefix}NotificationText`,
            ),
    };
}

/* RENDERIZA A ÚLTIMA NOTIFICAÇÃO */

function renderReportNotification(
    reportId =
        getActiveReportId(),
    notification =
        getReportNotification(
            reportId,
        ),
) {
    const elements =
        getReportNotificationElements(
            reportId,
        );

    if (
        !elements ||
        !(
            elements.container instanceof
                HTMLElement
        ) ||
        !(
            elements.icon instanceof
                HTMLImageElement
        ) ||
        !(
            elements.text instanceof
                HTMLElement
        )
    ) {
        return false;
    }

    elements.container.dataset
        .notificationType =
            notification.type;

    elements.icon.src =
        REPORT_NOTIFICATION_ICONS[
            notification.type
        ] ||
        REPORT_NOTIFICATION_ICONS.info;

    elements.text.textContent =
        notification.message;

    return true;
}

/* DEFINE UMA NOVA NOTIFICAÇÃO */

function setReportNotification({
    type = "info",
    message,
    reportId,
} = {}) {
    const normalizedMessage =
        String(
            message ?? "",
        ).trim();

    if (!normalizedMessage) {
        return false;
    }

    const normalizedType =
        Object.prototype.hasOwnProperty.call(
            REPORT_NOTIFICATION_ICONS,
            type,
        )
            ? type
            : "info";

    const normalizedReportId =
        normalizeReportId(
            reportId,
        ) ||
        getActiveReportId();

    const notification = {
        type: normalizedType,
        message: normalizedMessage,
    };

    if (normalizedReportId) {
        reportNotifications.set(
            normalizedReportId,
            notification,
        );
    }

    return renderReportNotification(
        normalizedReportId,
        notification,
    );
}

/* RESTAURA A MENSAGEM PADRÃO DE UM RELATÓRIO */

function resetReportNotification(
    reportId,
) {
    const normalizedReportId =
        normalizeReportId(
            reportId,
        ) ||
        getActiveReportId();

    reportNotifications.delete(
        normalizedReportId,
    );

    return renderReportNotification(
        normalizedReportId,
    );
}

/* INICIALIZAÇÃO */

function initializeReportNotifications() {
    return Object.keys(
        REPORT_NOTIFICATION_PREFIXES,
    ).every(
        function (reportId) {
            return renderReportNotification(
                reportId,
            );
        },
    );
}

export {
    initializeReportNotifications,
    resetReportNotification,
    setReportNotification,
};
