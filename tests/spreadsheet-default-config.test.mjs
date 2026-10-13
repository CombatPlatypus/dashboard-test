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

const expectedSpreadsheets = [
    ["Checklist Operacional", "1SGoeFt_aVK0sZ5Ivz3ORD1Hd75sxH-A-HYqHX8wWXKY"],
    ["Avarias", "1WaHywDEm3ipdvEtq-pB01v4kyaREhn2i"],
    ["Pacotes em Análise", "1xJZpuck84CM9-FTYd5UnWbZ4AezWUdGx"],
    ["Backlog e Logs", "1cbHXjnfHGIDSob9Sh977p5J827qPlM5f9juRq_sIgcM"],
    ["Pacotes Retornados", "1b9VlTXNfWhOqJtx9UoPrQchh77AiPqcs"],
    ["Erros de Etiquetagem", "1MJFZlrUrcZXve4WOYYLjCrKeUkD0QgSshCfZdWxNMZA"],
    ["Gerenciamento de Rotas", "1UWlOQfVw-eD1ZkD5gxCo2MHZ4CEyJUd4osungKFTfwA"],
    ["Controle Operacional", "1sh3TgSwLOt8EhoDhji2CHivbrEQiuhIpoBw0VHe2JoE"],
    ["Stuck Orders", "19mhzxy8xih2yPfxX6f8ILQJWTgRMhSXv"],
    ["Controle de Endereços", "1pmKMyhiQdRU787MHdKFZEjwVqG6IIeLB6glOK3m-uMc"],
    ["Justificativas", "1sOzs3lgS6dO0WluGRQR2B8kmFTDUR5VC"],
    ["Erros de Processo", "1FpcZuJboPyMKUGZwYHGHRYg4Pr_Phs4-ycqg-u7qGSU"],
    ["Insucesso", "1J41DYbdogIyzxJxKOBJa_9uforRo5faS"],
    ["Reversa", "1wtALHYfXyFm9nfkV9TP1idnVV12oBwa-"],
    ["Equipamentos", "15ycLVugBymQR63SivMIvwRMce4dTe5XV"],
    ["Pacotes Full", "1PnKEGQtfETj0ptk7xAIPG3dcrZgbBunWFUJp18O_XDE"],
    ["Avarias AppSheet", "1SpChx2r8HHeqWQAYDELewvKzQM8eRLIgknT2EiMjPnU"],
];

test("ordem padrão segue as imagens e mantém cada nome ligado à planilha correta", async () => {
    const configuration = JSON.parse(await readFile(configPath, "utf8"));
    const spreadsheets = normalizeDefaultSpreadsheetSettings(configuration);
    assert.deepEqual(spreadsheets.map(({ menuName, link }) => [menuName, new URL(link).pathname.split("/")[3]]),
        expectedSpreadsheets);
    assert.equal(new Set(spreadsheets.map(({ link }) => link)).size, expectedSpreadsheets.length);
});

test("configuração incorporada mantém a mesma ordem e os mesmos links da configuração padrão", async () => {
    const source = await readFile(new URL("../js/spreadsheets/load-spreadsheets.js", import.meta.url), "utf8");
    const fallback = source.match(/const FALLBACK_SPREADSHEET_SETTINGS =\s*Object\.freeze\(\[([\s\S]*?)\]\);/)?.[1];
    assert.ok(fallback, "A lista de reserva das planilhas deve existir.");
    const spreadsheets = Array.from(fallback.matchAll(/spreadsheetId:\s*"([^"]+)",\s*menuName:\s*"([^"]+)"/g),
        ([, id, name]) => [name, id]);
    assert.deepEqual(spreadsheets, expectedSpreadsheets);
});

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
