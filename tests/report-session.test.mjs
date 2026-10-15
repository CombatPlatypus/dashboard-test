import assert from "node:assert/strict";
import {
    test,
} from "node:test";

class TestElement {}

globalThis.HTMLElement =
    TestElement;

globalThis.HTMLInputElement =
    TestElement;

globalThis.HTMLButtonElement =
    TestElement;

globalThis.HTMLImageElement =
    TestElement;

globalThis.document = {
    getElementById() {
        return null;
    },

    querySelectorAll() {
        return [];
    },
};

const originalConsoleError =
    console.error;

console.error = function () {};

const {
    REPORT_SESSION_SCHEMA,
    REPORT_SESSION_VERSION,
    parseReportSession,
    serializeReportSession,
} = await import(
    "../js/reports/session.js"
);

console.error =
    originalConsoleError;

function createSessionPayload() {
    return {
        schema:
            REPORT_SESSION_SCHEMA,

        version:
            REPORT_SESSION_VERSION,

        createdAt:
            "2026-10-15T12:00:00.000Z",

        reports: {
            planning: {
                lhs: [],
                vehicleCounts: {},
                collectionPool: {},
            },

            receipt: {
                operators: [],
                linehaul: {
                    linehauls: [],
                },
            },

            expedition: {
                routes: [],
                errorStreets: [],
                excludedOperatorKeys: [],
                errorTotals: {},
                streetGuardians: {},
            },

            "losses-rate": {
                activeMonth: 9,
                year: 2026,
                months:
                    Array.from(
                        {
                            length: 12,
                        },
                        function () {
                            return {
                                moved: null,
                                possibleLosses: null,
                                lost: null,
                                damage: null,
                            };
                        },
                    ),
            },
        },
    };
}

test(
    "salva e lê a Taxa de Perdas no formato atual, sem identificação legada",
    function () {
        const payload =
            createSessionPayload();

        const source =
            serializeReportSession(
                payload,
            );

        assert.deepEqual(
            parseReportSession(
                source,
            ),
            payload,
        );
    },
);

test(
    "continua rejeitando histórico da Taxa de Perdas incompleto",
    function () {
        const payload =
            createSessionPayload();

        payload.reports[
            "losses-rate"
        ].months.pop();

        assert.throws(
            function () {
                serializeReportSession(
                    payload,
                );
            },
            {
                name: "TypeError",
                message:
                    "Os dados da Taxa de Perdas são inválidos.",
            },
        );
    },
);
