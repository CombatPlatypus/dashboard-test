// DEFINE AS CONFIGURAÇÕES GERAIS DA INTEGRAÇÃO COM O GOOGLE

export const CONFIG = {

    google: {

        clientId:
            "671842519306-an0e8ahhftppp3v0bshjdq5d384ab1b9.apps.googleusercontent.com", // ID DA API GERADO PELO GOOGLE

        sheetsApiKey:
            "AIzaSyCATqioFrLxHy6STfRks_WGqmg0ynXq5nY", // CHAVE DA API DO SHEETS

        linksSpreadsheetId:
            "1IS4QDnMenXTi07FhiL-nFINrEjLppAfZhSlogZq22hY", // ID DA PLANILHA COM AS CONFIGURAÇÕES DO DASHBOARD

        linksSpreadsheetRange:
            "Planilhas!A2:F", // DETERMINA OS CAMPOS ONDE SERÁ BUSCADO AS INFORMAÇÕES DOS LINKS

        statisticsSpreadsheetId:
            "1WqOBDJmM2vzt2RXOsve726s9e4BbjENctcCYkvBpJsk",

        statisticsSpreadsheetRange:
            "A1:C",

        statisticsScopes: [
            "https://www.googleapis.com/auth/spreadsheets.readonly"
        ],

        scopes: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/drive.readonly"
        ]
    }
};
