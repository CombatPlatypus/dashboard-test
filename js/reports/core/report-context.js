const reportContextListeners =
    new Set();

const reportContext = {
    window: "",
    analyst: "",
    plannedVolume: null,
    collaboratorCount: null,
    shiftCapacity: null,
};

const reportContextTextFields =
    new Set([
        "window",
        "analyst",
    ]);

const reportContextQuantityFields =
    new Set([
        "plannedVolume",
        "collaboratorCount",
        "shiftCapacity",
    ]);

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

function normalizeReportContextQuantity(
    value,
) {
    const digits =
        String(
            value ?? "",
        ).replace(
            /\D/g,
            "",
        );

    if (!digits) {
        return null;
    }

    const quantity =
        Number.parseInt(
            digits,
            10,
        );

    return Number.isSafeInteger(
        quantity,
    )
        ? quantity
        : null;
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
    if (
        !reportContextTextFields.has(
            field,
        ) &&
        !reportContextQuantityFields.has(
            field,
        )
    ) {
        return false;
    }

    const normalizedValue =
        reportContextQuantityFields.has(
            field,
        )
            ? normalizeReportContextQuantity(
                value,
            )
            : normalizeReportContextText(
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

    reportContext.analyst =
        normalizeReportContextText(
            receivedContext.analyst,
        );

    reportContext.plannedVolume =
        normalizeReportContextQuantity(
            receivedContext.plannedVolume,
        );

    reportContext.collaboratorCount =
        normalizeReportContextQuantity(
            receivedContext.collaboratorCount,
        );

    reportContext.shiftCapacity =
        normalizeReportContextQuantity(
            receivedContext.shiftCapacity,
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
