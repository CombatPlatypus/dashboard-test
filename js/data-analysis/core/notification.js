const NOTIFICATION_ICONS =
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

function requireNotificationElement(
    rootElement,
    selector,
) {
    const element =
        rootElement.querySelector(
            selector,
        );

    if (!element) {
        throw new Error(
            `Elemento da notificação não encontrado: ${selector}`,
        );
    }

    return element;
}

function createNotificationController(
    rootElement,
) {
    const container =
        requireNotificationElement(
            rootElement,
            "#analysisNotification",
        );

    const icon =
        requireNotificationElement(
            rootElement,
            "#analysisNotificationIcon",
        );

    const text =
        requireNotificationElement(
            rootElement,
            "#analysisNotificationText",
        );

    function setNotification(
        message,
        type = "info",
    ) {
        const normalizedType =
            Object.prototype.hasOwnProperty.call(
                NOTIFICATION_ICONS,
                type,
            )
                ? type
                : "info";

        container.dataset
            .notificationType =
                normalizedType;

        icon.src =
            NOTIFICATION_ICONS[
                normalizedType
            ];

        text.textContent = message;
    }

    return Object.freeze({
        set: setNotification,
    });
}

export {
    createNotificationController,
};
