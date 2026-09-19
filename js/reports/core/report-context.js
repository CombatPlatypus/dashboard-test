const reportContextListeners =
    new Set();

const reportContext = {
    window: "AM",
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

const reportWindowValues =
    new Set([
        "AM",
        "PM1",
        "PM2",
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

function normalizeReportContextWindow(
    value,
) {
    const normalizedValue =
        normalizeReportContextText(
            value,
        ).toUpperCase();

    return reportWindowValues.has(
        normalizedValue,
    )
        ? normalizedValue
        : "AM";
}

function normalizeReportContextAnalyst(
    value,
) {
    return normalizeReportContextText(
        String(
            value ?? "",
        ).replace(
            /[^\p{L}\s]/gu,
            "",
        ),
    );
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

    let normalizedValue;

    if (field === "window") {
        normalizedValue =
            normalizeReportContextWindow(
                value,
            );
    } else if (field === "analyst") {
        normalizedValue =
            normalizeReportContextAnalyst(
                value,
            );
    } else {
        normalizedValue =
            normalizeReportContextQuantity(
                value,
            );
    }

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
        normalizeReportContextWindow(
            receivedContext.window,
        );

    reportContext.analyst =
        normalizeReportContextAnalyst(
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
