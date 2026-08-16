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

const clearButton =
    document.getElementById(
        "statisticsClearFile",
    );

const statisticsPanel =
    document.getElementById(
        "statistics",
    );

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

    setStatus(
        "Nenhum arquivo selecionado. O arquivo será lido somente neste navegador.",
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