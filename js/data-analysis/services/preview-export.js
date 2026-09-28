function getXlsxLibrary() {
    if (!window.XLSX) {
        throw new Error(
            "A biblioteca de exportação não foi carregada.",
        );
    }

    return window.XLSX;
}

function createSafeFileBaseName(
    fileName,
) {
    const lastDotPosition =
        String(fileName)
            .lastIndexOf(".");

    const baseName =
        lastDotPosition > 0
            ? String(fileName).slice(
                0,
                lastDotPosition,
            )
            : String(fileName);

    return baseName
        .replace(
            /[<>:"/\\|?*\u0000-\u001F]/g,
            "_",
        )
        .trim() || "planilha";
}

function downloadBlob(
    blob,
    fileName,
) {
    const downloadUrl =
        URL.createObjectURL(blob);

    const downloadLink =
        document.createElement("a");

    downloadLink.href = downloadUrl;
    downloadLink.download = fileName;

    document.body.appendChild(
        downloadLink,
    );

    downloadLink.click();
    downloadLink.remove();

    window.setTimeout(
        function () {
            URL.revokeObjectURL(
                downloadUrl,
            );
        },
        0,
    );
}

function createWorksheet(
    exportData,
) {
    const xlsx =
        getXlsxLibrary();

    return xlsx.utils
        .aoa_to_sheet(
            exportData.matrix,
        );
}

function savePreviewAsCsv(
    exportData,
    sourceFileName,
) {
    const xlsx =
        getXlsxLibrary();

    const worksheet =
        createWorksheet(
            exportData,
        );

    const csvContent =
        xlsx.utils.sheet_to_csv(
            worksheet,
        );

    const csvBlob = new Blob(
        [
            "\uFEFF",
            csvContent,
        ],
        {
            type:
                "text/csv;charset=utf-8",
        },
    );

    const fileName =
        `${createSafeFileBaseName(sourceFileName)}_filtrado.csv`;

    downloadBlob(
        csvBlob,
        fileName,
    );

    return fileName;
}

async function writeClipboardText(
    text,
) {
    if (
        navigator.clipboard &&
        typeof navigator.clipboard
            .writeText === "function"
    ) {
        await navigator.clipboard
            .writeText(text);

        return;
    }

    const textArea =
        document.createElement(
            "textarea",
        );

    textArea.value = text;
    textArea.setAttribute(
        "readonly",
        "",
    );
    textArea.style.position =
        "fixed";
    textArea.style.opacity = "0";

    document.body.appendChild(
        textArea,
    );

    textArea.select();

    const copied =
        document.execCommand(
            "copy",
        );

    textArea.remove();

    if (!copied) {
        throw new Error(
            "O navegador não permitiu copiar os dados.",
        );
    }
}

async function copyPreviewData(
    exportData,
) {
    const xlsx =
        getXlsxLibrary();

    const worksheet =
        createWorksheet(
            exportData,
        );

    const clipboardContent =
        xlsx.utils.sheet_to_csv(
            worksheet,
            {
                FS: "\t",
                RS: "\n",
            },
        );

    await writeClipboardText(
        clipboardContent,
    );
}

export {
    copyPreviewData,
    savePreviewAsCsv,
};
