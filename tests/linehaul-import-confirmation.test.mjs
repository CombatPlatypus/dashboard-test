import assert from "node:assert/strict";
import {
    readFile,
} from "node:fs/promises";
import {
    test,
} from "node:test";

test(
    "Planejamento e Processamento importam mais de 8 LHs sem confirmação",
    async function () {
        const [
            planningImport,
            receiptImport,
        ] = await Promise.all([
            readFile(
                new URL(
                    "../js/reports/planning/import.js",
                    import.meta.url,
                ),
                "utf8",
            ),
            readFile(
                new URL(
                    "../js/reports/receipt/linehaul-import.js",
                    import.meta.url,
                ),
                "utf8",
            ),
        ]);

        for (const source of [
            planningImport,
            receiptImport,
        ]) {
            assert.doesNotMatch(
                source,
                /Normalmente a lista possui até|EXPECTED_MAXIMUM/,
            );
        }

        assert.match(
            planningImport,
            /A importação substituirá os LHs preenchidos atualmente/,
        );

        assert.match(
            receiptImport,
            /A importação substituirá as viagens carregadas atualmente/,
        );
    },
);
