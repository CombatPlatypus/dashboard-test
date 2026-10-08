import {
    calculatePlanningAverageSpr,
    calculatePlanningEstimatedVolume,
    getPlanningLhQuantity,
    getPlanningLhSegregatedQuantity,
    getPlanningPoolQuantity,
    hasPlanningToInformation,
} from "./calculations.js";

import {
    createXlsxTemplateBlob,
} from "../xlsx-template.js";

const PLANNING_SPREADSHEET_TEMPLATE_URL =
    "xlsx/Relatório de Planejamento - Planilhas da Operação 2026.xlsx";

const PLANNING_SPREADSHEET_SHEET_NAME =
    "Modelo";

const PLANNING_SPREADSHEET_LIMITS =
    Object.freeze({
        lhs: 8,
        segregatedLhs: 8,
        tos: 20,
    });

const EMPTY_SPREADSHEET_VALUE =
    "—";

function hasPlanningLhInformation(lh) {
    return (
        String(
            lh?.code ?? "",
        ).trim() !== "" ||
        String(
            lh?.origin ?? "",
        ).trim() !== "" ||
        Number.isFinite(
            lh?.quantity,
        ) ||
        Boolean(
            lh?.segregate,
        ) ||
        Boolean(
            lh?.segregateTos,
        ) ||
        (
            Array.isArray(
                lh?.tos,
            ) &&
            lh.tos.some(
                hasPlanningToInformation,
            )
        )
    );
}

function trimUnusedPlanningLhs(lhs) {
    const normalizedLhs =
        Array.isArray(lhs)
            ? [...lhs]
            : [];

    while (
        normalizedLhs.length >
            PLANNING_SPREADSHEET_LIMITS.lhs &&
        !hasPlanningLhInformation(
            normalizedLhs.at(-1),
        )
    ) {
        normalizedLhs.pop();
    }

    return normalizedLhs;
}

function getPlanningSpreadsheetTos(lhs) {
    return lhs
        .filter(
            function (lh) {
                return (
                    lh.segregate &&
                    lh.segregateTos
                );
            },
        )
        .flatMap(
            function (lh) {
                return (
                    Array.isArray(
                        lh.tos,
                    )
                        ? lh.tos
                        : []
                )
                    .filter(
                        hasPlanningToInformation,
                    )
                    .map(
                        function (to) {
                            return {
                                code:
                                    to.code,
                                lhCode:
                                    lh.code,
                                quantity:
                                    to.quantity,
                            };
                        },
                    );
            },
        );
}

function assertPlanningSpreadsheetCapacity({
    lhs,
    segregatedLhs,
    tos,
}) {
    const exceededSection = [
        [
            "LHs programados",
            lhs.length,
            PLANNING_SPREADSHEET_LIMITS.lhs,
        ],
        [
            "LHs a segregar",
            segregatedLhs.length,
            PLANNING_SPREADSHEET_LIMITS.segregatedLhs,
        ],
        [
            "TOs para segregar",
            tos.length,
            PLANNING_SPREADSHEET_LIMITS.tos,
        ],
    ].find(
        function ([, quantity, limit]) {
            return quantity > limit;
        },
    );

    if (!exceededSection) {
        return true;
    }

    const [
        section,
        quantity,
        limit,
    ] = exceededSection;

    throw new Error(
        `O modelo comporta até ${limit} ${section}, mas o relatório possui ${quantity}.`,
    );
}

function normalizeSpreadsheetText(value) {
    const text =
        String(
            value ?? "",
        ).trim();

    return (
        text ||
        EMPTY_SPREADSHEET_VALUE
    );
}

function normalizeSpreadsheetQuantity(value) {
    return Number.isFinite(
        value,
    )
        ? value
        : EMPTY_SPREADSHEET_VALUE;
}

function addPlanningSpreadsheetRows(
    cells,
    {
        startRow,
        rowCount,
        rows,
    },
) {
    for (
        let rowIndex = 0;
        rowIndex < rowCount;
        rowIndex += 1
    ) {
        const rowNumber =
            startRow +
            rowIndex;

        const row =
            rows[rowIndex] ??
            [];

        cells[`B${rowNumber}`] =
            normalizeSpreadsheetText(
                row[0],
            );

        cells[`C${rowNumber}`] =
            normalizeSpreadsheetText(
                row[1],
            );

        cells[`D${rowNumber}`] =
            normalizeSpreadsheetQuantity(
                row[2],
            );
    }
}

function createPlanningSpreadsheetCells(
    state,
) {
    const lhs =
        trimUnusedPlanningLhs(
            state?.lhs,
        );

    const segregatedLhs =
        lhs.filter(
            function (lh) {
                return lh.segregate;
            },
        );

    const tos =
        getPlanningSpreadsheetTos(
            lhs,
        );

    assertPlanningSpreadsheetCapacity({
        lhs,
        segregatedLhs,
        tos,
    });

    const cells = {
        B3:
            calculatePlanningEstimatedVolume(
                state,
            ),

        C3:
            calculatePlanningAverageSpr(
                state,
            ),

        D3:
            normalizeSpreadsheetQuantity(
                state.dailyCapacity,
            ),

        B7:
            getPlanningPoolQuantity(
                state,
                "backlogPackages",
            ),

        C7:
            getPlanningPoolQuantity(
                state,
                "backlogBulky",
            ),

        D7:
            getPlanningLhQuantity(
                lhs,
            ),

        B11:
            getPlanningPoolQuantity(
                state,
                "added",
            ),

        C11:
            getPlanningPoolQuantity(
                state,
                "removed",
            ),

        D11:
            getPlanningPoolQuantity(
                state,
                "errors",
            ),
    };

    addPlanningSpreadsheetRows(
        cells,
        {
            startRow: 15,
            rowCount:
                PLANNING_SPREADSHEET_LIMITS.lhs,
            rows:
                lhs.map(
                    function (lh) {
                        return [
                            lh.code,
                            lh.origin,
                            lh.quantity,
                        ];
                    },
                ),
        },
    );

    addPlanningSpreadsheetRows(
        cells,
        {
            startRow: 25,
            rowCount:
                PLANNING_SPREADSHEET_LIMITS.segregatedLhs,
            rows:
                segregatedLhs.map(
                    function (lh) {
                        return [
                            lh.code,
                            lh.origin,
                            getPlanningLhSegregatedQuantity(
                                lh,
                            ),
                        ];
                    },
                ),
        },
    );

    addPlanningSpreadsheetRows(
        cells,
        {
            startRow: 35,
            rowCount:
                PLANNING_SPREADSHEET_LIMITS.tos,
            rows:
                tos.map(
                    function (to) {
                        return [
                            to.code,
                            to.lhCode,
                            to.quantity,
                        ];
                    },
                ),
        },
    );

    return cells;
}

function createPlanningSpreadsheetFileName(
    date = new Date(),
) {
    const datePart = [
        date.getFullYear(),
        String(
            date.getMonth() + 1,
        ).padStart(2, "0"),
        String(
            date.getDate(),
        ).padStart(2, "0"),
    ].join("-");

    return (
        "relatorio-de-planejamento-" +
        `${datePart}.xlsx`
    );
}

function createPlanningSpreadsheetBlob(
    state,
) {
    return createXlsxTemplateBlob({
        templateUrl:
            PLANNING_SPREADSHEET_TEMPLATE_URL,
        sheetName:
            PLANNING_SPREADSHEET_SHEET_NAME,
        cells:
            createPlanningSpreadsheetCells(
                state,
            ),
    });
}

export {
    EMPTY_SPREADSHEET_VALUE,
    PLANNING_SPREADSHEET_LIMITS,
    PLANNING_SPREADSHEET_SHEET_NAME,
    PLANNING_SPREADSHEET_TEMPLATE_URL,
    assertPlanningSpreadsheetCapacity,
    createPlanningSpreadsheetBlob,
    createPlanningSpreadsheetCells,
    createPlanningSpreadsheetFileName,
    getPlanningSpreadsheetTos,
};
