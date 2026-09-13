import {
    normalizeReportId,
    validateReportModule,
} from "./report-contract.js";

class ReportManager {
    constructor() {
        this.reports = new Map();
        this.initializedReports =
            new Set();
    }

    register(report) {
        const reportId =
            validateReportModule(
                report,
            );

        if (
            this.reports.has(
                reportId,
            )
        ) {
            if (
                this.reports.get(
                    reportId,
                ) === report
            ) {
                return report;
            }

            throw new Error(
                `O relatório ${reportId} já está registrado.`,
            );
        }

        this.reports.set(
            reportId,
            report,
        );

        return report;
    }

    get(reportId) {
        return this.reports.get(
            normalizeReportId(
                reportId,
            ),
        ) || null;
    }

    list() {
        return Array.from(
            this.reports.values(),
        );
    }

    initialize(reportId) {
        const normalizedReportId =
            normalizeReportId(
                reportId,
            );

        const report =
            this.get(
                normalizedReportId,
            );

        if (!report) {
            throw new Error(
                `O relatório ${normalizedReportId} não está registrado.`,
            );
        }

        if (
            this.initializedReports.has(
                normalizedReportId,
            )
        ) {
            return report;
        }

        const initialized =
            report.init();

        if (initialized === false) {
            throw new Error(
                `Não foi possível inicializar o relatório ${normalizedReportId}.`,
            );
        }

        this.initializedReports.add(
            normalizedReportId,
        );

        return report;
    }

    initializeAll() {
        return this.list().map(
            (report) =>
                this.initialize(
                    report.id,
                ),
        );
    }

    render(reportId) {
        const report =
            this.initialize(
                reportId,
            );

        return report.render();
    }

    reset(reportId) {
        const report =
            this.initialize(
                reportId,
            );

        return report.reset();
    }

    exportSession() {
        const reports = {};

        this.list().forEach(
            function (report) {
                reports[report.id] =
                    report.exportSession();
            },
        );

        return reports;
    }

    importSession(session = {}) {
        if (
            !session ||
            typeof session !== "object" ||
            Array.isArray(session)
        ) {
            throw new TypeError(
                "Os dados da sessão de relatórios são inválidos.",
            );
        }

        Object.entries(session).forEach(
            ([reportId, reportSession]) => {
                const report =
                    this.get(
                        reportId,
                    );

                if (!report) {
                    return;
                }

                this.initialize(
                    reportId,
                );

                report.importSession(
                    reportSession,
                );
            },
        );

        return true;
    }
}

const reportManager =
    new ReportManager();

export {
    ReportManager,
    reportManager,
};
