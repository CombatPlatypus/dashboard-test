import assert from "node:assert/strict";
import {
    readFile,
} from "node:fs/promises";
import {
    test,
} from "node:test";

import {
    loadDefaultSpreadsheetSettings,
    normalizeDefaultSpreadsheetSettings,
} from "../js/spreadsheets/default-spreadsheets.js";

const configPath =
    new URL(
        "../config/spreadsheets.json",
        import.meta.url,
    );

test(
    "configuração padrão contém o link atualizado de Pacotes Retornados",
    async function () {
        const configuration =
            JSON.parse(
                await readFile(
                    configPath,
                    "utf8",
                ),
            );

        const spreadsheets =
            normalizeDefaultSpreadsheetSettings(
                configuration,
            );

        const returnedPackages =
            spreadsheets.find(
                function (spreadsheet) {
                    return spreadsheet.menuName ===
                        "Pacotes Retornados";
                },
            );

        assert.equal(
            returnedPackages?.link,
            "https://docs.google.com/spreadsheets/d/1b9VlTXNfWhOqJtx9UoPrQchh77AiPqcs/",
        );
    },
);

test(
    "carrega a configuração sem cache e com endereço único",
    async function () {
        let requestedUrl = "";
        let requestedOptions = null;

        const configuration = {
            spreadsheets: [
                {
                    link:
                        "https://docs.google.com/spreadsheets/d/teste/",
                    menuName:
                        "Planilha de Teste",
                },
            ],
        };

        const spreadsheets =
            await loadDefaultSpreadsheetSettings({
                baseUrl:
                    "https://example.com/dashboard/",
                now:
                    function () {
                        return 123456;
                    },
                fetchFunction:
                    async function (
                        url,
                        options,
                    ) {
                        requestedUrl =
                            url;

                        requestedOptions =
                            options;

                        return {
                            ok: true,
                            json:
                                async function () {
                                    return configuration;
                                },
                        };
                    },
            });

        assert.equal(
            requestedUrl,
            "https://example.com/dashboard/config/spreadsheets.json?cache-bust=123456",
        );

        assert.deepEqual(
            requestedOptions,
            {
                cache: "no-store",
            },
        );

        assert.equal(
            spreadsheets[0].menuName,
            "Planilha de Teste",
        );
    },
);
