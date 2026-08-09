const MAX_PREVIEW_ROWS = 500;

const MAX_FREQUENCY_ROWS = 25;

const SUPPORTED_EXTENSIONS = new Set(["xlsx", "xls", "csv"]);


/* LOCALIZA OS ELEMENTOS DO PAINEL */

const fileInput =
    document.getElementById("statisticsFileInput");

const clearButton =
    document.getElementById("statisticsClearFile");

const fileStatus =
    document.getElementById("statisticsFileStatus");

const preview =
    document.getElementById("statisticsLocalPreview");

const previewSummary =
    document.getElementById("statisticsPreviewSummary");

const table =
    document.getElementById("statisticsLocalTable");

const quickAnalysis =
    document.getElementById("statisticsQuickAnalysis");

const analysisColumns =
    document.getElementById("statisticsAnalysisColumns");

const selectAllColumnsButton =
    document.getElementById("statisticsSelectAllColumns");

const clearColumnsButton =
    document.getElementById("statisticsClearColumns");

const totalRecords =
    document.getElementById("statisticsTotalRecords");

const analysisCards =
    document.getElementById("statisticsAnalysisCards");

const analysisResults =
    document.getElementById("statisticsAnalysisResults");

const analysisEmpty =
    document.getElementById("statisticsAnalysisEmpty");


/* ESTADO DA TABELA INTERATIVA */

const tableState = {

    sheetName:
        "",

    headers:
        [],

    rows:
        [],

    columnProfiles:
        [],

    selectedAnalysisColumns:
        new Set(),

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


/* CRIA UMA CÉLULA */

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


/* AGRUPA OS VALORES DE UMA COLUNA */

function createFrequencyData(
    rows,
    columnIndex
) {

    if (columnIndex < 0) {

        return [];
    }


    const groups =
        new Map();


    rows.forEach(
        function (
            row
        ) {

            const displayValue =
                formatCellValue(
                    row[columnIndex]
                ).trim();


            if (!displayValue) {

                return;
            }


            const normalizedValue =
                normalizeSearchValue(
                    displayValue
                ).trim();


            if (
                groups.has(
                    normalizedValue
                )
            ) {

                groups.get(
                    normalizedValue
                ).count += 1;

                return;
            }


            groups.set(
                normalizedValue,
                {
                    label:
                        displayValue,

                    count:
                        1
                }
            );
        }
    );


    return Array.from(
        groups.values()
    ).sort(
        function (
            firstGroup,
            secondGroup
        ) {

            return (
                secondGroup.count -
                    firstGroup.count ||

                naturalCollator.compare(
                    firstGroup.label,
                    secondGroup.label
                )
            );
        }
    );
}


/* MONTA UMA TABELA DE AGRUPAMENTO */

function renderFrequencyTable(
    tableBody,
    frequencyData,
    emptyMessage
) {

    tableBody.replaceChildren();


    if (
        frequencyData.length === 0
    ) {

        const row =
            document.createElement(
                "tr"
            );

        const cell =
            createCell(
                "td",
                emptyMessage
            );


        cell.colSpan =
            2;

        cell.classList.add(
            "statistics-summary-empty"
        );


        row.appendChild(
            cell
        );

        tableBody.appendChild(
            row
        );

        return;
    }


    const fragment =
        document.createDocumentFragment();


    frequencyData.forEach(
        function (
            group
        ) {

            const row =
                document.createElement(
                    "tr"
                );


            row.appendChild(
                createCell(
                    "td",
                    group.label
                )
            );


            row.appendChild(
                createCell(
                    "td",
                    group.count
                )
            );


            fragment.appendChild(
                row
            );
        }
    );


    tableBody.appendChild(
        fragment
    );
}


/* VERIFICA SE UMA CÉLULA ESTÁ VAZIA */

function isEmptyCell(
    value
) {

    return formatCellValue(
        value
    ).trim() === "";
}


/* CONVERTE UM VALOR NUMÉRICO */

function parseNumericValue(
    value
) {

    if (
        typeof value === "number" &&
        Number.isFinite(value)
    ) {

        return value;
    }


    if (
        value instanceof Date ||
        isEmptyCell(value)
    ) {

        return null;
    }


    let normalizedValue =
        formatCellValue(
            value
        )
            .trim()
            .replace(
                /\s|\u00a0/g,
                ""
            )
            .replace(
                /^R\$/i,
                ""
            )
            .replace(
                /%$/,
                ""
            );


    if (
        !/^[+-]?\d[\d.,]*$/.test(
            normalizedValue
        )
    ) {

        return null;
    }


    const lastComma =
        normalizedValue.lastIndexOf(
            ","
        );


    const lastDot =
        normalizedValue.lastIndexOf(
            "."
        );


    if (
        lastComma >= 0 &&
        lastDot >= 0
    ) {

        const decimalSeparator =
            lastComma > lastDot
                ? ","
                : ".";


        const thousandsSeparator =
            decimalSeparator === ","
                ? "."
                : ",";


        normalizedValue =
            normalizedValue
                .replaceAll(
                    thousandsSeparator,
                    ""
                )
                .replace(
                    decimalSeparator,
                    "."
                );

    }
    else if (
        lastComma >= 0
    ) {

        normalizedValue =
            normalizedValue
                .replaceAll(
                    ".",
                    ""
                )
                .replace(
                    ",",
                    "."
                );

    }
    else {

        normalizedValue =
            normalizedValue.replaceAll(
                ",",
                ""
            );
    }


    const numericValue =
        Number(
            normalizedValue
        );


    return Number.isFinite(
        numericValue
    )
        ? numericValue
        : null;
}


/* CONVERTE UMA DATA OU DATA/HORA */

function parseDateValue(
    value
) {

    if (
        value instanceof Date &&
        !Number.isNaN(
            value.getTime()
        )
    ) {

        return value;
    }


    const displayValue =
        formatCellValue(
            value
        ).trim();


    if (!displayValue) {

        return null;
    }


    const dateMatch =
        displayValue.match(
            /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
        ) ||

        displayValue.match(
            /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
        );


    if (!dateMatch) {

        return null;
    }


    const startsWithYear =
        dateMatch[1].length === 4;


    let year =
        Number(
            startsWithYear
                ? dateMatch[1]
                : dateMatch[3]
        );


    if (
        year < 100
    ) {

        year +=
            year >= 70
                ? 1900
                : 2000;
    }


    const month =
        Number(
            dateMatch[2]
        );


    const day =
        Number(
            startsWithYear
                ? dateMatch[3]
                : dateMatch[1]
        );


    const hour =
        Number(
            dateMatch[4] ?? 0
        );


    const minute =
        Number(
            dateMatch[5] ?? 0
        );


    const second =
        Number(
            dateMatch[6] ?? 0
        );


    const parsedDate =
        new Date(
            year,
            month - 1,
            day,
            hour,
            minute,
            second
        );


    if (
        parsedDate.getFullYear() !== year ||
        parsedDate.getMonth() !== month - 1 ||
        parsedDate.getDate() !== day ||
        parsedDate.getHours() !== hour ||
        parsedDate.getMinutes() !== minute ||
        parsedDate.getSeconds() !== second
    ) {

        return null;
    }


    return parsedDate;
}


/* RETORNA O NOME VISÍVEL DO TIPO */

function getColumnTypeLabel(
    type
) {

    const labels = {

        category:
            "Categoria",

        identifier:
            "Identificador",

        number:
            "Número",

        datetime:
            "Data/hora",

        empty:
            "Vazia"
    };


    return labels[type] ??
        "Texto";
}


/* DETECTA O TIPO DE UMA COLUNA */

function detectColumnProfile(
    columnIndex
) {

    const filledValues =
        tableState.rows
            .map(
                function (
                    row
                ) {

                    return row[
                        columnIndex
                    ];
                }
            )
            .filter(
                function (
                    value
                ) {

                    return !isEmptyCell(
                        value
                    );
                }
            );


    if (
        filledValues.length === 0
    ) {

        return {
            type:
                "empty",

            hasTime:
                false
        };
    }


    const dateValues =
        filledValues.filter(
            function (
                value
            ) {

                return parseDateValue(
                    value
                ) !== null;
            }
        );


    const numericValues =
        filledValues.filter(
            function (
                value
            ) {

                return parseNumericValue(
                    value
                ) !== null;
            }
        );


    const uniqueValues =
        new Set(
            filledValues.map(
                function (
                    value
                ) {

                    return normalizeSearchValue(
                        value
                    ).trim();
                }
            )
        );


    const uniqueRatio =
        uniqueValues.size /
        filledValues.length;


    const headerValue =
        normalizeSearchValue(
            tableState.headers[
                columnIndex
            ]
        ).trim();


    const identifierHeader =
        /^(id|codigo|code|pacotes?|packages?|pedidos?|orders?|at\/to|serial(?: number)?|tracking(?: number)?|uuid|chave|key|referencia|reference)$/.test(
            headerValue
        ) ||

        /(^|[\s_-])(id|codigo|code)$/.test(
            headerValue
        );


    if (
        dateValues.length /
            filledValues.length >= 0.8
    ) {

        return {
            type:
                "datetime",

            hasTime:
                filledValues.some(
                    function (
                        value
                    ) {

                        return /\d{1,2}:\d{2}/.test(
                            formatCellValue(
                                value
                            )
                        );
                    }
                )
        };
    }


    if (
        numericValues.length /
            filledValues.length >= 0.8
    ) {

        return {
            type:
                identifierHeader &&
                uniqueRatio >= 0.8
                    ? "identifier"
                    : "number",

            hasTime:
                false
        };
    }


    return {
        type:
            uniqueRatio >= 0.8 &&
            identifierHeader
                ? "identifier"
                : "category",

        hasTime:
            false
    };
}


/* FORMATA UM NÚMERO DA ANÁLISE */

function formatAnalysisNumber(
    value
) {

    if (
        !Number.isFinite(
            value
        )
    ) {

        return "—";
    }


    return new Intl.NumberFormat(
        "pt-BR",
        {
            maximumFractionDigits:
                2
        }
    ).format(
        value
    );
}


/* FORMATA UMA DATA DA ANÁLISE */

function formatAnalysisDate(
    value,
    hasTime
) {

    if (
        !(value instanceof Date)
    ) {

        return "—";
    }


    return new Intl.DateTimeFormat(
        "pt-BR",

        hasTime
            ? {
                dateStyle:
                    "short",

                timeStyle:
                    "medium"
            }
            : {
                dateStyle:
                    "short"
            }
    ).format(
        value
    );
}


/* CRIA UM CARTÃO DA ANÁLISE */

function createAnalysisCard(
    label,
    value
) {

    const card =
        document.createElement(
            "div"
        );


    const cardLabel =
        document.createElement(
            "span"
        );


    const cardValue =
        document.createElement(
            "strong"
        );


    card.classList.add(
        "statistics-summary-card"
    );


    cardLabel.textContent =
        label;


    cardValue.textContent =
        value;


    card.append(
        cardLabel,
        cardValue
    );


    return card;
}


/* CRIA UM BLOCO DA ANÁLISE */

function createAnalysisBlock(
    title,
    type
) {

    const block =
        document.createElement(
            "div"
        );


    const heading =
        document.createElement(
            "h4"
        );


    const typeLabel =
        document.createElement(
            "span"
        );


    block.classList.add(
        "statistics-summary-block"
    );


    heading.append(
        document.createTextNode(
            title
        )
    );


    typeLabel.classList.add(
        "statistics-analysis-type"
    );


    typeLabel.textContent =
        getColumnTypeLabel(
            type
        );


    heading.appendChild(
        typeLabel
    );


    block.appendChild(
        heading
    );


    return block;
}


/* ADICIONA MÉTRICAS A UM BLOCO */

function appendAnalysisMetrics(
    block,
    metrics
) {

    const metricsContainer =
        document.createElement(
            "div"
        );


    metricsContainer.classList.add(
        "statistics-analysis-metrics"
    );


    metrics.forEach(
        function (
            metric
        ) {

            const metricElement =
                document.createElement(
                    "div"
                );


            const metricLabel =
                document.createElement(
                    "span"
                );


            const metricValue =
                document.createElement(
                    "strong"
                );


            metricElement.classList.add(
                "statistics-analysis-metric"
            );


            metricLabel.textContent =
                metric.label;


            metricValue.textContent =
                metric.value;


            metricValue.title =
                metric.value;


            metricElement.append(
                metricLabel,
                metricValue
            );


            metricsContainer.appendChild(
                metricElement
            );
        }
    );


    block.appendChild(
        metricsContainer
    );
}


/* ADICIONA UMA TABELA DE FREQUÊNCIA A UM BLOCO */

function appendFrequencyAnalysis(
    block,
    frequencyData,
    emptyMessage
) {

    const frequencyTable =
        document.createElement(
            "table"
        );


    const tableHead =
        document.createElement(
            "thead"
        );


    const headerRow =
        document.createElement(
            "tr"
        );


    const tableBody =
        document.createElement(
            "tbody"
        );


    frequencyTable.classList.add(
        "statistics-summary-table"
    );


    headerRow.append(
        createCell(
            "th",
            "Valor"
        ),

        createCell(
            "th",
            "Quantidade"
        )
    );


    tableHead.appendChild(
        headerRow
    );


    frequencyTable.append(
        tableHead,
        tableBody
    );


    renderFrequencyTable(
        tableBody,

        frequencyData.slice(
            0,
            MAX_FREQUENCY_ROWS
        ),

        emptyMessage
    );


    block.appendChild(
        frequencyTable
    );


    if (
        frequencyData.length >
        MAX_FREQUENCY_ROWS
    ) {

        const note =
            document.createElement(
                "p"
            );


        note.classList.add(
            "statistics-analysis-note"
        );


        note.textContent =
            `Exibindo ${MAX_FREQUENCY_ROWS} de ${frequencyData.length} valores.`;


        block.appendChild(
            note
        );
    }
}


/* MONTA OS CHECKBOXES DAS COLUNAS */

function renderAnalysisColumnSelector() {

    analysisColumns.replaceChildren();


    const fragment =
        document.createDocumentFragment();


    tableState.headers.forEach(
        function (
            header,
            columnIndex
        ) {

            const option =
                document.createElement(
                    "div"
                );


            const label =
                document.createElement(
                    "label"
                );


            const checkbox =
                document.createElement(
                    "input"
                );


            const columnName =
                document.createElement(
                    "span"
                );


            const columnType =
                document.createElement(
                    "span"
                );


            const profile =
                tableState.columnProfiles[
                    columnIndex
                ];


            option.classList.add(
                "statistics-column-option"
            );


            checkbox.type =
                "checkbox";


            checkbox.checked =
                tableState
                    .selectedAnalysisColumns
                    .has(
                        columnIndex
                    );


            checkbox.setAttribute(
                "aria-label",
                `Analisar coluna ${header}`
            );


            checkbox.addEventListener(
                "change",
                function () {

                    if (
                        checkbox.checked
                    ) {

                        tableState
                            .selectedAnalysisColumns
                            .add(
                                columnIndex
                            );

                    }
                    else {

                        tableState
                            .selectedAnalysisColumns
                            .delete(
                                columnIndex
                            );
                    }


                    renderQuickAnalysis(
                        getFilteredRows()
                    );
                }
            );


            columnName.classList.add(
                "statistics-column-name"
            );


            columnName.textContent =
                header;


            columnName.title =
                header;


            columnType.classList.add(
                "statistics-column-type"
            );


            columnType.textContent =
                getColumnTypeLabel(
                    profile.type
                );


            label.append(
                checkbox,
                columnName,
                columnType
            );


            option.appendChild(
                label
            );


            fragment.appendChild(
                option
            );
        }
    );


    analysisColumns.appendChild(
        fragment
    );


    const hasColumns =
        tableState.columnCount > 0;


    selectAllColumnsButton.disabled =
        !hasColumns;


    clearColumnsButton.disabled =
        !hasColumns;
}


/* ANALISA UMA COLUNA SELECIONADA */

function renderSelectedColumnAnalysis(
    rows,
    columnIndex
) {

    const header =
        tableState.headers[
            columnIndex
        ];


    const profile =
        tableState.columnProfiles[
            columnIndex
        ];


    const filledValues =
        rows
            .map(
                function (
                    row
                ) {

                    return row[
                        columnIndex
                    ];
                }
            )
            .filter(
                function (
                    value
                ) {

                    return !isEmptyCell(
                        value
                    );
                }
            );


    const emptyCount =
        rows.length -
        filledValues.length;


    const block =
        createAnalysisBlock(
            header,
            profile.type
        );


    if (
        profile.type === "number"
    ) {

        const numericValues =
            filledValues
                .map(
                    parseNumericValue
                )
                .filter(
                    function (
                        value
                    ) {

                        return value !== null;
                    }
                );


        const total =
            numericValues.reduce(
                function (
                    sum,
                    value
                ) {

                    return sum +
                        value;
                },
                0
            );


        const average =
            numericValues.length > 0
                ? total /
                    numericValues.length
                : NaN;


        let minimum =
            NaN;


        let maximum =
            NaN;


        numericValues.forEach(
            function (
                value
            ) {

                minimum =
                    Number.isNaN(
                        minimum
                    )
                        ? value
                        : Math.min(
                            minimum,
                            value
                        );


                maximum =
                    Number.isNaN(
                        maximum
                    )
                        ? value
                        : Math.max(
                            maximum,
                            value
                        );
            }
        );


        analysisCards.appendChild(
            createAnalysisCard(
                `${header} • total`,

                formatAnalysisNumber(
                    total
                )
            )
        );


        appendAnalysisMetrics(
            block,
            [
                {
                    label:
                        "Total",

                    value:
                        formatAnalysisNumber(
                            total
                        )
                },
                {
                    label:
                        "Média",

                    value:
                        formatAnalysisNumber(
                            average
                        )
                },
                {
                    label:
                        "Menor valor",

                    value:
                        formatAnalysisNumber(
                            minimum
                        )
                },
                {
                    label:
                        "Maior valor",

                    value:
                        formatAnalysisNumber(
                            maximum
                        )
                },
                {
                    label:
                        "Valores válidos",

                    value:
                        formatAnalysisNumber(
                            numericValues.length
                        )
                },
                {
                    label:
                        "Células vazias",

                    value:
                        formatAnalysisNumber(
                            emptyCount
                        )
                }
            ]
        );

    }
    else if (
        profile.type === "datetime"
    ) {

        const dateValues =
            filledValues
                .map(
                    parseDateValue
                )
                .filter(
                    function (
                        value
                    ) {

                        return value !== null;
                    }
                );


        const firstDate =
            dateValues.reduce(
                function (
                    earliestDate,
                    currentDate
                ) {

                    return (
                        !earliestDate ||
                        currentDate < earliestDate
                    )
                        ? currentDate
                        : earliestDate;
                },
                null
            );


        const lastDate =
            dateValues.reduce(
                function (
                    latestDate,
                    currentDate
                ) {

                    return (
                        !latestDate ||
                        currentDate > latestDate
                    )
                        ? currentDate
                        : latestDate;
                },
                null
            );


        analysisCards.appendChild(
            createAnalysisCard(
                `${header} • datas válidas`,

                formatAnalysisNumber(
                    dateValues.length
                )
            )
        );


        appendAnalysisMetrics(
            block,
            [
                {
                    label:
                        "Data inicial",

                    value:
                        formatAnalysisDate(
                            firstDate,
                            profile.hasTime
                        )
                },
                {
                    label:
                        "Data final",

                    value:
                        formatAnalysisDate(
                            lastDate,
                            profile.hasTime
                        )
                },
                {
                    label:
                        "Valores válidos",

                    value:
                        formatAnalysisNumber(
                            dateValues.length
                        )
                },
                {
                    label:
                        "Células vazias",

                    value:
                        formatAnalysisNumber(
                            emptyCount
                        )
                }
            ]
        );

    }
    else if (
        profile.type === "category" ||
        profile.type === "identifier"
    ) {

        const frequencyData =
            createFrequencyData(
                rows,
                columnIndex
            );


        const duplicateCount =
            filledValues.length -
            frequencyData.length;


        analysisCards.appendChild(
            createAnalysisCard(
                `${header} • valores únicos`,

                formatAnalysisNumber(
                    frequencyData.length
                )
            )
        );


        if (
            profile.type === "identifier"
        ) {

            appendAnalysisMetrics(
                block,
                [
                    {
                        label:
                            "Preenchidos",

                        value:
                            formatAnalysisNumber(
                                filledValues.length
                            )
                    },
                    {
                        label:
                            "Valores únicos",

                        value:
                            formatAnalysisNumber(
                                frequencyData.length
                            )
                    },
                    {
                        label:
                            "Repetições",

                        value:
                            formatAnalysisNumber(
                                duplicateCount
                            )
                    },
                    {
                        label:
                            "Células vazias",

                        value:
                            formatAnalysisNumber(
                                emptyCount
                            )
                    }
                ]
            );


            const duplicatedValues =
                frequencyData.filter(
                    function (
                        group
                    ) {

                        return group.count > 1;
                    }
                );


            if (
                duplicatedValues.length > 0
            ) {

                appendFrequencyAnalysis(
                    block,
                    duplicatedValues,
                    "Nenhum valor repetido."
                );
            }

        }
        else {

            appendFrequencyAnalysis(
                block,
                frequencyData,
                "Nenhum valor preenchido."
            );
        }

    }
    else {

        analysisCards.appendChild(
            createAnalysisCard(
                `${header} • preenchidos`,
                "0"
            )
        );


        appendAnalysisMetrics(
            block,
            [
                {
                    label:
                        "Valores preenchidos",

                    value:
                        "0"
                },
                {
                    label:
                        "Células vazias",

                    value:
                        formatAnalysisNumber(
                            rows.length
                        )
                }
            ]
        );
    }


    analysisResults.appendChild(
        block
    );
}


/* ATUALIZA A ANÁLISE RÁPIDA */

function renderQuickAnalysis(
    rows
) {

    totalRecords.textContent =
        formatAnalysisNumber(
            rows.length
        );


    analysisCards.replaceChildren();

    analysisResults.replaceChildren();


    const selectedColumns =
        Array.from(
            tableState
                .selectedAnalysisColumns
        ).sort(
            function (
                firstColumn,
                secondColumn
            ) {

                return firstColumn -
                    secondColumn;
            }
        );


    analysisEmpty.hidden =
        selectedColumns.length > 0;


    selectedColumns.forEach(
        function (
            columnIndex
        ) {

            renderSelectedColumnAnalysis(
                rows,
                columnIndex
            );
        }
    );


    quickAnalysis.hidden =
        false;
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


/* ALTERA A ORDENAÇÃO */

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


        /* ORDENAÇÃO */

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


        /* FILTRO */

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
                ] =
                    filterInput.value;


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


                    if (
                        !normalizedFilter
                    ) {

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


    const filteredRows =
        getFilteredRows();


    const sortedRows =
        getSortedRows(
            filteredRows
        );


    const visibleRows =
        sortedRows.slice(
            0,
            MAX_PREVIEW_ROWS
        );


    tableBody.replaceChildren();


    if (
        visibleRows.length === 0
    ) {

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


    /* ATUALIZA A ANÁLISE COM OS DADOS FILTRADOS */

    renderQuickAnalysis(
        filteredRows
    );


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


    if (
        columnCount === 0
    ) {

        throw new Error(
            "A primeira aba do arquivo não possui dados."
        );
    }


    const headerValues =
        rows[0] ??
        [];


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

                return (
                    formatCellValue(
                        headerValues[
                            columnIndex
                        ]
                    ).trim() ||

                    `Coluna ${columnIndex + 1}`
                );
            }
        );


    tableState.rows =
        rows.slice(
            1
        );


    tableState.columnProfiles =
        tableState.headers.map(
            function (
                unusedHeader,
                columnIndex
            ) {

                return detectColumnProfile(
                    columnIndex
                );
            }
        );


    tableState
        .selectedAnalysisColumns
        .clear();


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


    renderAnalysisColumnSelector();

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


    tableState.columnProfiles =
        [];


    tableState
        .selectedAnalysisColumns
        .clear();


    tableState.filters =
        [];


    tableState.columnCount =
        0;


    tableState.sortColumn =
        null;


    tableState.sortDirection =
        "asc";
}


/* LIMPA A ANÁLISE RÁPIDA */

function clearQuickAnalysis() {

    quickAnalysis.hidden =
        true;


    totalRecords.textContent =
        "0";


    analysisColumns.replaceChildren();

    analysisCards.replaceChildren();

    analysisResults.replaceChildren();


    analysisEmpty.hidden =
        false;


    selectAllColumnsButton.disabled =
        true;


    clearColumnsButton.disabled =
        true;
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

    clearQuickAnalysis();


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

    if (
        !isSupportedFile(
            file
        )
    ) {

        throw new Error(
            "Formato não suportado. Selecione um arquivo .xlsx, .xls ou .csv."
        );
    }


    if (
        !window.XLSX
    ) {

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


    if (
        !sheetName
    ) {

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


    if (
        rows.length === 0
    ) {

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
        !table ||
        !quickAnalysis ||
        !analysisColumns ||
        !selectAllColumnsButton ||
        !clearColumnsButton ||
        !totalRecords ||
        !analysisCards ||
        !analysisResults ||
        !analysisEmpty
    ) {

        console.error(
            "Elementos do importador de Estatísticas não foram encontrados."
        );


        return;
    }


    if (
        !window.XLSX
    ) {

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


            if (
                !file
            ) {

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
            catch (
                error
            ) {

                table.querySelector(
                    "thead"
                ).replaceChildren();


                table.querySelector(
                    "tbody"
                ).replaceChildren();


                resetTableState();

                clearQuickAnalysis();


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


    clearButton.addEventListener(
        "click",
        clearImportedFile
    );


    selectAllColumnsButton.addEventListener(
        "click",
        function () {

            tableState.selectedAnalysisColumns =
                new Set(
                    tableState.headers.map(
                        function (
                            unusedHeader,
                            columnIndex
                        ) {

                            return columnIndex;
                        }
                    )
                );


            renderAnalysisColumnSelector();


            renderQuickAnalysis(
                getFilteredRows()
            );
        }
    );


    clearColumnsButton.addEventListener(
        "click",
        function () {

            tableState
                .selectedAnalysisColumns
                .clear();


            renderAnalysisColumnSelector();


            renderQuickAnalysis(
                getFilteredRows()
            );
        }
    );
}


/* INICIALIZA */

initializeStatisticsImporter();
