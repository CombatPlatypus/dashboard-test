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
import {
    FALLBACK_SPREADSHEET_SETTINGS,
    OPERATION_SPREADSHEET_SETTINGS,
} from "../js/spreadsheets/spreadsheet-presets.js";

const configPath =
    new URL(
        "../config/spreadsheets.json",
        import.meta.url,
    );

const expectedSpreadsheets = [
    ["Checklist Operacional", "1zjg2F1iPf9cd8lvuoCGgYIBm4qwtnpL56hWyJclJlnI"],
    ["Avarias", "1-T7ok_Pzfh2-002wgH8qx5oH7I8UDPv2"],
    ["Pacotes em Análise", "111dayXmqz5HZiXFYYBp-EzIgOhrXsaKC"],
    ["Controle de Endereços", "166K25CQqHYERaZ3xotO6-p-BTCO9OrBQNsNHJa3YWKI"],
    ["Backlog", "1jbnACxvCZV2zpJorNPf7pB5bIpygd1ELOIhlcm7AFbM"],
    ["Pacotes Retornados", "1Nqfqc2CWhIPgpDSzXKbtgVRY4MNz9y60"],
    ["Reversa", "1wtALHYfXyFm9nfkV9TP1idnVV12oBwa-"],
    ["Controle Operacional", "1UWlOQfVw-eD1ZkD5gxCo2MHZ4CEyJUd4osungKFTfwA"],
    ["Stuck Orders", "1FisKLnYYdqg94k6ZFENFIj8nJaCv4-rr4TeCHm4mCSw"],
    ["Pacotes Full", "1PnKEGQtfETj0ptk7xAIPG3dcrZgbBunWFUJp18O_XDE"],
    ["Insucesso", "1CvONso--DM9_Rdf4ieesREV5lpD0e-hb"],
    ["SPM1", "1PnKEGQtfETj0ptk7xAIPG3dcrZgbBunWFUJp18O_XDE"],
    ["Controle de Equipamentos", "1EDSg6R1qmHWpif4b-0J-qxUo78XUK-a8"],
    ["Mapa de Calor", "1wtCWPTkgkAULZ7lPCL9R2UWLGUSzypNV"],
    ["Avarias AppSheet", "1SpChx2r8HHeqWQAYDELewvKzQM8eRLIgknT2EiMjPnU"],
];

test("ordem padrão mantém os quinze nomes e links solicitados", async () => {
    const configuration = JSON.parse(await readFile(configPath, "utf8"));
    const spreadsheets = normalizeDefaultSpreadsheetSettings(configuration);
    assert.deepEqual(spreadsheets.map(({ menuName, link }) => [menuName, new URL(link).pathname.split("/")[3]]),
        expectedSpreadsheets);
    assert.equal(spreadsheets.find(item => item.menuName === "Controle de Equipamentos").menuName,
        "Controle de Equipamentos");
});

test("configuração incorporada mantém a mesma ordem e os mesmos links da configuração padrão", async () => {
    const configuration = JSON.parse(await readFile(configPath, "utf8"));
    assert.deepEqual(FALLBACK_SPREADSHEET_SETTINGS, normalizeDefaultSpreadsheetSettings(configuration));
});

test("atalho da operação mantém dezesseis nomes completos e seus respectivos destinos", () => {
    const expected = [
        ["Resumo da Operação", "1ikhuvRYNdqlEmkBPuclqLqqeSO88ITvAtxZN0nhhzFs"],
        ["Checklist Operacional", "15goeiy-QDNIVC6N1kFSG55rqECRwv58FMXwgoDyt25o"],
        ["Avarias e Perdas", "11jdHDwRBiDKTpP2G7s02v0wR2K27nJ5mG9G6aExwESQ"],
        ["Controle de Endereços", "166K25CQqHYERaZ3xotO6-p-BTCO9OrBQNsNHJa3YWKI"],
        ["Backlog", "11jdHDwRBiDKTpP2G7s02v0wR2K27nJ5mG9G6aExwESQ"],
        ["Reversa", "11jdHDwRBiDKTpP2G7s02v0wR2K27nJ5mG9G6aExwESQ"],
        ["Controle Operacional", "1UWlOQfVw-eD1ZkD5gxCo2MHZ4CEyJUd4osungKFTfwA"],
        ["Stuck Orders", "1FisKLnYYdqg94k6ZFENFIj8nJaCv4-rr4TeCHm4mCSw"],
        ["Pacotes Full", "1PnKEGQtfETj0ptk7xAIPG3dcrZgbBunWFUJp18O_XDE"],
        ["Insucesso", "1CvONso--DM9_Rdf4ieesREV5lpD0e-hb"],
        ["SPM1", "1PnKEGQtfETj0ptk7xAIPG3dcrZgbBunWFUJp18O_XDE"],
        ["Controle de Equipamentos", "1EDSg6R1qmHWpif4b-0J-qxUo78XUK-a8"],
        ["Avarias AppSheet", "1SpChx2r8HHeqWQAYDELewvKzQM8eRLIgknT2EiMjPnU"],
        ["Relatório de Planejamento", "1vdJ7cgfN56hlKR1UnGDpctzfxZK2EkLSXfgxCIEMUNE"],
        ["Relatório de Processamento", "1ySTMhlf8AROkIkly83cUPQ9pzqP2FjhU7hE0aIO9YYA"],
        ["Relatório de Expedição", "15U1VuVYA1paDWwQuKZ7_7waGM_J2HtuCl1y_6EiNzcU"],
    ];
    assert.deepEqual(OPERATION_SPREADSHEET_SETTINGS,
        expected.map(([menuName, id]) => ({ menuName, link: `https://docs.google.com/spreadsheets/d/${id}/` })));
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
            "https://docs.google.com/spreadsheets/d/1Nqfqc2CWhIPgpDSzXKbtgVRY4MNz9y60/",
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
