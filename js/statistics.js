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


/* ESTADO DA TABELA INTERATIVA */

const tableState = {

    sheetName:
        "",

    headers:
        [],

    rows:
        [],

    filters:
        [],

    columnCount:
        0,

    sortColumn:
        null,

    sortDirection:
        "asc"
};


const naturalCollator =
    new Intl.Collator(
        "pt-BR",
        {
            numeric:
                true,

            sensitivity:
                "base"
        }
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


/* NORMALIZA UM VALOR PARA PESQUISA */

function normalizeSearchValue(
    value
) {

    return formatCellValue(
        value
    )
        .normalize(
            "NFD"
        )
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .toLowerCase();
}


/* RETORNA O ÍCONE DA ORDENAÇÃO */

function getSortIndicator(
    columnIndex
) {

    if (
        tableState.sortColumn !==
        columnIndex
    ) {

        return "↕";
    }


    return tableState.sortDirection ===
        "asc"
            ? "↑"
            : "↓";
}


/* ALTERA A ORDENAÇÃO DA TABELA */

function changeSort(
    columnIndex
) {

    if (
        tableState.sortColumn ===
        columnIndex
    ) {

        tableState.sortDirection =
            tableState.sortDirection ===
            "asc"
                ? "desc"
                : "asc";

    }
    else {

        tableState.sortColumn =
            columnIndex;

        tableState.sortDirection =
            "asc";
    }


    renderTableHeader();
    renderTableBody();
}


/* MONTA OS CABEÇALHOS E FILTROS */

function renderTableHeader() {

    const tableHead =
        table.querySelector(
            "thead"
        );

    const headerRow =
        document.createElement(
            "tr"
        );

    const filterRow =
        document.createElement(
            "tr"
        );


    filterRow.classList.add(
        "statistics-filter-row"
    );


    tableHead.replaceChildren();


    for (
        let columnIndex = 0;
        columnIndex < tableState.columnCount;
        columnIndex += 1
    ) {

        const headerCell =
            document.createElement(
                "th"
            );

        const sortButton =
            document.createElement(
                "button"
            );

        const sortIndicator =
            document.createElement(
                "span"
            );

        const filterCell =
            document.createElement(
                "th"
            );

        const filterInput =
            document.createElement(
                "input"
            );

        const headerValue =
            tableState.headers[
                columnIndex
            ];


        /* BOTÃO DE ORDENAÇÃO */

        sortButton.type =
            "button";

        sortButton.classList.add(
            "statistics-sort-button"
        );

        sortButton.setAttribute(
            "aria-label",
            `Ordenar pela coluna ${headerValue}`
        );

        sortButton.append(
            document.createTextNode(
                headerValue
            )
        );


        sortIndicator.classList.add(
            "statistics-sort-indicator"
        );

        sortIndicator.textContent =
            getSortIndicator(
                columnIndex
            );


        sortButton.appendChild(
            sortIndicator
        );


        sortButton.addEventListener(
            "click",
            function () {

                changeSort(
                    columnIndex
                );
            }
        );


        headerCell.appendChild(
            sortButton
        );

        headerRow.appendChild(
            headerCell
        );


        /* CAMPO DE FILTRO */

        filterInput.type =
            "search";

        filterInput.classList.add(
            "statistics-column-filter"
        );

        filterInput.placeholder =
            "Filtrar...";

        filterInput.value =
            tableState.filters[
                columnIndex
            ];

        filterInput.setAttribute(
            "aria-label",
            `Filtrar coluna ${headerValue}`
        );


        filterInput.addEventListener(
            "input",
            function () {

                tableState.filters[
                    columnIndex
                ] = filterInput.value;

                renderTableBody();
            }
        );


        filterCell.appendChild(
            filterInput
        );

        filterRow.appendChild(
            filterCell
        );
    }


    tableHead.append(
        headerRow,
        filterRow
    );
}


/* APLICA OS FILTROS */

function getFilteredRows() {

    return tableState.rows.filter(
        function (
            row
        ) {

            return tableState.filters.every(
                function (
                    filterValue,
                    columnIndex
                ) {

                    const normalizedFilter =
                        normalizeSearchValue(
                            filterValue
                        ).trim();


                    if (!normalizedFilter) {

                        return true;
                    }


                    return normalizeSearchValue(
                        row[columnIndex]
                    ).includes(
                        normalizedFilter
                    );
                }
            );
        }
    );
}


/* ORDENA OS REGISTROS */

function getSortedRows(
    rows
) {

    if (
        tableState.sortColumn ===
        null
    ) {

        return rows;
    }


    const sortedRows =
        [...rows];

    const columnIndex =
        tableState.sortColumn;


    sortedRows.sort(
        function (
            firstRow,
            secondRow
        ) {

            const firstValue =
                formatCellValue(
                    firstRow[columnIndex]
                ).trim();

            const secondValue =
                formatCellValue(
                    secondRow[columnIndex]
                ).trim();


            /* VALORES VAZIOS FICAM POR ÚLTIMO */

            if (
                !firstValue &&
                secondValue
            ) {

                return 1;
            }


            if (
                firstValue &&
                !secondValue
            ) {

                return -1;
            }


            const comparison =
                naturalCollator.compare(
                    firstValue,
                    secondValue
                );


            return tableState.sortDirection ===
                "asc"
                    ? comparison
                    : -comparison;
        }
    );


    return sortedRows;
}


/* MONTA AS LINHAS VISÍVEIS */

function renderTableBody() {

    const tableBody =
        table.querySelector(
            "tbody"
        );


    /* FILTRA TODOS OS REGISTROS */

    const filteredRows =
        getFilteredRows();


    /* ORDENA O RESULTADO DO FILTRO */

    const sortedRows =
        getSortedRows(
            filteredRows
        );


    /* LIMITA APENAS A RENDERIZAÇÃO */

    const visibleRows =
        sortedRows.slice(
            0,
            MAX_PREVIEW_ROWS
        );


    tableBody.replaceChildren();


    /* NENHUM RESULTADO */

    if (visibleRows.length === 0) {

        const emptyRow =
            document.createElement(
                "tr"
            );

        const emptyCell =
            createCell(
                "td",
                "Nenhum resultado encontrado para os filtros aplicados."
            );


        emptyRow.classList.add(
            "statistics-empty-row"
        );

        emptyCell.colSpan =
            tableState.columnCount;

        emptyRow.appendChild(
            emptyCell
        );

        tableBody.appendChild(
            emptyRow
        );

    }

    /* RESULTADOS ENCONTRADOS */

    else {

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
                    columnIndex < tableState.columnCount;
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
    }


    /* ATUALIZA O RESUMO */

    const totalRows =
        tableState.rows.length;

    const filteredRowCount =
        filteredRows.length;

    const isFiltered =
        tableState.filters.some(
            function (
                filterValue
            ) {

                return normalizeSearchValue(
                    filterValue
                ).trim().length > 0;
            }
        );


    const previewLimitMessage =
        filteredRowCount > MAX_PREVIEW_ROWS
            ? ` • exibindo as primeiras ${MAX_PREVIEW_ROWS}`
            : "";


    previewSummary.textContent =
        isFiltered
            ? `${tableState.sheetName} • ${filteredRowCount} de ${totalRows} linhas • ${tableState.columnCount} colunas${previewLimitMessage}`
            : `${tableState.sheetName} • ${totalRows} linhas • ${tableState.columnCount} colunas${previewLimitMessage}`;
}


/* MONTA A TABELA INTERATIVA */

function renderTable(
    rows,
    sheetName
) {

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


    /* SALVA OS DADOS NO ESTADO */

    tableState.sheetName =
        sheetName;

    tableState.columnCount =
        columnCount;


    tableState.headers =
        Array.from(
            {
                length:
                    columnCount
            },
            function (
                unusedValue,
                columnIndex
            ) {

                return formatCellValue(
                    headerValues[columnIndex]
                ).trim() ||
                `Coluna ${columnIndex + 1}`;
            }
        );


    tableState.rows =
        rows.slice(
            1
        );


    tableState.filters =
        Array(
            columnCount
        ).fill(
            ""
        );


    tableState.sortColumn =
        null;

    tableState.sortDirection =
        "asc";


    renderTableHeader();

    renderTableBody();


    preview.hidden =
        false;
}


/* LIMPA O ESTADO DA TABELA */

function resetTableState() {

    tableState.sheetName =
        "";

    tableState.headers =
        [];

    tableState.rows =
        [];

    tableState.filters =
        [];

    tableState.columnCount =
        0;

    tableState.sortColumn =
        null;

    tableState.sortDirection =
        "asc";
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


    resetTableState();


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

    /* VERIFICA O FORMATO */

    if (!isSupportedFile(file)) {

        throw new Error(
            "Formato não suportado. Selecione um arquivo .xlsx ou .xls."
        );
    }


    /* VERIFICA O SHEETJS */

    if (!window.XLSX) {

        throw new Error(
            "A biblioteca de leitura de planilhas não foi carregada."
        );
    }


    /* LÊ O ARQUIVO LOCAL */

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


    /* PRIMEIRA ABA */

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


    /* CONVERTE A PLANILHA EM MATRIZ */

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


    /* VERIFICA SE O SHEETJS FOI CARREGADO */

    if (!window.XLSX) {

        fileInput.disabled =
            true;


        setStatus(
            "Não foi possível carregar a biblioteca de leitura de planilhas.",
            true
        );


        return;
    }


    /* SELECIONA UM ARQUIVO */

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


                resetTableState();


                previewSummary.textContent =
                    "";


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


    /* LIMPA O ARQUIVO */

    clearButton.addEventListener(
        "click",
        clearImportedFile
    );
}


/* INICIALIZA */

initializeStatisticsImporter();
