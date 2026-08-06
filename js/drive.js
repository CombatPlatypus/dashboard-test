// DEFINE O ENDPOINT PRINCIPAL DA API DO GOOGLE DRIVE

const DRIVE_FILES_ENDPOINT =
    "https://www.googleapis.com/drive/v3/files";


// DEFINE OS CAMPOS RETORNADOS PARA CADA ITEM

const DRIVE_ITEM_FIELDS =
    [
        "id,",
        "name,",
        "mimeType,",
        "webViewLink,",
        "webContentLink,",
        "iconLink,",
        "hasThumbnail,",
        "thumbnailLink,",
        "capabilities(canDownload),",
        "modifiedTime"
    ].join("");


// REPRESENTA UM ERRO RETORNADO PELA API

export class DriveApiError extends Error {

    constructor(
        message,
        status
    ) {

        super(
            message
        );

        this.name =
            "DriveApiError";

        this.status =
            status;
    }
}


// CONSULTA AS INFORMAÇÕES BÁSICAS DE UMA PASTA

export async function getDriveFolderInformation(
    accessToken,
    folderId
) {

    validateAccessToken(
        accessToken
    );

    if (!folderId) {

        throw new Error(
            "ID da pasta não informado."
        );
    }

    const queryParameters =
        new URLSearchParams({

            fields:
                "id,name,mimeType",

            supportsAllDrives:
                "true"
        });

    const requestUrl =
        `${DRIVE_FILES_ENDPOINT}/${encodeURIComponent(folderId)}` +
        `?${queryParameters.toString()}`;

    const response =
        await fetch(
            requestUrl,
            {
                headers: {
                    Authorization:
                        `Bearer ${accessToken}`
                }
            }
        );

    if (!response.ok) {

        await throwDriveApiError(
            response
        );
    }

    return response.json();
}


// LISTA OS ARQUIVOS DE UMA PASTA REAL

export function listDriveFiles(
    accessToken,
    folderId
) {

    if (!folderId) {

        throw new Error(
            "ID da pasta não informado."
        );
    }

    return listDriveItems(
        accessToken,
        `'${folderId}' in parents and trashed = false`,
        "folder,name_natural"
    );
}


// LISTA OS ITENS DA ÁREA "COMPARTILHADOS COMIGO"

export function listSharedWithMeFiles(
    accessToken
) {

    return listDriveItems(
        accessToken,
        "sharedWithMe and trashed = false",
        "sharedWithMeTime desc,name_natural"
    );
}


// EXECUTA UMA LISTAGEM PAGINADA NA API

async function listDriveItems(
    accessToken,
    query,
    orderBy
) {

    validateAccessToken(
        accessToken
    );

    const driveItems =
        [];

    let nextPageToken =
        null;

    do {

        const queryParameters =
            new URLSearchParams({

                pageSize:
                    "100",

                fields:
                    `nextPageToken,files(${DRIVE_ITEM_FIELDS})`,

                orderBy,

                q:
                    query,

                spaces:
                    "drive",

                corpora:
                    "user",

                includeItemsFromAllDrives:
                    "true",

                supportsAllDrives:
                    "true"
            });

        if (nextPageToken) {

            queryParameters.set(
                "pageToken",
                nextPageToken
            );
        }

        const requestUrl =
            `${DRIVE_FILES_ENDPOINT}?${queryParameters.toString()}`;

        const response =
            await fetch(
                requestUrl,
                {
                    headers: {
                        Authorization:
                            `Bearer ${accessToken}`
                    }
                }
            );

        if (!response.ok) {

            await throwDriveApiError(
                response
            );
        }

        const responseData =
            await response.json();

        driveItems.push(
            ...(responseData.files ?? [])
        );

        nextPageToken =
            responseData.nextPageToken ??
            null;

    }
    while (nextPageToken);

    return driveItems;
}


// VALIDA A EXISTÊNCIA DO TOKEN

function validateAccessToken(
    accessToken
) {

    if (!accessToken) {

        throw new Error(
            "Token de acesso não informado."
        );
    }
}


// CRIA E DISPARA UM ERRO DA API

async function throwDriveApiError(
    response
) {

    const errorMessage =
        await getDriveErrorMessage(
            response
        );

    throw new DriveApiError(
        errorMessage,
        response.status
    );
}


// OBTÉM A MENSAGEM DE ERRO RETORNADA PELA API

async function getDriveErrorMessage(
    response
) {

    const defaultMessage =
        `Erro ao consultar o Drive: ${response.status}`;

    try {

        const errorData =
            await response.json();

        return (
            errorData.error?.message ??
            defaultMessage
        );

    }
    catch {

        return defaultMessage;
    }
}