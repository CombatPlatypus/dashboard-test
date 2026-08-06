// IMPORTA OS ÍCONES UTILIZADOS PELOS ITENS DO GOOGLE DRIVE

import {
    DRIVE_DEFAULT_ICONS,
    DRIVE_ITEM_ICONS
} from "./files-types.js";

// IMPORTA O VISUALIZADOR INTERNO DE IMAGENS

import {
    openImageViewer
} from "./viewer.js";

// DEFINE O MIME TYPE UTILIZADO PELAS PASTAS DO GOOGLE DRIVE

const FOLDER_MIME_TYPE =
    "application/vnd.google-apps.folder";

// EXIBE AS INFORMAÇÕES DO USUÁRIO AUTENTICADO

export function showUser(user) {

    const loginButton =
        document.getElementById(
            "loginButton"
        );

    const userInfoContainer =
        document.getElementById(
            "userInfo"
        );

    const isConnected =
        document.querySelector(
        ".is-connected"
    );

    const userPhoto =
        document.getElementById(
            "userPhoto"
        );

    const userName =
        document.getElementById(
            "userName"
        );

    const userEmail =
        document.getElementById(
            "userEmail"
        );

    if (
        !loginButton ||
        !userInfoContainer ||
        !userPhoto ||
        !userName ||
        !userEmail ||
        !isConnected
    ) {
        console.error(
            "Elementos da área do usuário não foram encontrados."
        );

        return;
    }

    userPhoto.src =
        user.picture ?? "";

    userPhoto.alt =
        user.name
            ? `Foto de ${user.name}`
            : "Foto do usuário";

    userName.textContent =
        user.name ?? "Usuário";

    userEmail.textContent =
        user.email ?? "";

    loginButton.hidden =
        true;

    isConnected.style.display =
        "none";

    userInfoContainer.hidden =
        false;
}

// EXIBE NOVAMENTE A ÁREA DE CONEXÃO QUANDO A SESSÃO NÃO PUDER SER RENOVADA

export function showDriveReconnect() {

    const loginButton =
        document.getElementById(
            "loginButton"
        );

    const userInfoContainer =
        document.getElementById(
            "userInfo"
        );

    const connectionContainer =
        document.querySelector(
            ".is-connected"
        );

    const connectionDescription =
        connectionContainer?.querySelector(
            ".drive-login .description p"
        );

    if (
        !loginButton ||
        !userInfoContainer ||
        !connectionContainer
    ) {

        console.error(
            "Elementos da área de reconexão não foram encontrados."
        );

        return;
    }

    loginButton.textContent =
        "Reconectar Google Drive";

    loginButton.hidden =
        false;

    connectionContainer.style.removeProperty(
        "display"
    );

    userInfoContainer.hidden =
        true;

    if (connectionDescription) {

        connectionDescription.textContent =
            "A sessão do Google não está mais disponível. Reconecte-se para continuar acessando os arquivos. ";
    }
}

// EXIBE O CAMINHO DE NAVEGAÇÃO DA PASTA ATUAL

export function showDriveBreadcrumb(
    folderHistory,
    handleFolderSelection
) {

    const breadcrumbContainer =
        document.getElementById(
            "driveBreadcrumb"
        );

    if (!breadcrumbContainer) {

        console.error(
            "Área #driveBreadcrumb não encontrada."
        );

        return;
    }

    breadcrumbContainer.innerHTML =
        "";

    folderHistory.forEach(
        (folder, folderIndex) => {

            const isCurrentFolder =
                folderIndex ===
                folderHistory.length - 1;

            if (folderIndex > 0) {

                const separator =
                    document.createElement(
                        "span"
                    );

                separator.classList.add(
                    "drive-breadcrumb-separator"
                );

                separator.textContent =
                    ">";

                separator.setAttribute(
                    "aria-hidden",
                    "true"
                );

                breadcrumbContainer.appendChild(
                    separator
                );
            }

            if (isCurrentFolder) {

                const currentFolderElement =
                    document.createElement(
                        "span"
                    );

                currentFolderElement.classList.add(
                    "drive-breadcrumb-current"
                );

                currentFolderElement.textContent =
                    folder.name;

                currentFolderElement.setAttribute(
                    "aria-current",
                    "page"
                );

                breadcrumbContainer.appendChild(
                    currentFolderElement
                );

                return;
            }

            const folderButton =
                document.createElement(
                    "button"
                );

            folderButton.type =
                "button";

            folderButton.classList.add(
                "drive-breadcrumb-button"
            );

            folderButton.textContent =
                folder.name;

            folderButton.addEventListener(
                "click",
                () => {

                    handleFolderSelection(
                        folderIndex
                    );
                }
            );

            breadcrumbContainer.appendChild(
                folderButton
            );

        }
    );
}

// EXIBE O INDICADOR DE CARREGAMENTO DOS ARQUIVOS

export function showDriveLoading() {

    const driveFilesContainer =
        document.getElementById(
            "driveFiles"
        );

    if (!driveFilesContainer) {

        console.error(
            "Área #driveFiles não encontrada."
        );

        return;
    }

    driveFilesContainer.setAttribute(
        "aria-busy",
        "true"
    );

    driveFilesContainer.innerHTML = `

        <div class="drive-loading">

            <span
                class="drive-loading-spinner"
                aria-hidden="true"
            ></span>

            <span>
                Carregando arquivos...
            </span>

        </div>
    `;
}

// EXIBE UMA MENSAGEM DE ERRO NO CONTAINER DOS ARQUIVOS

export function showDriveError(
    errorMessage
) {

    const driveFilesContainer =
        document.getElementById(
            "driveFiles"
        );

    if (!driveFilesContainer) {

        console.error(
            "Área #driveFiles não encontrada."
        );

        return;
    }

    driveFilesContainer.setAttribute(
        "aria-busy",
        "false"
    );

    driveFilesContainer.innerHTML =
        "";

    const errorElement =
        document.createElement(
            "p"
        );

    errorElement.classList.add(
        "drive-error"
    );

    errorElement.textContent =
        errorMessage ??
        "Não foi possível carregar os arquivos.";

    driveFilesContainer.appendChild(
        errorElement
    );
}

// EXIBE OS ARQUIVOS E AS PASTAS RETORNADOS PELO GOOGLE DRIVE

export function showDriveFiles(
    driveItems,
    handleFolderOpen
) {

    const driveFilesContainer =
        document.getElementById(
            "driveFiles"
        );

    if (!driveFilesContainer) {

        console.error(
            "Área #driveFiles não encontrada."
        );

        return;
    }

    driveFilesContainer.setAttribute(
        "aria-busy",
        "false"
    );

    driveFilesContainer.innerHTML =
        "";

    if (driveItems.length === 0) {

        driveFilesContainer.innerHTML =
            "<p>Esta pasta está vazia.</p>";

        return;
    }

    driveItems.forEach(
        (driveItem) => {

            const driveItemButton =
                createDriveItemButton(
                    driveItem
                );

            const isFolder =
                driveItem.mimeType ===
                FOLDER_MIME_TYPE;

            if (isFolder) {

                driveItemButton.addEventListener(
                    "click",
                    () => {

                        handleFolderOpen(
                            driveItem.id
                        );
                    }
                );

            }
            else {

                driveItemButton.addEventListener(
                    "click",
                    () => {

                        const isImage =
                            driveItem.mimeType?.startsWith(
                                "image/"
                            );

                        if (isImage) {

                            const imageUrl =
                                getDriveImageUrl(
                                    driveItem
                                );

                            if (!imageUrl) {

                                console.error(
                                    "Não foi possível obter a URL da imagem:",
                                    driveItem.name
                                );

                                openDriveFile(
                                    driveItem.webViewLink
                                );

                                return;

                            }

                            openImageViewer(
                                imageUrl,
                                driveItem.name
                            );

                            return;
                        }

                        openDriveFile(
                            driveItem.webViewLink
                        );

                    }
                );

            }

            driveFilesContainer.appendChild(
                driveItemButton
            );

        }
    );

}

// ALTERA O MODO DE EXIBIÇÃO DOS ARQUIVOS

export function setDriveViewMode(
    viewMode
) {

    const driveFilesContainer =
        document.getElementById(
            "driveFiles"
        );

    if (!driveFilesContainer) {

        console.error(
            "Área #driveFiles não encontrada."
        );

        return;
    }

    if (
        viewMode !== "list" &&
        viewMode !== "grid"
    ) {

        console.error(
            "Modo de exibição inválido:",
            viewMode
        );

        return;
    }

    driveFilesContainer.classList.remove(
        "drive-list-view",
        "drive-grid-view"
    );

    driveFilesContainer.classList.add(
        `drive-${viewMode}-view`
    );

    localStorage.setItem(
        "driveViewMode",
        viewMode
    );

}

// RETORNA O ÍCONE CORRESPONDENTE AO TIPO DO ITEM

function getDriveItemFallbackIcon(
    driveItem
) {

    if (
        driveItem.mimeType ===
        FOLDER_MIME_TYPE
    ) {

        return DRIVE_DEFAULT_ICONS.folder;

    }

    if (
        driveItem.mimeType?.startsWith(
            "image/"
        )
    ) {

        return DRIVE_DEFAULT_ICONS.image;

    }

    return (
        DRIVE_ITEM_ICONS[
            driveItem.mimeType
        ] ??
        DRIVE_DEFAULT_ICONS.file
    );

}

// CRIA O BOTÃO VISUAL DE UM ARQUIVO OU PASTA

function createDriveItemButton(
    driveItem
) {

    const driveItemButton =
        document.createElement(
            "button"
        );

    driveItemButton.type =
        "button";

    driveItemButton.classList.add(
        "drive-file"
    );

    // VERIFICA SE O ITEM É UMA PASTA

    const isFolder =
        driveItem.mimeType ===
        FOLDER_MIME_TYPE;

    driveItemButton.classList.toggle(
        "drive-folder",
        isFolder
    );

    driveItemButton.classList.toggle(
        "drive-document",
        !isFolder
    );

    // DEFINE A IMAGEM DE REPRESENTAÇÃO DO ITEM

    const fallbackImage =
        getDriveItemFallbackIcon(
            driveItem
        );

    const isImage =
        driveItem.mimeType?.startsWith(
            "image/"
        );

    const previewImage =
        isImage &&
        driveItem.thumbnailLink
            ? driveItem.thumbnailLink
            : fallbackImage;

    // CRIA A IMAGEM DE REPRESENTAÇÃO DO ITEM

    const imageElement =
        document.createElement(
            "img"
        );

    imageElement.src =
        previewImage;

    imageElement.alt =
        "";

    imageElement.classList.add(
        "drive-file-icon"
    );

    // APLICA O ÍCONE PADRÃO CASO A MINIATURA NÃO SEJA CARREGADA

    imageElement.addEventListener(
        "error",
        () => {

            if (
                imageElement.dataset.fallbackApplied ===
                "true"
            ) {

                return;
            }

            imageElement.dataset.fallbackApplied =
                "true";

            imageElement.src =
                fallbackImage;

        }
    );

    // CRIA O CONTAINER DAS INFORMAÇÕES DO ITEM

    const driveItemInformation =
        document.createElement(
            "div"
        );

    driveItemInformation.classList.add(
        "drive-file-info"
    );

    // CRIA O NOME DO ITEM

    const driveItemName =
        document.createElement(
            "strong"
        );

    driveItemName.classList.add(
        "drive-file-name"
    );

    driveItemName.textContent =
        driveItem.name ??
        "Arquivo sem nome";


    // CRIA A DATA DE MODIFICAÇÃO DO ITEM

    const driveItemDate =
        document.createElement(
            "span"
        );

    driveItemDate.classList.add(
        "drive-file-date"
    );

    driveItemDate.textContent =
        `Modificado em: ${
            formatDate(
                driveItem.modifiedTime
            )
        }`;

    // INSERE O NOME E A DATA NO CONTAINER DE INFORMAÇÕES

    driveItemInformation.append(
        driveItemName,
        driveItemDate
    );

    // INSERE A IMAGEM E AS INFORMAÇÕES NO BOTÃO DO ITEM

    driveItemButton.append(
        imageElement,
        driveItemInformation
    );

    return driveItemButton;
}


// ABRE UM ARQUIVO DO GOOGLE DRIVE EM UMA NOVA GUIA

function openDriveFile(
    fileUrl
) {

    if (!fileUrl) {

        console.error(
            "Link do arquivo não informado."
        );

        return;
    }

    window.open(
        fileUrl,
        "_blank",
        "noopener,noreferrer"
    );

}

// RETORNA A URL UTILIZADA PELO VISUALIZADOR DE IMAGENS

function getDriveImageUrl(
    driveItem
) {

    if (!driveItem.thumbnailLink) {

        return null;
    }

    const imageUrl =
        driveItem.thumbnailLink;

    // AUMENTA O TAMANHO DAS URLS QUE UTILIZAM O PADRÃO S220

    if (/=s\d+(-c)?/.test(imageUrl)) {

        return imageUrl.replace(
            /=s\d+(-c)?/,
            "=s1600"
        );

    }

    // AUMENTA O TAMANHO DAS URLS QUE UTILIZAM O PARÂMETRO SZ

    try {

        const url =
            new URL(
                imageUrl
            );

        if (
            url.searchParams.has(
                "sz"
            )
        ) {

            url.searchParams.set(
                "sz",
                "w1600"
            );

            return url.toString();

        }

    }
    catch (error) {

        console.error(
            "URL da miniatura inválida:",
            error
        );

    }

    // RETORNA A URL ORIGINAL CASO O FORMATO NÃO SEJA RECONHECIDO

    return imageUrl;
}

// CONVERTE UMA DATA ISO PARA O FORMATO BRASILEIRO

function formatDate(
    dateValue
) {

    if (!dateValue) {

        return "Data não disponível";

    }

    const date =
        new Date(
            dateValue
        );

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "Data não disponível";

    }

    return new Intl.DateTimeFormat(
        "pt-BR",
        {
            dateStyle:
                "short",

            timeStyle:
                "short"
        }
    ).format(
        date
    );
}