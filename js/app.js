// INICIALIZA OS COMPONENTES JAVASCRIPT DO FOUNDATION

$(document).foundation();

// IMPORTA O CLIENTE DE AUTENTICAÇÃO DO GOOGLE

import {
    requestDriveConnection,
    runDriveActionWithValidToken
} from "./auth.js";

// IMPORTA O CONTROLE DO MODO DE EXIBIÇÃO DOS ARQUIVOS

import {
    setDriveViewMode
} from "./ui.js";

// IMPORTA A INICIALIZAÇÃO DO VISUALIZADOR DE IMAGENS

import {
    initializeImageViewer
} from "./viewer.js";

// INICIALIZA O VISUALIZADOR DE IMAGENS

initializeImageViewer();

// RECUPERA OS ELEMENTOS PRINCIPAIS DA INTERFACE

const loginButton =
    document.getElementById(
        "loginButton"
    );

const driveListViewButton =
    document.getElementById(
        "driveListViewButton"
    );

const driveGridViewButton =
    document.getElementById(
        "driveGridViewButton"
    );

const driveTabButton =
    document.getElementById(
        "driveTabButton"
    );

// SOLICITA AO GOOGLE UM TOKEN DE ACESSO

function handleLoginButtonClick() {

    requestDriveConnection();
}

// CONFIGURA O EVENTO DO BOTÃO DE LOGIN

if (!loginButton) {

    console.error(
        "Botão de login não encontrado."
    );
}
else {

    loginButton.addEventListener(
        "click",
        handleLoginButtonClick
    );

}

// CONFIGURA O EVENTO DO BOTÃO DE VISUALIZAÇÃO EM LISTA

if (!driveListViewButton) {

    console.error(
        "Botão de visualização em lista não encontrado."
    );
}
else {

    driveListViewButton.addEventListener(
        "click",
        () => {

            runDriveActionWithValidToken(
                () => {

                    setDriveViewMode(
                        "list"
                    );
                },
                {
                    reloadCurrentFolderAfterRenewal:
                        true
                }
            );
        }
    );
}

// CONFIGURA O EVENTO DO BOTÃO DE VISUALIZAÇÃO EM GRADE

if (!driveGridViewButton) {

    console.error(
        "Botão de visualização em grade não encontrado."
    );
}
else {

    driveGridViewButton.addEventListener(
        "click",
        () => {

            runDriveActionWithValidToken(
                () => {

                    setDriveViewMode(
                        "grid"
                    );
                },
                {
                    reloadCurrentFolderAfterRenewal:
                        true
                }
            );
        }
    );
}

// EVENTO DA ABA PRINCIPAL DO DRIVE

if (!driveTabButton) {

    console.error(
        "Botão da aba Drive não encontrado."
    );
}
else {

    driveTabButton.addEventListener(
        "click",
        () => {

            runDriveActionWithValidToken(
                () => {},
                {
                    reloadCurrentFolderAfterRenewal:
                        true
                }
            );
        }
    );
}

// RECUPERA O ÚLTIMO MODO DE EXIBIÇÃO SALVO

const savedDriveViewMode =
    localStorage.getItem(
        "driveViewMode"
    ) ?? "list";

// APLICA O MODO DE EXIBIÇÃO SALVO

setDriveViewMode(
    savedDriveViewMode
);
