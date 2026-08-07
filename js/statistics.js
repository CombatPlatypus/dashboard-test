import {
    CONFIG
} from "./config.js";


// CLIENTE OAUTH EXCLUSIVO DO PAINEL DE ESTATÍSTICAS

let statisticsTokenClient =
    null;

let statisticsAccessToken =
    null;


// ELEMENTOS DA INTERFACE

const statisticsConnectButton =
    document.getElementById(
        "statisticsConnectButton"
    );

const statisticsStatus =
    document.getElementById(
        "statisticsStatus"
    );

const statisticsTable =
    document.getElementById(
        "statisticsTable"
    );

const statisticsTableHead =
    document.getElementById(
        "statisticsTableHead"
    );

const statisticsTableBody =
    document.getElementById(
        "statisticsTableBody"
    );


// ALTERA A MENSAGEM DE STATUS

function setStatisticsStatus(
    message
) {

    statisticsStatus.textContent =
        message;
}


// INICIALIZA A AUTENTICAÇÃO DO GOOGLE SHEETS

function initializeStatisticsAuth() {

    if (
        typeof google ===
        "undefined"
    ) {

        setStatisticsStatus(
            "A biblioteca de autenticação do Google não foi carregada."
        );

        return;
    }


    statisticsTokenClient =
        google.accounts.oauth2.initTokenClient({

            client_id:
                CONFIG.google.clientId,

            scope:
                CONFIG.google.statisticsScopes.join(
                    " "
                ),

            include_granted_scopes:
                false,

            callback:
                handleStatisticsTokenResponse,

            error_callback:
                function (error) {

                    console.error(
                        "Erro de autenticação do Google Sheets:",
                        error
                    );

                    setStatisticsStatus(
                        "Não foi possível concluir a autenticação."
                    );
                }
        });


    statisticsConnectButton.addEventListener(
        "click",
        requestStatisticsAccess
    );
}


// SOLICITA AUTORIZAÇÃO AO USUÁRIO

function requestStatisticsAccess() {

    if (!statisticsTokenClient) {

        setStatisticsStatus(
            "O cliente de autenticação ainda não está disponível."
        );

        return;
    }


    setStatisticsStatus(
        "Aguardando autorização do Google..."
    );


    statisticsTokenClient.requestAccessToken({

        prompt:
            "consent select_account"
    });
}


// RECEBE O TOKEN DO GOOGLE

async function handleStatisticsTokenResponse(
    response
) {

    if (
        response.error ||
        !response.access_token
    ) {

        console.error(
            "Google não forneceu um token:",
            response
        );

        setStatisticsStatus(
            "A autorização não foi concedida."
        );

        return;
    }


    statisticsAccessToken =
        response.access_token;


    setStatisticsStatus(
        "Autorizado. Carregando planilha..."
    );


    try {

        await loadStatisticsSpreadsheet();

    }
    catch (error) {

        console.error(
            "Erro ao carregar a planilha de estatísticas:",
            error
        );

        setStatisticsStatus(
            error.message ??
            "Não foi possível carregar a planilha."
        );
    }
}


// CONSULTA A PLANILHA PRIVADA

async function loadStatisticsSpreadsheet() {

    const spreadsheetId =
        encodeURIComponent(
            CONFIG.google.statisticsSpreadsheetId
        );

    const spreadsheetRange =
        encodeURIComponent(
            CONFIG.google.statisticsSpreadsheetRange
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

                    Authorization:
                        `Bearer ${statisticsAccessToken}`
                }
            }
        );


    if (!response.ok) {

        let errorMessage =
            `Erro ao consultar a planilha: ${response.status}`;

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


    if (
        rows.length ===
        0
    ) {

        throw new Error(
            "A planilha não retornou nenhum dado."
        );
    }


    renderStatisticsTable(
        rows
    );


    setStatisticsStatus(
        "Planilha carregada com sucesso."
    );
}


// MONTA A TABELA COM OS DADOS RECEBIDOS

function renderStatisticsTable(
    rows
) {

    const [
        headers,
        ...dataRows
    ] = rows;


    statisticsTableHead.replaceChildren();

    statisticsTableBody.replaceChildren();


    // CABEÇALHO

    const headerRow =
        document.createElement(
            "tr"
        );


    headers.forEach(
        function (header) {

            const headerCell =
                document.createElement(
                    "th"
                );


            headerCell.textContent =
                header;


            headerRow.appendChild(
                headerCell
            );
        }
    );


    statisticsTableHead.appendChild(
        headerRow
    );


    // CONTEÚDO

    dataRows.forEach(
        function (row) {

            const tableRow =
                document.createElement(
                    "tr"
                );


            headers.forEach(
                function (
                    header,
                    columnIndex
                ) {

                    const tableCell =
                        document.createElement(
                            "td"
                        );


                    tableCell.textContent =
                        row[columnIndex] ??
                        "";


                    tableRow.appendChild(
                        tableCell
                    );
                }
            );


            statisticsTableBody.appendChild(
                tableRow
            );
        }
    );


    statisticsTable.hidden =
        false;
}


/* INICIALIZA O PAINEL DE ESTATÍSTICAS */

initializeStatisticsAuth();
