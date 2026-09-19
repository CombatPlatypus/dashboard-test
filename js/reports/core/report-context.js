const reportContextListeners =
    new Set();

const reportContext = {
    window: "",
};

/* NORMALIZA OS TEXTOS COMPARTILHADOS */

function normalizeReportContextText(
    value,
) {
    return String(
        value ?? "",
    )
        .replace(
            /\s+/g,
            " ",
        )
        .trim();
}

/* CRIA UMA CÓPIA DO CONTEXTO */

function getReportContext() {
    return {
        ...reportContext,
    };
}

/* NOTIFICA OS CONSUMIDORES DOS CAMPOS GLOBAIS */

function notifyReportContext(
    change,
) {
    const snapshot =
        getReportContext();

    reportContextListeners.forEach(
        function (listener) {
            listener(
                snapshot,
                change,
            );
        },
    );
}

function subscribeReportContext(
    listener,
) {
    if (
        typeof listener !==
        "function"
    ) {
        return function () {};
    }

    reportContextListeners.add(
        listener,
    );

    return function () {
        reportContextListeners.delete(
            listener,
        );
    };
}

/* ATUALIZA UM CAMPO GLOBAL */

function updateReportContextField(
    field,
    value,
) {
    if (field !== "window") {
        return false;
    }

    const normalizedValue =
        normalizeReportContextText(
            value,
        );

    if (
        reportContext[field] ===
        normalizedValue
    ) {
        return true;
    }

    reportContext[field] =
        normalizedValue;

    notifyReportContext({
        type: "report-context-updated",
        field,
    });

    return true;
}

/* RESTAURA OS CAMPOS GLOBAIS DE UMA SESSÃO */

function restoreReportContext(
    context = {},
) {
    const receivedContext =
        context &&
        typeof context === "object" &&
        !Array.isArray(context)
            ? context
            : {};

    reportContext.window =
        normalizeReportContextText(
            receivedContext.window,
        );

    notifyReportContext({
        type: "report-context-restored",
    });

    return true;
}

export {
    getReportContext,
    restoreReportContext,
    subscribeReportContext,
    updateReportContextField,
};
