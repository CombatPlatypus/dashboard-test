import {
    importDamageAndLossesFile,
} from "../damage-and-losses/import.js";

function initializeLossesRateImport(
    rootElement = document,
) {
    const importButton =
        rootElement.querySelector(
            "#lossesRateImportActionButton",
        );

    const fileInput =
        rootElement.querySelector(
            "#lossesRateFileInput",
        );

    if (
        !(importButton instanceof
            HTMLButtonElement) ||
        !(fileInput instanceof
            HTMLInputElement)
    ) {
        return false;
    }

    if (
        fileInput.dataset
            .lossesRateImportInitialized ===
        "true"
    ) {
        return true;
    }

    fileInput.dataset
        .lossesRateImportInitialized =
            "true";

    importButton.addEventListener(
        "click",
        function () {
            fileInput.click();
        },
    );

    fileInput.addEventListener(
        "change",
        async function () {
            const file =
                fileInput.files?.[0];

            if (!file) {
                return;
            }

            try {
                await importDamageAndLossesFile(
                    file,
                    importButton,
                );
            } finally {
                fileInput.value = "";
            }
        },
    );

    return true;
}

export {
    initializeLossesRateImport,
};
