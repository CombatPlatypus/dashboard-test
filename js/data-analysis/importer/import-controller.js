import {
    readSpreadsheetFile,
} from "../services/workbook-reader.js";

function requireElement(
    rootElement,
    selector,
) {
    const element =
        rootElement.querySelector(
            selector,
        );

    if (!element) {
        throw new Error(
            `Elemento da importação não encontrado: ${selector}`,
        );
    }

    return element;
}

function initializeImportModule({
    rootElement,
    store,
    notification,
}) {
    const importButton =
        requireElement(
            rootElement,
            "#analysisImportButton",
        );

    const fileInput =
        requireElement(
            rootElement,
            "#analysisFileInput",
        );

    const clearButton =
        requireElement(
            rootElement,
            "#analysisClearButton",
        );

    let importSequence = 0;
    let importing = false;

    function setImporting(nextImporting) {
        importing = nextImporting;

        importButton.disabled =
            importing;

        clearButton.disabled =
            importing ||
            !store.getSnapshot()
                .hasData;
    }

    async function importFile(file) {
        if (!file) {
            return;
        }

        const currentImport =
            ++importSequence;

        setImporting(true);

        notification.set(
            `Lendo "${file.name}"...`,
            "info",
        );

        try {
            const dataset =
                await readSpreadsheetFile(
                    file,
                );

            if (
                currentImport !==
                importSequence
            ) {
                return;
            }

            store.setDataset(dataset);

            notification.set(
                `Arquivo "${dataset.sourceFileName}" importado: página "${dataset.sheetName}", ${dataset.rows.length} linha(s) e ${dataset.columnCount} coluna(s).`,
                "success",
            );
        } catch (error) {
            if (
                currentImport !==
                importSequence
            ) {
                return;
            }

            notification.set(
                error instanceof Error
                    ? error.message
                    : "Não foi possível importar o arquivo selecionado.",
                "error",
            );
        } finally {
            if (
                currentImport ===
                importSequence
            ) {
                setImporting(false);
            }

            fileInput.value = "";
        }
    }

    importButton.addEventListener(
        "click",
        function () {
            if (importing) {
                return;
            }

            fileInput.click();
        },
    );

    fileInput.addEventListener(
        "change",
        async function () {
            const file =
                fileInput.files?.[0];

            await importFile(file);
        },
    );

    clearButton.addEventListener(
        "click",
        function () {
            importSequence += 1;
            setImporting(false);

            fileInput.value = "";
            store.clearDataset();

            notification.set(
                "O arquivo importado e os controles da análise foram descartados.",
                "success",
            );
        },
    );

    if (
        !window.XLSX ||
        typeof window.XLSX.read !==
            "function"
    ) {
        importButton.disabled = true;

        notification.set(
            "Não foi possível carregar a biblioteca de leitura de planilhas.",
            "error",
        );
    }

    return Object.freeze({
        importFile,
    });
}

export {
    initializeImportModule,
};
