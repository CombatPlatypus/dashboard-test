const MAX_PREVIEW_ROWS = 500;

const SUPPORTED_EXTENSIONS = new Set([
    "xlsx",
    "xls"
]);


/* LOCALIZA OS ELEMENTOS DO PAINEL */

const fileInput =
    document.getElementById(
        "statisticsFileInput"
    );

const clearButton =
    document.getElementById(
        "statisticsClearFile"
    );

const fileStatus =
    document.getElementById(
        "statisticsFileStatus"
    );

const preview =
    document.getElementById(
        "statisticsLocalPreview"
    );

const previewSummary =
    document.getElementById(
        "statisticsPreviewSummary"
    );

const table =
    document.getElementById(
        "statisticsLocalTable"
    );


/* ATUALIZA A MENSAGEM DO IMPORTADOR */

function setStatus(
    message,
    isError = false
) {

    fileStatus.textContent =
        message;

    fileStatus.classList.toggle(
        "is-error",
        isError
    );
}


/* VERIFICA A EXTENSÃO DO ARQUIVO */

function isSupportedFile(
    file
) {

    const extension =
        file.name
            .split(".")
            .pop()
            ?.toLowerCase();


    return SUPPORTED_EXTENSIONS.has(
        extension
    );
}


/* PREPARA O VALOR PARA EXIBIÇÃO */

function formatCellValue(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";
    }


    return String(
        value
    );
}


/* CRIA UMA CÉLULA SEM INJETAR HTML DO ARQUIVO */

function createCell(
    tagName,
    value
) {

    const cell =
        document.createElement(
            tagName
        );


    cell.textContent =
        formatCellValue(
            value
        );


    return cell;
}


/* MONTA A TABELA DE PRÉVIA */

function renderTable(
    rows,
    sheetName
) {

    const tableHead =
        table.querySelector(
            "thead"
        );

    const tableBody =
        table.querySelector(
            "tbody"
        );


    tableHead.replaceChildren();
    tableBody.replaceChildren();


    const columnCount =
        rows.reduce(
            function (
                largestColumnCount,
                row
            ) {

                return Math.max(
                    largestColumnCount,
                    row.length
                );
            },
            0
        );


    if (columnCount === 0) {

        throw new Error(
            "A primeira aba do arquivo não possui dados."
        );
    }


    const headerValues =
        rows[0] ??
        [];

    const dataRows =
        rows.slice(
            1
        );

    const visibleRows =
        dataRows.slice(
            0,
            MAX_PREVIEW_ROWS
        );


    const headerRow =
        document.createElement(
            "tr"
        );


    for (
        let columnIndex = 0;
        columnIndex < columnCount;
        columnIndex += 1
    ) {

        const headerValue =
            formatCellValue(
                headerValues[columnIndex]
            ).trim() ||
            `Coluna ${columnIndex + 1}`;


        headerRow.appendChild(
            createCell(
                "th",
                headerValue
            )
        );
    }


    tableHead.appendChild(
        headerRow
    );


    const bodyFragment =
        document.createDocumentFragment();


    visibleRows.forEach(
        function (
            row
        ) {

            const tableRow =
                document.createElement(
                    "tr"
                );


            for (
                let columnIndex = 0;
                columnIndex < columnCount;
                columnIndex += 1
            ) {

                tableRow.appendChild(
                    createCell(
                        "td",
                        row[columnIndex]
                    )
                );
            }


            bodyFragment.appendChild(
                tableRow
            );
        }
    );


    tableBody.appendChild(
        bodyFragment
    );


    const previewedRows =
        visibleRows.length;

    const totalRows =
        dataRows.length;


    previewSummary.textContent =
        totalRows > MAX_PREVIEW_ROWS
            ? `${sheetName} • exibindo ${previewedRows} de ${totalRows} linhas • ${columnCount} colunas`
            : `${sheetName} • ${totalRows} linhas • ${columnCount} colunas`;


    preview.hidden =
        false;
}


/* REMOVE OS DADOS DA TELA */

function clearImportedFile() {

    const tableHead =
        table.querySelector(
            "thead"
        );

    const tableBody =
        table.querySelector(
            "tbody"
        );


    fileInput.value =
        "";

    tableHead.replaceChildren();
    tableBody.replaceChildren();

    previewSummary.textContent =
        "";

    preview.hidden =
        true;

    clearButton.disabled =
        true;


    setStatus(
        "Nenhum arquivo selecionado. O arquivo será lido somente neste navegador."
    );
}


/* LÊ O ARQUIVO SELECIONADO */

async function readSelectedFile(
    file
) {

    if (!isSupportedFile(file)) {

        throw new Error(
            "Formato não suportado. Selecione um arquivo .xlsx ou .xls."
        );
    }


    if (!window.XLSX) {

        throw new Error(
            "A biblioteca de leitura de planilhas não foi carregada."
        );
    }


    const fileData =
        await file.arrayBuffer();

    const workbook =
        window.XLSX.read(
            fileData,
            {
                cellDates:
                    true,

                cellFormula:
                    false
            }
        );

    const sheetName =
        workbook.SheetNames[0];


    if (!sheetName) {

        throw new Error(
            "O arquivo não possui nenhuma aba."
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
                header:
                    1,

                defval:
                    "",

                raw:
                    false,

                blankrows:
                    false
            }
        );


    if (rows.length === 0) {

        throw new Error(
            "A primeira aba do arquivo está vazia."
        );
    }


    renderTable(
        rows,
        sheetName
    );


    clearButton.disabled =
        false;


    setStatus(
        `Arquivo "${file.name}" carregado localmente com sucesso.`
    );
}


/* INICIALIZA O IMPORTADOR */

function initializeStatisticsImporter() {

    if (
        !fileInput ||
        !clearButton ||
        !fileStatus ||
        !preview ||
        !previewSummary ||
        !table
    ) {

        console.error(
            "Elementos do importador de Estatísticas não foram encontrados."
        );

        return;
    }


    if (!window.XLSX) {

        fileInput.disabled =
            true;

        setStatus(
            "Não foi possível carregar a biblioteca de leitura de planilhas.",
            true
        );

        return;
    }


    fileInput.addEventListener(
        "change",
        async function () {

            const file =
                fileInput.files?.[0];


            if (!file) {

                return;
            }


            setStatus(
                `Lendo "${file.name}"...`
            );


            try {

                await readSelectedFile(
                    file
                );

            }
            catch (error) {

                table.querySelector(
                    "thead"
                ).replaceChildren();

                table.querySelector(
                    "tbody"
                ).replaceChildren();

                preview.hidden =
                    true;

                clearButton.disabled =
                    false;


                setStatus(
                    error instanceof Error
                        ? error.message
                        : "Não foi possível ler o arquivo selecionado.",
                    true
                );
            }
        }
    );


    clearButton.addEventListener(
        "click",
        clearImportedFile
    );
}


initializeStatisticsImporter();