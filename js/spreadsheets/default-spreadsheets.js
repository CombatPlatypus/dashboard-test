const DEFAULT_SPREADSHEET_CONFIG_PATH =
    "config/spreadsheets.json";

const GOOGLE_SPREADSHEETS_URL_PREFIX =
    "https://docs.google.com/spreadsheets/";

const DEFAULT_SPREADSHEET_LIMIT =
    20;

function normalizeDefaultSpreadsheetSettings(
    value,
) {
    const spreadsheets =
        value?.spreadsheets;

    if (
        !Array.isArray(
            spreadsheets,
        ) ||
        spreadsheets.length === 0 ||
        spreadsheets.length >
            DEFAULT_SPREADSHEET_LIMIT
    ) {
        throw new TypeError(
            "A configuração padrão das planilhas é inválida.",
        );
    }

    return Object.freeze(
        spreadsheets.map(
            function (
                spreadsheet,
                index,
            ) {
                const link =
                    String(
                        spreadsheet?.link ??
                        "",
                    ).trim();

                const menuName =
                    String(
                        spreadsheet?.menuName ??
                        "",
                    )
                        .trim()
                        .slice(0, 22);

                if (
                    !link.startsWith(
                        GOOGLE_SPREADSHEETS_URL_PREFIX,
                    ) ||
                    !menuName
                ) {
                    throw new TypeError(
                        `A configuração padrão da planilha ${index + 1} é inválida.`,
                    );
                }

                return Object.freeze({
                    link,
                    menuName,
                });
            },
        ),
    );
}

async function loadDefaultSpreadsheetSettings({
    fetchFunction =
        globalThis.fetch,
    baseUrl =
        globalThis.document
            ?.baseURI,
    now = Date.now,
} = {}) {
    if (
        typeof fetchFunction !==
            "function" ||
        !baseUrl
    ) {
        throw new Error(
            "O navegador não permite carregar a configuração das planilhas.",
        );
    }

    const configUrl =
        new URL(
            DEFAULT_SPREADSHEET_CONFIG_PATH,
            baseUrl,
        );

    configUrl.searchParams.set(
        "cache-bust",
        String(
            now(),
        ),
    );

    const response =
        await fetchFunction(
            configUrl.href,
            {
                cache: "no-store",
            },
        );

    if (!response.ok) {
        throw new Error(
            `Não foi possível carregar a configuração das planilhas (${response.status}).`,
        );
    }

    return normalizeDefaultSpreadsheetSettings(
        await response.json(),
    );
}

export {
    DEFAULT_SPREADSHEET_CONFIG_PATH,
    loadDefaultSpreadsheetSettings,
    normalizeDefaultSpreadsheetSettings,
};
