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

let lastReportNotification = {
    type: "idle",

    message:
        "Tudo em silêncio por enquanto.",
};

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

function renderReportNotification() {
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
            lastReportNotification.type;

    elements.icon.src =
        REPORT_NOTIFICATION_ICONS[
            lastReportNotification.type
        ] ||
        REPORT_NOTIFICATION_ICONS.info;

    elements.text.textContent =
        lastReportNotification.message;

    return true;
}

/* DEFINE UMA NOVA NOTIFICAÇÃO */

function setReportNotification({
    type = "info",
    message,
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

    lastReportNotification = {
        type: normalizedType,
        message: normalizedMessage,
    };

    return renderReportNotification();
}

/* INICIALIZAÇÃO */

function initializeReportNotifications() {
    return renderReportNotification();
}

export {
    initializeReportNotifications,
    setReportNotification,
};