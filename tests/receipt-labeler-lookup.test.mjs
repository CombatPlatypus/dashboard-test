import assert from "node:assert/strict";
import test from "node:test";
import { findReceiptLabelerOps, parseReceiptLabelerDirectory } from "../js/reports/receipt/labeler-lookup.js";

test("localiza as colunas de colaboradores na aba copiada e aceita o terceiro nome", () => {
    const directory = parseReceiptLabelerDirectory([
        "\tANÁLISE DE COLABORADORES\t\t",
        "\tID [OPS]\tNome do Colaborador\tRank de Etiquetagem",
        "\tops42\tLUANA TOSIN\t2º",
        "\t[OPS0052]\tJOÃO CARLOS DE LIMA\t1º",
        "\t0072\tANA DA ROCHA\t",
        "\t\t\t",
    ].join("\r\n"));

    assert.equal(directory.length, 3);
    assert.equal(findReceiptLabelerOps(" Luana   Tosin ", directory), "42");
    assert.equal(findReceiptLabelerOps("joao lima", directory), "0052");
    assert.equal(findReceiptLabelerOps("Ana Rocha", directory), "0072");
    assert.equal(findReceiptLabelerOps("João", directory), "");
});

test("aceita duas colunas sem cabeçalho e exige um OPS único entre as correspondências", () => {
    const directory = parseReceiptLabelerDirectory([
        "ops1\tBruno Martinelli dos Santos",
        "ops2\tBruno Santos Balula",
        "ops2\tBruno Santos Balula",
        "ops3\tMaria de Souza",
        "ops4\tMaria Luiza de Souza",
    ].join("\n"));

    assert.equal(findReceiptLabelerOps("Bruno Santos", directory), "");
    assert.equal(findReceiptLabelerOps("Bruno Balula", directory), "2");
    assert.equal(findReceiptLabelerOps("Bruno Santos Balula", directory), "2");
    assert.equal(findReceiptLabelerOps("Maria Souza", directory), "3");
    assert.equal(findReceiptLabelerOps("Bru Santos", directory), "");
});

test("informa ausência de OPS quando o nome falta ou a lista contém um código inválido", () => {
    const directory = parseReceiptLabelerDirectory([
        "ID [OPS]\tNome do Colaborador",
        "ops10\tMaria Clara da Silva",
        "\tMaria Rita da Silva",
        "opsX12\tMaria Alves",
    ].join("\n"));

    assert.equal(findReceiptLabelerOps("Maria Silva", directory), "");
    assert.equal(findReceiptLabelerOps("Maria Rita", directory), "");
    assert.equal(findReceiptLabelerOps("Maria Alves", directory), "");
    assert.equal(findReceiptLabelerOps("Ana Campos", directory), "");
});
