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

const reportNotifications =
    new Map();

let reportsVisibilityObserver =
    null;

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

function getActiveReportNotification() {
    return (
        reportNotifications.get(
            getActiveReportId(),
        ) ||
        IDLE_REPORT_NOTIFICATION
    );
}

/* LOCALIZA OS ELEMENTOS */

function getReportNotificationElements() {
    return {
        container:
            document.getElementById(
                "reportsNotification",
            ),

        icon:
            document.getElementById(
                "reportsNotificationIcon",
            ),

        text:
            document.getElementById(
                "reportsNotificationText",
            ),
    };
}

/* RENDERIZA A ÚLTIMA NOTIFICAÇÃO */

function renderReportNotification(
    notification =
        getActiveReportNotification(),
) {
    const elements =
        getReportNotificationElements();

    if (
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
        console.error(
            "Não foi possível localizar a caixa global de notificações dos relatórios.",
        );

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

    if (
        !normalizedReportId ||
        normalizedReportId ===
            getActiveReportId()
    ) {
        return renderReportNotification(
            notification,
        );
    }

    return true;
}

/* INICIALIZAÇÃO */

function initializeReportNotifications() {
    const reportsContent =
        document.querySelector(
            '[data-tabs-content="report-choice"]',
        );

    reportsVisibilityObserver
        ?.disconnect();

    if (
        reportsContent instanceof
        HTMLElement
    ) {
        reportsVisibilityObserver =
            new MutationObserver(
                function () {
                    renderReportNotification();
                },
            );

        reportsVisibilityObserver.observe(
            reportsContent,
            {
                attributes: true,
                attributeFilter: [
                    "class",
                ],
                subtree: true,
            },
        );
    }

    return renderReportNotification();
}

export {
    initializeReportNotifications,
    setReportNotification,
};
