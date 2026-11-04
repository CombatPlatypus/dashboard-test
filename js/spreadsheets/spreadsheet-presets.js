const SPREADSHEET_MENU_NAME_MAX_LENGTH = 60;

function createSpreadsheetPreset(entries) {
    return Object.freeze(entries.map(([menuName, spreadsheetId]) => Object.freeze({
        menuName,
        link: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/`,
    })));
}

const FALLBACK_SPREADSHEET_SETTINGS = createSpreadsheetPreset([
    ["Checklist Operacional", "1zjg2F1iPf9cd8lvuoCGgYIBm4qwtnpL56hWyJclJlnI"],
    ["Avarias", "1-T7ok_Pzfh2-002wgH8qx5oH7I8UDPv2"],
    ["Pacotes em Análise", "111dayXmqz5HZiXFYYBp-EzIgOhrXsaKC"],
    ["Justificativas", "1sOzs3lgS6dO0WluGRQR2B8kmFTDUR5VC"],
    ["Erros de Etiquetagem", "1MJFZlrUrcZXve4WOYYLjCrKeUkD0QgSshCfZdWxNMZA"],
    ["Controle de Endereços", "166K25CQqHYERaZ3xotO6-p-BTCO9OrBQNsNHJa3YWKI"],
    ["Backlog", "1jbnACxvCZV2zpJorNPf7pB5bIpygd1ELOIhlcm7AFbM"],
    ["Pacotes Retornados", "1Nqfqc2CWhIPgpDSzXKbtgVRY4MNz9y60"],
    ["Reversa", "1wtALHYfXyFm9nfkV9TP1idnVV12oBwa-"],
    ["Controle Operacional", "1UWlOQfVw-eD1ZkD5gxCo2MHZ4CEyJUd4osungKFTfwA"],
    ["Stuck Orders", "1FisKLnYYdqg94k6ZFENFIj8nJaCv4-rr4TeCHm4mCSw"],
    ["Pacotes Full", "1PnKEGQtfETj0ptk7xAIPG3dcrZgbBunWFUJp18O_XDE"],
    ["Insucesso", "1CvONso--DM9_Rdf4ieesREV5lpD0e-hb"],
    ["Controle de Equipamentos", "1EDSg6R1qmHWpif4b-0J-qxUo78XUK-a8"],
    ["Mapa de Calor", "1wtCWPTkgkAULZ7lPCL9R2UWLGUSzypNV"],
    ["Avarias AppSheet", "1SpChx2r8HHeqWQAYDELewvKzQM8eRLIgknT2EiMjPnU"],
]);

const OPERATION_SPREADSHEET_SETTINGS = createSpreadsheetPreset([
    ["Resumo da Operação", "1ikhuvRYNdqlEmkBPuclqLqqeSO88ITvAtxZN0nhhzFs"],
    ["Checklist Operacional", "15goeiy-QDNIVC6N1kFSG55rqECRwv58FMXwgoDyt25o"],
    ["Avarias e Perdas", "11jdHDwRBiDKTpP2G7s02v0wR2K27nJ5mG9G6aExwESQ"],
    ["Controle de Endereços", "166K25CQqHYERaZ3xotO6-p-BTCO9OrBQNsNHJa3YWKI"],
    ["Justificativas", "1sOzs3lgS6dO0WluGRQR2B8kmFTDUR5VC"],
    ["Backlog", "1PUheTCH7QeLo-4c3t3-GS8eQrtAHiZ8B4ICZFsUJ8hA"],
    ["Reversa", "1CIdBvPaCkLo9elCjyHuKzQ7rfLepiMv6xBXAeYxUL1Y"],
    ["Controle Operacional", "1UWlOQfVw-eD1ZkD5gxCo2MHZ4CEyJUd4osungKFTfwA"],
    ["Stuck Orders", "1FisKLnYYdqg94k6ZFENFIj8nJaCv4-rr4TeCHm4mCSw"],
    ["Pacotes Full", "1PnKEGQtfETj0ptk7xAIPG3dcrZgbBunWFUJp18O_XDE"],
    ["Insucesso", "1CvONso--DM9_Rdf4ieesREV5lpD0e-hb"],
    ["Controle de Equipamentos", "1EDSg6R1qmHWpif4b-0J-qxUo78XUK-a8"],
    ["Avarias AppSheet", "1SpChx2r8HHeqWQAYDELewvKzQM8eRLIgknT2EiMjPnU"],
    ["Relatório de Planejamento", "1vdJ7cgfN56hlKR1UnGDpctzfxZK2EkLSXfgxCIEMUNE"],
    ["Relatório de Processamento", "1ySTMhlf8AROkIkly83cUPQ9pzqP2FjhU7hE0aIO9YYA"],
    ["Relatório de Expedição", "15U1VuVYA1paDWwQuKZ7_7waGM_J2HtuCl1y_6EiNzcU"],
]);

export {
    FALLBACK_SPREADSHEET_SETTINGS,
    OPERATION_SPREADSHEET_SETTINGS,
    SPREADSHEET_MENU_NAME_MAX_LENGTH,
};
