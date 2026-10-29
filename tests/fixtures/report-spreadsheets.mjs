function createReceiptSpreadsheetSnapshot() {
    return {
        receipt: { window: "PM1", expectedVolume: 1000, useTotalErrorParticipation: false, operators: [
            { id: 1, receiver: "[ops1]MARIA DA SILVA", labeler: "João Santos", packagesReceived: 100, errorQuantity: 3, selected: true },
            { id: 2, receiver: "[ops2]JOSE SANTOS", labeler: "", packagesReceived: 50, errorQuantity: null, selected: true },
            { id: 3, receiver: "Ignorado", labeler: "Ignorado", packagesReceived: 90, errorQuantity: 9, selected: false },
        ] },
        linehaul: { window: "PM1", expectedVolume: 320, linehauls: [
            { code: "LH001", driver: "Motorista A", origin: "Cajamar", loadedOrders: 120, selected: true },
            { code: "LH002", driver: "Motorista B", origin: "Campinas", loadedOrders: 200, selected: false },
            { code: "LH003", driver: "Motorista C", origin: "Santos", loadedOrders: 0, selected: true },
        ] },
    };
}

function createExpeditionSpreadsheetState() {
    return {
        window: "PM1", floorVolume: 10, duplicatedOrders: 2, exceptionOrders: 3, withdrawnOrders: 4,
        hasErrorData: true, errorTotals: { sortingErrors: 4, labelingErrors: 6 }, revertedErrors: 2,
        excludedOperatorKeys: ["bruno"], streetGuardians: {}, routes: [
            { code: "AT1", status: "Validated", corridor: "A-1", finalOrders: 100, missingOrders: 2, missortedOrders: 4,
                validationOperator: "Ana", validationStartTime: "2026-10-28 08:00:00", validationEndTime: "2026-10-28 08:10:00", validationDurationSeconds: 600 },
            { code: "AT2", status: "Validated", corridor: "B-1", finalOrders: 200, missingOrders: 1, missortedOrders: 6,
                validationOperator: "Ana", validationStartTime: "2026-10-28 08:10:00", validationEndTime: "2026-10-28 08:30:00", validationDurationSeconds: 1200 },
            { code: "AT3", status: "Validated", corridor: "C-1", finalOrders: 50, missingOrders: 5, missortedOrders: 9,
                validationOperator: "Bruno", validationStartTime: "2026-10-28 07:00:00", validationEndTime: "2026-10-28 09:00:00", validationDurationSeconds: 7200 },
        ],
    };
}

export { createExpeditionSpreadsheetState, createReceiptSpreadsheetSnapshot };
