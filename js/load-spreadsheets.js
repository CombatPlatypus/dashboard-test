import {
    CONFIG
} from "./config.js";


/* DEFINE A PLANILHA UTILIZADA NO PAINEL ESTATÍSTICAS */

const STATISTICS_SPREADSHEET_KEY =
    "resumo-operacao";


/* PADRÕES DE VALIDAÇÃO */

const KEY_PATTERN =
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const SPREADSHEET_ID_PATTERN =
    /^[A-Za-z0-9_-]+$/;

const GID_PATTERN =
    /^\d+$/;

const VISIBLE_VALUES =
    new Set([
        "sim",
        "true",
        "1",
        "yes"
    ]);


/* NORMALIZA OS TEXTOS DA CONFIGURAÇÃO */

function normalizeText(
    value
) {

    return String(
        value ?? ""
    ).trim();
}


/* VERIFICA SE A PLANILHA DEVE APARECER */

function shouldDisplaySpreadsheet(
    value
) {

    const normalizedValue =
        normalizeText(
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


    return VISIBLE_VALUES.has(
        normalizedValue
    );
}


/* MONTA O LINK DA PLANILHA */

function createSpreadsheetUrl(
    spreadsheetId,
    gid
) {

    return (
        "https://docs.google.com/spreadsheets/d/" +
        encodeURIComponent(
            spreadsheetId
        ) +
        "/edit?gid=" +
        encodeURIComponent(
            gid
        ) +
        "#gid=" +
        encodeURIComponent(
            gid
        )
    );
}


/* CONSULTA A PLANILHA DE CONFIGURAÇÃO */

async function getSpreadsheetConfigurations() {

    const spreadsheetId =
        encodeURIComponent(
            CONFIG.google.linksSpreadsheetId
        );

    const spreadsheetRange =
        encodeURIComponent(
            CONFIG.google.linksSpreadsheetRange
        );

    const requestUrl =
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}` +
        `/values/${spreadsheetRange}?majorDimension=ROWS`;


    const response =
        await fetch(
            requestUrl,
            {
                cache:
                    "no-store",

                headers: {
                    "x-goog-api-key":
                        CONFIG.google.sheetsApiKey
                }
            }
        );


    if (!response.ok) {

        let errorMessage =
            `Erro ao consultar configuração: ${response.status}`;

        try {

            const errorData =
                await response.json();

            errorMessage =
                errorData.error?.message ??
                errorMessage;

        }
        catch {

            // MANTÉM A MENSAGEM PADRÃO

        }


        throw new Error(
            errorMessage
        );
    }


    const responseData =
        await response.json();

    const rows =
        responseData.values ??
        [];

    const configurations =
        [];

    const registeredKeys =
        new Set();


    /*
     * AS LINHAS SÃO PERCORRIDAS DE CIMA PARA BAIXO.
     * ESSA SERÁ TAMBÉM A ORDEM DO MENU.
     */

    rows.forEach(
        function (
            row,
            rowIndex
        ) {

            const sheetRowNumber =
                rowIndex + 2;


            // COLUNA F — APARECE NO DASH

            if (
                !shouldDisplaySpreadsheet(
                    row[5]
                )
            ) {

                return;
            }


            // COLUNAS A ATÉ E

            const key =
                normalizeText(
                    row[0]
                );

            const targetSpreadsheetId =
                normalizeText(
                    row[1]
                );

            const gid =
                normalizeText(
                    row[2]
                ) || "0";

            const spreadsheetName =
                normalizeText(
                    row[3]
                );

            const menuName =
                normalizeText(
                    row[4]
                ) || spreadsheetName;


            // VALIDA A CHAVE

            if (
                !KEY_PATTERN.test(
                    key
                )
            ) {

                console.warn(
                    `Linha ${sheetRowNumber} ignorada: chave inválida.`
                );

                return;
            }


            // IMPEDE CHAVES DUPLICADAS

            if (
                registeredKeys.has(
                    key
                )
            ) {

                console.warn(
                    `Linha ${sheetRowNumber} ignorada: chave "${key}" duplicada.`
                );

                return;
            }


            // VALIDA O ID DA PLANILHA

            if (
                !SPREADSHEET_ID_PATTERN.test(
                    targetSpreadsheetId
                )
            ) {

                console.warn(
                    `Linha ${sheetRowNumber} ignorada: ID inválido para "${key}".`
                );

                return;
            }


            // VALIDA O GID

            if (
                !GID_PATTERN.test(
                    gid
                )
            ) {

                console.warn(
                    `Linha ${sheetRowNumber} ignorada: GID inválido para "${key}".`
                );

                return;
            }


            // VALIDA O NOME MOSTRADO NO MENU

            if (!menuName) {

                console.warn(
                    `Linha ${sheetRowNumber} ignorada: nome do menu não informado.`
                );

                return;
            }


            registeredKeys.add(
                key
            );


            configurations.push({

                key,

                spreadsheetId:
                    targetSpreadsheetId,

                gid,

                spreadsheetName:
                    spreadsheetName ||
                    menuName,

                menuName,

                url:
                    createSpreadsheetUrl(
                        targetSpreadsheetId,
                        gid
                    )
            });
        }
    );


    if (
        configurations.length ===
        0
    ) {

        throw new Error(
            "A configuração não retornou nenhuma planilha visível e válida."
        );
    }


    return configurations;
}


/* CRIA O ÍCONE DO BOTÃO EXTERNO */

function createSpreadsheetLinkIcon() {

    const svgNamespace =
        "http://www.w3.org/2000/svg";

    const icon =
        document.createElementNS(
            svgNamespace,
            "svg"
        );

    const path =
        document.createElementNS(
            svgNamespace,
            "path"
        );


    icon.classList.add(
        "spreadsheets-link-icon"
    );

    icon.setAttribute(
        "viewBox",
        "0 0 24 24"
    );

    icon.setAttribute(
        "aria-hidden",
        "true"
    );


    path.setAttribute(
        "d",
        "M7 17L17 7M9 7H17V15"
    );

    path.setAttribute(
        "fill",
        "none"
    );

    path.setAttribute(
        "stroke",
        "currentColor"
    );

    path.setAttribute(
        "stroke-width",
        "2.5"
    );

    path.setAttribute(
        "stroke-linecap",
        "round"
    );

    path.setAttribute(
        "stroke-linejoin",
        "round"
    );


    icon.appendChild(
        path
    );


    return icon;
}


/* CRIA UMA OPÇÃO DO MENU */

function createSpreadsheetTab(
    configuration,
    index,
    panelId
) {

    const isInitialSpreadsheet =
        index === 0;

    const tabItem =
        document.createElement(
            "li"
        );

    const tabLink =
        document.createElement(
            "a"
        );


    tabItem.classList.add(
        "tabs-title",
        "flex-box-center"
    );

    tabItem.classList.toggle(
        "is-active",
        isInitialSpreadsheet
    );


    // PRESERVA AS CLASSES DO LAYOUT ATUAL

    if (index === 1) {

        tabItem.classList.add(
            "horizontal-first-item"
        );
    }

    if (index === 2) {

        tabItem.classList.add(
            "horizontal-second-item"
        );
    }


    tabLink.setAttribute(
        "href",
        `#${panelId}`
    );

    tabLink.textContent =
        configuration.menuName;


    tabItem.appendChild(
        tabLink
    );


    // TODAS AS PLANILHAS DESTE MENU POSSUEM BOTÃO EXTERNO

    const spreadsheetButton =
        document.createElement(
            "button"
        );

    spreadsheetButton.type =
        "button";

    spreadsheetButton.classList.add(
        "spreadsheets-links"
    );

    spreadsheetButton.dataset.spreadsheetKey =
        configuration.key;

    spreadsheetButton.dataset.url =
        configuration.url;

    spreadsheetButton.setAttribute(
        "aria-label",
        `Abrir ${configuration.menuName} em uma nova aba`
    );


    spreadsheetButton.appendChild(
        createSpreadsheetLinkIcon()
    );


    spreadsheetButton.addEventListener(
        "click",
        function (event) {

            event.stopPropagation();

            window.open(
                configuration.url,
                "_blank",
                "noopener,noreferrer"
            );
        }
    );


    tabItem.appendChild(
        spreadsheetButton
    );


    return tabItem;
}


/* CRIA O PAINEL E O IFRAME */

function createSpreadsheetPanel(
    configuration,
    index,
    panelId
) {

    const isInitialSpreadsheet =
        index === 0;

    const panel =
        document.createElement(
            "div"
        );

    const iframe =
        document.createElement(
            "iframe"
        );


    panel.id =
        panelId;

    panel.classList.add(
        "tabs-panel"
    );


    if (isInitialSpreadsheet) {

        panel.classList.add(
            "is-active"
        );
    }


    iframe.dataset.spreadsheetKey =
        configuration.key;

    iframe.dataset.src =
        configuration.url;

    iframe.title =
        configuration.spreadsheetName;

    iframe.setAttribute(
        "loading",
        "lazy"
    );


    panel.appendChild(
        iframe
    );


    return panel;
}


/* MONTA TODO O HTML DAS PLANILHAS */

function renderSpreadsheetInterface(
    configurations,
    tabsElement,
    panelsElement
) {

    const tabsFragment =
        document.createDocumentFragment();

    const panelsFragment =
        document.createDocumentFragment();


    configurations.forEach(
        function (
            configuration,
            index
        ) {

            const panelId =
                `spreadsheet-${index + 1}`;


            tabsFragment.appendChild(
                createSpreadsheetTab(
                    configuration,
                    index,
                    panelId
                )
            );


            panelsFragment.appendChild(
                createSpreadsheetPanel(
                    configuration,
                    index,
                    panelId
                )
            );
        }
    );


    tabsElement.replaceChildren(
        tabsFragment
    );

    panelsElement.replaceChildren(
        panelsFragment
    );
}


/* ATUALIZA O FOUNDATION APÓS CRIAR AS ABAS */

function initializeFoundationTabs(
    tabsElement
) {

    const foundationTabs =
        $(
            tabsElement
        );


    if (
        foundationTabs.data(
            "zfPlugin"
        )
    ) {

        Foundation.reInit(
            foundationTabs
        );

        return;
    }


    foundationTabs.foundation();
}

/* CONFIGURA O CARREGAMENTO SELETIVO DAS PLANILHAS */
/* CONFIGURA O CARREGAMENTO SELETIVO DAS PLANILHAS */

function initializeSpreadsheetNavigation(
    tabsElement,
    panelsElement
) {

    const panels =
        panelsElement.querySelectorAll(
            ".tabs-panel"
        );

    const spreadsheetsPanel =
        document.getElementById(
            "spreadsheets"
        );

    const mainTabs =
        document.getElementById(
            "switch-1"
        );


    if (
        !spreadsheetsPanel ||
        !mainTabs
    ) {

        console.error(
            "Elementos do painel principal de planilhas não foram encontrados."
        );

        return;
    }


    /* DESCARREGA UMA PLANILHA */

    function unloadSpreadsheet(
        panel
    ) {

        const iframe =
            panel.querySelector(
                "iframe[src]"
            );


        if (iframe) {

            iframe.removeAttribute(
                "src"
            );
        }
    }


    /* CARREGA UMA PLANILHA */

    function loadSpreadsheet(
        panel
    ) {

        const iframe =
            panel.querySelector(
                "iframe[data-src]"
            );


        if (
            !iframe ||
            iframe.hasAttribute(
                "src"
            )
        ) {

            return;
        }


        requestAnimationFrame(
            function () {

                setTimeout(
                    function () {

                        if (
                            !panel.classList.contains(
                                "is-active"
                            ) ||
                            !spreadsheetsPanel.classList.contains(
                                "is-active"
                            )
                        ) {

                            return;
                        }


                        iframe.src =
                            iframe.dataset.src;

                    },
                    80
                );
            }
        );
    }


    /* ATUALIZA OS IFRAMES */

    function updateSpreadsheetIframes() {

        // PAINEL PLANILHAS NÃO ESTÁ ABERTO:
        // DESCARREGA TODAS AS PLANILHAS

        if (
            !spreadsheetsPanel.classList.contains(
                "is-active"
            )
        ) {

            panels.forEach(
                function (panel) {

                    unloadSpreadsheet(
                        panel
                    );
                }
            );

            return;
        }


        // LOCALIZA A PLANILHA ATIVA

        const activePanel =
            panelsElement.querySelector(
                ".tabs-panel.is-active"
            );


        if (!activePanel) {

            return;
        }


        // DESCARREGA TODAS AS OUTRAS

        panels.forEach(
            function (panel) {

                if (
                    panel !==
                    activePanel
                ) {

                    unloadSpreadsheet(
                        panel
                    );
                }
            }
        );


        // CARREGA SOMENTE A ATIVA

        loadSpreadsheet(
            activePanel
        );
    }


    /* OBSERVA A TROCA ENTRE PLANILHAS */

    $(
        tabsElement
    ).on(
        "change.zf.tabs",
        function () {

            requestAnimationFrame(
                updateSpreadsheetIframes
            );
        }
    );


    /* OBSERVA A TROCA ENTRE OS PAINÉIS PRINCIPAIS */

    $(
        mainTabs
    ).on(
        "change.zf.tabs",
        function () {

            requestAnimationFrame(
                updateSpreadsheetIframes
            );
        }
    );


    updateSpreadsheetIframes();
}

/* EXIBE UMA MENSAGEM DE ERRO */

function showSpreadsheetConfigurationError(
    tabsElement,
    panelsElement
) {

    const errorMessage =
        document.createElement(
            "p"
        );


    errorMessage.classList.add(
        "spreadsheet-configuration-error"
    );

    errorMessage.textContent =
        "Não foi possível carregar as planilhas do dashboard.";


    tabsElement.replaceChildren();

    panelsElement.replaceChildren(
        errorMessage
    );
}


/* CONFIGURA A PLANILHA DO PAINEL ESTATÍSTICAS */

function initializeStatisticsSpreadsheet(
    configuration
) {

    const statisticsPanel =
        document.getElementById(
            "statistics"
        );

    const statisticsIframe =
        document.getElementById(
            "statisticsSpreadsheet"
        );

    const mainTabs =
        document.getElementById(
            "switch-1"
        );

    if (!statisticsIframe) {
        return;
    }

    if (
        !statisticsPanel ||
        !mainTabs
    ) {
        console.error(
            "Elementos do painel Estatísticas não foram encontrados."
        );

        return;
    }

    statisticsIframe.dataset.src =
        configuration.url;

    statisticsIframe.title =
        configuration.spreadsheetName;


    /* CARREGA A PLANILHA */

    function loadStatisticsSpreadsheet() {

        if (
            statisticsIframe.hasAttribute(
                "src"
            )
        ) {

            return;
        }


        statisticsIframe.src =
            statisticsIframe.dataset.src;
    }


    /* DESCARREGA A PLANILHA */

    function unloadStatisticsSpreadsheet() {

        if (
            statisticsIframe.hasAttribute(
                "src"
            )
        ) {

            statisticsIframe.removeAttribute(
                "src"
            );
        }
    }


    /* ATUALIZA O ESTADO DO IFRAME */

    function updateStatisticsSpreadsheet() {

        if (
            statisticsPanel.classList.contains(
                "is-active"
            )
        ) {

            loadStatisticsSpreadsheet();

            return;
        }


        unloadStatisticsSpreadsheet();
    }


    /* OBSERVA A TROCA DO PAINEL PRINCIPAL */

    $(
        mainTabs
    ).on(
        "change.zf.tabs",
        function () {

            requestAnimationFrame(
                updateStatisticsSpreadsheet
            );
        }
    );


    updateStatisticsSpreadsheet();
}


/* INICIALIZA AS PLANILHAS */

async function initializeSpreadsheets() {

    const tabsElement =
        document.getElementById(
            "switch-spreadsheet"
        );

    const panelsElement =
        document.getElementById(
            "spreadsheetPanels"
        );


    if (
        !tabsElement ||
        !panelsElement
    ) {

        throw new Error(
            "Os elementos do menu de planilhas não foram encontrados."
        );
    }


    tabsElement.setAttribute(
        "aria-busy",
        "true"
    );

    panelsElement.setAttribute(
        "aria-busy",
        "true"
    );


    try {

        const configurations =
            await getSpreadsheetConfigurations();


        /* SEPARA A PLANILHA DE ESTATÍSTICAS */

        const statisticsConfiguration =
            configurations.find(
                function (configuration) {

                    return (
                        configuration.key ===
                        STATISTICS_SPREADSHEET_KEY
                    );
                }
            );


        /* REMOVE A PLANILHA DE ESTATÍSTICAS DO MENU PLANILHAS */

        const spreadsheetConfigurations =
            configurations.filter(
                function (configuration) {

                    return (
                        configuration.key !==
                        STATISTICS_SPREADSHEET_KEY
                    );
                }
            );


        /* MONTA O PAINEL PLANILHAS */

        renderSpreadsheetInterface(
            spreadsheetConfigurations,
            tabsElement,
            panelsElement
        );


        /* CONFIGURA O PAINEL ESTATÍSTICAS */

        if (statisticsConfiguration) {

            initializeStatisticsSpreadsheet(
                statisticsConfiguration
            );

        }
        else {

            console.warn(
                'A planilha "resumo-operacao" não foi encontrada na configuração.'
            );
        }


        /* INICIALIZA AS ABAS DAS PLANILHAS */

        initializeFoundationTabs(
            tabsElement
        );


        /* INICIALIZA O CARREGAMENTO SELETIVO */

        initializeSpreadsheetNavigation(
            tabsElement,
            panelsElement
        );

    }
    catch (error) {

        showSpreadsheetConfigurationError(
            tabsElement,
            panelsElement
        );

        throw error;

    }
    finally {

        tabsElement.setAttribute(
            "aria-busy",
            "false"
        );

        panelsElement.setAttribute(
            "aria-busy",
            "false"
        );
    }
}

/* EXECUTA A INICIALIZAÇÃO */

initializeSpreadsheets().catch(
    function (error) {

        console.error(
            "Erro ao inicializar o controle das planilhas:",
            error
        );
    }
);
