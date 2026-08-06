// IMPORTA AS CONFIGURAÇÕES DA APLICAÇÃO

import {
    CONFIG
} from "./config.js";

// IMPORTA AS FUNÇÕES RESPONSÁVEIS PELA INTERFACE

import {
    showDriveBreadcrumb,
    showDriveError,
    showDriveFiles,
    showDriveLoading,
    showDriveReconnect,
    showUser
} from "./ui.js";

// IMPORTA AS FUNÇÕES RESPONSÁVEIS PELA API DO GOOGLE DRIVE

import {
    getDriveFolderInformation,
    listDriveFiles,
    listSharedWithMeFiles
} from "./drive.js";

// ARMAZENA O CLIENTE DE AUTENTICAÇÃO E O TOKEN DE ACESSO

export let tokenClient =
    null;

export let accessToken =
    null;

// ARMAZENA O ID E O NOME DAS PASTAS PRESENTES NO HISTÓRICO DE NAVEGAÇÃO

const folderNavigationHistory =
    [];

// DEFINE OS TIPOS DE LOCALIZAÇÃO UTILIZADOS NO HISTÓRICO

const SHARED_WITH_ME_LOCATION_TYPE =
    "shared-with-me";

const FOLDER_LOCATION_TYPE =
    "folder";


// DEFINE O NOME DA RAIZ VIRTUAL

const SHARED_WITH_ME_LOCATION_NAME =
    "Compartilhados Comigo";

// CONSIDERA O TOKEN EXPIRADO UM MINUTO ANTES DO LIMITE REAL

const TOKEN_EXPIRATION_MARGIN_MS =
    60 * 1000;

// ARMAZENA O MOMENTO EXATO EM QUE O TOKEN EXPIRA

let accessTokenExpiresAt =
    0;

// INDICA SE O USUÁRIO JÁ INICIOU UMA SESSÃO NESTA PÁGINA

let hasDriveSession =
    false;

// IMPEDE DUAS SOLICITAÇÕES DE TOKEN AO MESMO TEMPO

let tokenRequestInProgress =
    false;

// ARMAZENA A AÇÃO QUE DEVERÁ SER RETOMADA DEPOIS DA RENOVAÇÃO

let pendingDriveAction =
    null;

// VERIFICA SE O TOKEN ATUAL AINDA PODE SER UTILIZADO

function hasValidAccessToken() {

    return (
        Boolean(
            accessToken
        ) &&
        Date.now() <
            accessTokenExpiresAt -
            TOKEN_EXPIRATION_MARGIN_MS
    );
}

// SOLICITA UM NOVO TOKEN AO GOOGLE

function requestNewAccessToken(
    prompt
) {

    if (!tokenClient) {

        console.error(
            "O cliente de autenticação ainda não foi inicializado."
        );

        finishDriveSession();

        return;
    }

    if (tokenRequestInProgress) {

        return;
    }

    tokenRequestInProgress =
        true;

    try {

        tokenClient.requestAccessToken({
            prompt
        });

    }
    catch (error) {

        handleTokenRequestFailure(
            error
        );
    }
}

// INICIA OU REINICIA A CONEXÃO DE FORMA EXPLÍCITA

export function requestDriveConnection() {

    pendingDriveAction =
        initializeUserSession;

    requestNewAccessToken(
        "consent"
    );
}

// EXECUTA UMA AÇÃO SOMENTE QUANDO HOUVER UM TOKEN VÁLIDO

export function runDriveActionWithValidToken(
    action,
    {
        reloadCurrentFolderAfterRenewal = false
    } = {}
) {

    if (
        typeof action !==
        "function"
    ) {

        console.error(
            "Ação do Google Drive inválida."
        );

        return;
    }

    // NÃO TENTA CONECTAR AUTOMATICAMENTE ANTES DO PRIMEIRO LOGIN

    if (!hasDriveSession) {

        return;
    }

    // TOKEN AINDA VÁLIDO: EXECUTA A AÇÃO IMEDIATAMENTE

    if (hasValidAccessToken()) {

        return action();
    }

    // TOKEN EXPIRADO: GUARDA A AÇÃO PARA EXECUTÁ-LA DEPOIS

    pendingDriveAction =
        async () => {

            if (
                reloadCurrentFolderAfterRenewal
            ) {

                await reloadCurrentDriveLocation();
            }

            return action();
        };

    showDriveLoading();

    // NÃO PERMITE QUE O GOOGLE MOSTRE TELAS NESTA RENOVAÇÃO

    requestNewAccessToken(
        "none"
    );
}

// RECARREGA A PASTA ATUAL SEM ALTERAR O HISTÓRICO

// RECARREGA A LOCALIZAÇÃO ATUAL SEM ALTERAR O HISTÓRICO

async function reloadCurrentDriveLocation() {

    const currentLocation =
        folderNavigationHistory.at(
            -1
        );

    if (!currentLocation) {

        return;
    }

    await loadDriveLocation(
        currentLocation,
        false
    );
}


// CARREGA UMA PASTA REAL OU A RAIZ VIRTUAL

async function loadDriveLocation(
    location,
    addToHistory = false
) {

    if (
        location.type ===
        SHARED_WITH_ME_LOCATION_TYPE
    ) {

        return loadSharedWithMe(
            addToHistory
        );
    }

    return loadDriveFolder(
        location.id,
        addToHistory
    );
}

// FINALIZA A SESSÃO LOCAL E EXIBE A OPÇÃO DE RECONEXÃO

function finishDriveSession() {

    accessToken =
        null;

    accessTokenExpiresAt =
        0;

    hasDriveSession =
        false;

    tokenRequestInProgress =
        false;

    pendingDriveAction =
        null;

    showDriveReconnect();
}

// TRATA ERROS DO FLUXO DE AUTORIZAÇÃO

function handleTokenRequestFailure(
    error
) {

    console.error(
        "Não foi possível renovar a autorização do Google:",
        error
    );

    finishDriveSession();
}

// ABRE UMA PASTA DO GOOGLE DRIVE E ATUALIZA O HISTÓRICO DE NAVEGAÇÃO

export function openDriveFolder(
    folderId,
    addToHistory = true
) {

    return runDriveActionWithValidToken(
        () => {

            return loadDriveFolder(
                folderId,
                addToHistory
            );
        }
    );
}

// CARREGA A RAIZ VIRTUAL "COMPARTILHADOS COMIGO"

async function loadSharedWithMe(
    resetHistory = false
) {

    showDriveLoading();

    try {

        const driveItems =
            await listSharedWithMeFiles(
                accessToken
            );

        if (resetHistory) {

            folderNavigationHistory.length =
                0;

            folderNavigationHistory.push({

                id:
                    null,

                name:
                    SHARED_WITH_ME_LOCATION_NAME,

                type:
                    SHARED_WITH_ME_LOCATION_TYPE
            });
        }

        showDriveFiles(
            driveItems,
            openDriveFolder
        );

        showDriveBreadcrumb(
            folderNavigationHistory,
            handleBreadcrumbNavigation
        );

        updateBackButtonVisibility();

    }
    catch (error) {

        console.error(
            "Não foi possível carregar os itens compartilhados:",
            error
        );

        if (
            error.status ===
            401
        ) {

            finishDriveSession();

            return;
        }

        showDriveError(
            error.message ??
            "Não foi possível carregar os itens compartilhados."
        );
    }
}

// CARREGA A PASTA DEPOIS QUE O TOKEN JÁ FOI VALIDADO

async function loadDriveFolder(
    folderId,
    addToHistory = true
) {
    showDriveLoading();

    try {

        const currentFolder =
            folderNavigationHistory.at(
                -1
            );

        let newFolderInformation =
            null;


        // CONSULTA AS INFORMAÇÕES SOMENTE QUANDO A PASTA REPRESENTA UM NOVO NÍVEL

        if (
            addToHistory &&
            currentFolder?.id !== folderId
        ) {

            newFolderInformation =
                await getDriveFolderInformation(
                    accessToken,
                    folderId
                );
        }

        // CONSULTA OS ARQUIVOS PRESENTES NA PASTA

        const driveItems =
            await listDriveFiles(
                accessToken,
                folderId
            );

        // ADICIONA A PASTA AO HISTÓRICO APÓS A CONSULTA SER CONCLUÍDA

        if (newFolderInformation) {

            folderNavigationHistory.push({

                id:
                    newFolderInformation.id,

                name:
                    newFolderInformation.name,

                type:
                    FOLDER_LOCATION_TYPE
            });
        }

        // EXIBE OS ARQUIVOS ENCONTRADOS NA PASTA

        showDriveFiles(
            driveItems,
            openDriveFolder
        );

        // ATUALIZA O CAMINHO DE NAVEGAÇÃO

        showDriveBreadcrumb(
            folderNavigationHistory,
            handleBreadcrumbNavigation
        );

        // ATUALIZA A VISIBILIDADE DO BOTÃO DE VOLTAR

        updateBackButtonVisibility();

    }
    catch (error) {

        console.error(
            "Não foi possível abrir a pasta:",
            error
        );

        if (
            error.status ===
            401
        ) {

            finishDriveSession();

            return;
        }

        showDriveError(
            error.message ??
            "Não foi possível carregar os arquivos."
        );
    }
}

// MOSTRA OU OCULTA O BOTÃO DE VOLTAR CONFORME A PROFUNDIDADE DA NAVEGAÇÃO

function updateBackButtonVisibility() {

    const backButton =
        document.getElementById(
            "driveBackButton"
        );

    if (!backButton) {

        console.error(
            "Botão de voltar não encontrado."
        );

        return;
    }

    backButton.hidden =
        folderNavigationHistory.length <= 1;

}

// INICIALIZA O CLIENTE OAUTH DO GOOGLE E OS EVENTOS DE NAVEGAÇÃO

function initializeGoogleAuth() {

    if (
        typeof google ===
        "undefined"
    ) {

        console.error(
            "A biblioteca Google Identity Services não foi carregada."
        );

        return;
    }

    tokenClient =
        google.accounts.oauth2.initTokenClient({
            client_id:
                CONFIG.google.clientId,

            scope:
                CONFIG.google.scopes.join(
                    " "
                ),

            callback:
                handleTokenResponse,

            error_callback:
                handleTokenRequestFailure
        });

    const backButton =
        document.getElementById(
            "driveBackButton"
        );

    if (!backButton) {

        console.error(
            "Botão de voltar não encontrado."
        );

        return;
    }

    backButton.addEventListener(
        "click",
        handleBackButtonClick
    );

    updateBackButtonVisibility();
}

// RETORNA PARA A PASTA IMEDIATAMENTE ANTERIOR

function handleBackButtonClick() {

    return runDriveActionWithValidToken(
        async () => {

            if (
                folderNavigationHistory.length <= 1
            ) {

                return;
            }

            folderNavigationHistory.pop();

            const previousFolder =
                folderNavigationHistory.at(
                    -1
                );

            await loadDriveLocation(
                previousFolder,
                false
            );
        }
    );
}

// ABRE UMA PASTA DO BREADCRUMB E REMOVE OS NÍVEIS POSTERIORES DO HISTÓRICO

function handleBreadcrumbNavigation(
    folderIndex
) {

    return runDriveActionWithValidToken(
        async () => {

            const selectedFolder =
                folderNavigationHistory[
                    folderIndex
                ];

            if (!selectedFolder) {

                console.error(
                    "Pasta do breadcrumb não encontrada."
                );

                return;
            }

            folderNavigationHistory.splice(
                folderIndex + 1
            );

            await loadDriveLocation(
                selectedFolder,
                false
            );
        }
    );
}

// PROCESSA A RESPOSTA DO GOOGLE APÓS A SOLICITAÇÃO DE AUTORIZAÇÃO

async function handleTokenResponse(
    response
) {

    tokenRequestInProgress =
        false;

    if (
        response.error ||
        !response.access_token
    ) {

        handleTokenRequestFailure(
            response
        );

        return;
    }

    accessToken =
        response.access_token;

    const expiresInSeconds =
        Number(
            response.expires_in
        );

    accessTokenExpiresAt =
        Date.now() +
        (
            Number.isFinite(
                expiresInSeconds
            )
                ? expiresInSeconds * 1000
                : 0
        );

    hasDriveSession =
        true;

    const actionToResume =
        pendingDriveAction;

    pendingDriveAction =
        null;

    if (!actionToResume) {

        return;
    }

    try {

        await actionToResume();

    }
    catch (error) {

        console.error(
            "Não foi possível retomar a ação do Google Drive:",
            error
        );

        if (
            error.status ===
            401
        ) {

            finishDriveSession();

            return;
        }

        showDriveError(
            error.message ??
            "Não foi possível concluir a operação."
        );
    }
}

// CARREGA O USUÁRIO AUTENTICADO E ABRE A PASTA INICIAL

async function initializeUserSession() {

    try {

        folderNavigationHistory.length =
            0;

        await loadUserInformation();

        await loadSharedWithMe(
            true
        );
    }
    catch (error) {

        console.error(
            "Erro ao carregar os dados da sessão:",
            error
        );

        if (
            error.status ===
            401
        ) {

            finishDriveSession();

            return;
        }

        showDriveError(
            error.message ??
            "Não foi possível iniciar a sessão."
        );
    }
}

// CONSULTA AS INFORMAÇÕES BÁSICAS DO USUÁRIO AUTENTICADO

async function loadUserInformation() {

    const response =
        await fetch(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            {
                headers: {
                    Authorization:
                        `Bearer ${accessToken}`
                }
            }
        );

    if (!response.ok) {

        const error =
            new Error(
                `Erro ao consultar usuário: ${response.status}`
            );

        error.status =
            response.status;

        throw error;
    }
    const user =
        await response.json();

    showUser(
        user
    );
}

// INICIALIZA A AUTENTICAÇÃO DEPOIS QUE A PÁGINA FOR CARREGADA

window.addEventListener(
    "load",
    initializeGoogleAuth
);