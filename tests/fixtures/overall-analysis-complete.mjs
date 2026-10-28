import { createOverallAnalysisData } from "../../js/reports/overall-analysis/model.js";

function createCompleteAnalysis() {
    const months = Array.from({ length: 12 }, () => ({
        moved: null, lost: null, damage: null, possibleLosses: null,
    }));
    months[9] = { moved: 1000000, lost: 120, damage: 30, possibleLosses: 8 };
    return createOverallAnalysisData(
        { expectedVolume: 12000, operators: [
            { selected: true, packagesReceived: 11500, errorQuantity: 12 },
            { selected: false, packagesReceived: 900, errorQuantity: 3 },
        ] },
        { floorVolume: 500, routes: [{
            code: "AT-TEST", status: "Validated", finalOrders: 11000,
            validationOperator: "Conferente teste", validationStartTime: "2026-10-19 01:00:00",
            validationEndTime: "2026-10-19 03:10:05",
        }] },
        { activeMonth: 9, year: 2026, months },
        { window: "AM", analyst: "Analista de teste", plannedVolume: 12000, shiftCapacity: 20000 },
        { days: [{ date: "2026-10-19", hub: 3, soc: 2 }] },
        { days: [{ date: "2026-10-19", underReview: 8, confirmedLosses: 2, returnedPackages: 5 }] },
        { rows: [
            { trackingNumber: "BR1", countType: "Backlog", expected: "Y" },
            { trackingNumber: "BR2", countType: "Exception", expected: "Y" },
            { trackingNumber: "BR3", countType: "Missing", expected: "Y" },
            { trackingNumber: "BR4", countType: "Mis-sorted", expected: "N" },
        ] },
        { transfers: [{ to: "TOTEST", quantities: { return: 3, missorted: 2, liquidate: 1, confiscated: 4 } }] },
        new Date(2026, 9, 19, 12),
    );
}

export { createCompleteAnalysis };
