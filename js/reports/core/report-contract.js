const REQUIRED_REPORT_METHODS =
    Object.freeze([
        "init",
        "render",
        "reset",
        "importData",
        "exportSession",
        "importSession",
        "canExport",
    ]);

function normalizeReportId(value) {
    return String(
        value ?? "",
    ).trim();
}

function validateReportModule(report) {
    if (
        !report ||
        typeof report !== "object"
    ) {
        throw new TypeError(
            "O módulo do relatório deve ser um objeto.",
        );
    }

    const reportId =
        normalizeReportId(
            report.id,
        );

    if (!reportId) {
        throw new TypeError(
            "O módulo do relatório deve possuir um id.",
        );
    }

    REQUIRED_REPORT_METHODS.forEach(
        function (methodName) {
            if (
                typeof report[methodName] !==
                "function"
            ) {
                throw new TypeError(
                    `O relatório ${reportId} não implementa ${methodName}().`,
                );
            }
        },
    );

    return reportId;
}

export {
    REQUIRED_REPORT_METHODS,
    normalizeReportId,
    validateReportModule,
};
