import {
    canExportDamageAndLossesController,
    exportDamageAndLossesSession,
    importDamageAndLossesData,
    importDamageAndLossesSession,
    initializeDamageAndLossesController,
    renderDamageAndLossesController,
    resetDamageAndLossesController,
} from "./controller.js";

const damageAndLossesReport =
    Object.freeze({
        id: "damage-and-losses",

        init:
            initializeDamageAndLossesController,

        render:
            renderDamageAndLossesController,

        reset:
            resetDamageAndLossesController,

        importData:
            importDamageAndLossesData,

        exportSession:
            exportDamageAndLossesSession,

        importSession:
            importDamageAndLossesSession,

        canExport:
            canExportDamageAndLossesController,
    });

export {
    damageAndLossesReport,
};

export default damageAndLossesReport;
