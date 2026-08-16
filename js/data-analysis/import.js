/* FORMATOS ACEITOS */

const SUPPORTED_EXTENSIONS =
    new Set([
        "xlsx",
        "xls",
        "csv",
    ]);

/* ELEMENTOS DA IMPORTAÇÃO */

const fileInput =
    document.getElementById(
        "statisticsFileInput",
    );

const dropZone =
    document.getElementById(
        "statisticsDropZone",
    );

const clearButton =
    document.getElementById(
        "statisticsClearFile",
    );

const statisticsPanel =
    document.getElementById(
        "statistics",
    );

/* ESTADO DA ÁREA DE IMPORTAÇÃO */

let dropZoneDragDepth = 0;

/* VERIFICA A EXTENSÃO DO ARQUIVO */

function isSupportedFile(file) {
    const extension =
        file.name
            .split(".")
            .pop()
            ?.toLowerCase();

    return SUPPORTED_EXTENSIONS.has(
        extension,
    );
}

/* REMOVE OS DADOS DA TELA */

function clearImportedFile() {
    setDownloadButtonsDisabled(
        true,
    );

    clearFiltersButton.disabled =
        true;

    const tableHead =
        table.querySelector("thead");

    const tableBody =
        table.querySelector("tbody");

    fileInput.value = "";

    tableHead.replaceChildren();

    tableBody.replaceChildren();

    resetTableState();

    clearQuickAnalysis();

    clearChartPanel();

    clearComparisonPanel();

    previewSummary.textContent =
        "";

    preview.hidden = true;

    clearButton.disabled = true;

    statisticsPanel.classList.add("no-file");

    dropZoneDragDepth = 0;

    dropZone.classList.remove(
        "is-drag-over",
    );

    setStatus(
        "Nenhum arquivo selecionado, escolha um arquivo para começar.",
    );
}

/* LÊ O ARQUIVO SELECIONADO */

async function readSelectedFile(
    file,) {
    if (!isSupportedFile(file)) {
        throw new Error(
            "Formato não suportado. Selecione um arquivo .xlsx, .xls ou .csv.",
        );
    }

    if (!window.XLSX) {
        throw new Error(
            "A biblioteca de leitura de planilhas não foi carregada.",
        );
    }

    const fileData =
        await file.arrayBuffer();

    const workbook =
        window.XLSX.read(
            fileData,
            {
                cellDates: true,

                cellFormula:
                    false,
            },
        );

    const sheetName =
        workbook.SheetNames[0];

    if (!sheetName) {
        throw new Error(
            "O arquivo não possui nenhuma aba.",
        );
    }

    const worksheet =
        workbook.Sheets[
            sheetName
        ];

    const rows =
        window.XLSX.utils.sheet_to_json(
            worksheet,
            {
                header: 1,

                defval: "",

                raw: false,

                blankrows:
                    false,
            },
        );

    if (rows.length === 0) {
        throw new Error(
            "A primeira aba do arquivo está vazia.",
        );
    }

    tableState.sourceFileName =
        file.name;

    renderTable(
        rows,
        sheetName,
    );

    statisticsPanel.classList.remove("no-file");

    clearButton.disabled =
        false;

    setStatus(
        `Arquivo "${file.name}" carregado localmente com sucesso.`,
    );
}

/* PROCESSA UM ARQUIVO IMPORTADO */

async function importStatisticsFile(
    file,) {
    if (!file) {
        return;
    }

    setStatus(
        `Lendo "${file.name}"...`,
    );

    try {
        await readSelectedFile(
            file,
        );
    } catch (error) {
        clearImportedFile();

        setStatus(
            error instanceof Error
                ? error.message
                : "Não foi possível ler o arquivo selecionado.",
            true,
        );
    }
}

/* IMPEDE O COMPORTAMENTO PADRÃO DO NAVEGADOR */

function preventDropZoneDefault(
    event,) {
    event.preventDefault();

    event.stopPropagation();
}

/* DESTACA A ÁREA DE IMPORTAÇÃO */

function handleDropZoneDragEnter(
    event,) {
    preventDropZoneDefault(
        event,
    );

    dropZoneDragDepth += 1;

    dropZone.classList.add(
        "is-drag-over",
    );
}

/* MANTÉM O ARQUIVO COMO UMA OPERAÇÃO DE CÓPIA */

function handleDropZoneDragOver(
    event,) {
    preventDropZoneDefault(
        event,
    );

    if (event.dataTransfer) {
        event.dataTransfer.dropEffect =
            "copy";
    }
}

/* REMOVE O DESTAQUE DA ÁREA DE IMPORTAÇÃO */

function handleDropZoneDragLeave(
    event,) {
    preventDropZoneDefault(
        event,
    );

    dropZoneDragDepth =
        Math.max(
            0,
            dropZoneDragDepth - 1,
        );

    if (dropZoneDragDepth > 0) {
        return;
    }

    dropZone.classList.remove(
        "is-drag-over",
    );
}

/* RECEBE O ARQUIVO SOLTO NA ÁREA */

async function handleDropZoneDrop(
    event,) {
    preventDropZoneDefault(
        event,
    );

    dropZoneDragDepth = 0;

    dropZone.classList.remove(
        "is-drag-over",
    );

    const files =
        event.dataTransfer?.files;

    if (!files || files.length === 0) {
        return;
    }

    if (files.length > 1) {
        setStatus(
            "Solte apenas um arquivo por vez.",
            true,
        );

        return;
    }

    await importStatisticsFile(
        files[0],
    );
}
