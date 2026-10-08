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
    "xlsx/Relatório de Planejamento.xlsx";

const PLANNING_SPREADSHEET_SHEET_NAME =
    "Modelo";

const EMPTY_SPREADSHEET_VALUE =
    "—";

const PLANNING_SPREADSHEET_TABLE_HEADERS =
    Object.freeze({
        lhs: [
            "LHs Programados",
            "Origem",
            "QTD",
        ],
        segregatedLhs: [
            "LHs a Segregar",
            "Origem",
            "QTD",
        ],
        tos: [
            "TOs para Segregar",
            "LH",
            "QTD",
        ],
    });

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

function trimUnusedPlanningLhs(
    lhs,
    minimumLength,
) {
    const normalizedLhs =
        Array.isArray(lhs)
            ? [...lhs]
            : [];

    while (
        normalizedLhs.length >
            minimumLength &&
        !hasPlanningLhInformation(
            normalizedLhs.at(-1),
        )
    ) {
        normalizedLhs.pop();
    }

    return normalizedLhs;
}

function getPlanningSpreadsheetCellText(
    cellValues,
    reference,
) {
    return String(
        cellValues.get(
            reference,
        ) ?? "",
    ).trim();
}

function findPlanningSpreadsheetHeaderRow(
    cellValues,
    headers,
) {
    const candidateRows =
        Array.from(
            cellValues.keys(),
        )
            .map(
                function (reference) {
                    return reference.match(
                        /^B([1-9]\d*)$/,
                    )?.[1];
                },
            )
            .filter(Boolean)
            .map(Number);

    return candidateRows.find(
        function (rowNumber) {
            return [
                "B",
                "C",
                "D",
            ].every(
                function (
                    column,
                    columnIndex,
                ) {
                    return (
                        getPlanningSpreadsheetCellText(
                            cellValues,
                            `${column}${rowNumber}`,
                        ) ===
                        headers[columnIndex]
                    );
                },
            );
        },
    );
}

function createPlanningSpreadsheetSection(
    cellValues,
    headers,
) {
    const headerRow =
        findPlanningSpreadsheetHeaderRow(
            cellValues,
            headers,
        );

    if (!headerRow) {
        throw new Error(
            `A seção ${headers[0]} não foi encontrada no modelo XLSX.`,
        );
    }

    const startRow =
        headerRow + 1;

    let rowCount = 0;

    while (
        [
            "B",
            "C",
            "D",
        ].every(
            function (column) {
                return (
                    getPlanningSpreadsheetCellText(
                        cellValues,
                        `${column}${startRow + rowCount}`,
                    ) ===
                    EMPTY_SPREADSHEET_VALUE
                );
            },
        )
    ) {
        rowCount += 1;
    }

    if (rowCount === 0) {
        throw new Error(
            `A seção ${headers[0]} não possui linhas disponíveis no modelo XLSX.`,
        );
    }

    return {
        startRow,
        rowCount,
    };
}

function createPlanningSpreadsheetLayout(
    cellValues,
) {
    if (!(cellValues instanceof Map)) {
        throw new TypeError(
            "Não foi possível ler as células do modelo XLSX.",
        );
    }

    return Object.fromEntries(
        Object.entries(
            PLANNING_SPREADSHEET_TABLE_HEADERS,
        ).map(
            function ([key, headers]) {
                return [
                    key,
                    createPlanningSpreadsheetSection(
                        cellValues,
                        headers,
                    ),
                ];
            },
        ),
    );
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
}, layout) {
    const exceededSection = [
        [
            "LHs programados",
            lhs.length,
            layout.lhs.rowCount,
        ],
        [
            "LHs a segregar",
            segregatedLhs.length,
            layout.segregatedLhs.rowCount,
        ],
        [
            "TOs para segregar",
            tos.length,
            layout.tos.rowCount,
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
        rows,
    },
) {
    for (
        let rowIndex = 0;
        rowIndex < rows.length;
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
    layout,
) {
    const lhs =
        trimUnusedPlanningLhs(
            state?.lhs,
            layout.lhs.rowCount,
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
    }, layout);

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
            ...layout.lhs,
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
            ...layout.segregatedLhs,
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
            ...layout.tos,
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
            function ({
                cellValues,
            }) {
                const layout =
                    createPlanningSpreadsheetLayout(
                        cellValues,
                    );

                return createPlanningSpreadsheetCells(
                    state,
                    layout,
                );
            },
    });
}

export {
    EMPTY_SPREADSHEET_VALUE,
    PLANNING_SPREADSHEET_SHEET_NAME,
    PLANNING_SPREADSHEET_TEMPLATE_URL,
    PLANNING_SPREADSHEET_TABLE_HEADERS,
    assertPlanningSpreadsheetCapacity,
    createPlanningSpreadsheetBlob,
    createPlanningSpreadsheetCells,
    createPlanningSpreadsheetFileName,
    createPlanningSpreadsheetLayout,
    getPlanningSpreadsheetTos,
};
