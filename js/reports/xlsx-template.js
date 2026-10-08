const XLSX_MIME_TYPE =
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function escapeRegExp(value) {
    return String(value)
        .replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&",
        );
}

function escapeXmlText(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function decodeXmlText(value) {
    return String(value)
        .replace(
            /&#x([0-9a-f]+);/gi,
            function (_, code) {
                return String.fromCodePoint(
                    Number.parseInt(
                        code,
                        16,
                    ),
                );
            },
        )
        .replace(
            /&#(\d+);/g,
            function (_, code) {
                return String.fromCodePoint(
                    Number.parseInt(
                        code,
                        10,
                    ),
                );
            },
        )
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&gt;/g, ">")
        .replace(/&lt;/g, "<")
        .replace(/&amp;/g, "&");
}

function getXmlAttribute(
    tag,
    attributeName,
) {
    const pattern =
        new RegExp(
            `\\s${escapeRegExp(attributeName)}` +
            "\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)')",
        );

    const match =
        String(tag).match(
            pattern,
        );

    if (!match) {
        return null;
    }

    return decodeXmlText(
        match[1] ??
        match[2] ??
        "",
    );
}

function setXmlAttribute(
    tag,
    attributeName,
    value,
) {
    const pattern =
        new RegExp(
            `(\\s${escapeRegExp(attributeName)}` +
            "\\s*=\\s*)(?:\"[^\"]*\"|'[^']*')",
        );

    if (
        value === null ||
        value === undefined
    ) {
        return String(tag).replace(
            pattern,
            "",
        );
    }

    const attribute =
        ` ${attributeName}="${escapeXmlText(value)}"`;

    if (pattern.test(tag)) {
        return String(tag).replace(
            pattern,
            attribute,
        );
    }

    return String(tag).replace(
        /\s*\/?>$/,
        function (ending) {
            return (
                attribute +
                (
                    ending.includes("/")
                        ? "/>"
                        : ">"
                )
            );
        },
    );
}

function normalizeZipPath(path) {
    const segments = [];

    String(path)
        .replace(/\\/g, "/")
        .split("/")
        .forEach(
            function (segment) {
                if (
                    !segment ||
                    segment === "."
                ) {
                    return;
                }

                if (segment === "..") {
                    segments.pop();

                    return;
                }

                segments.push(
                    segment,
                );
            },
        );

    return segments.join("/");
}

function resolveRelationshipTarget(
    sourcePath,
    target,
) {
    const normalizedTarget =
        String(target ?? "")
            .replace(/\\/g, "/");

    if (!normalizedTarget) {
        throw new Error(
            "O caminho da planilha no arquivo XLSX é inválido.",
        );
    }

    if (
        normalizedTarget.startsWith(
            "/",
        )
    ) {
        return normalizeZipPath(
            normalizedTarget,
        );
    }

    const sourceDirectory =
        String(sourcePath)
            .replace(/\\/g, "/")
            .split("/")
            .slice(0, -1)
            .join("/");

    return normalizeZipPath(
        `${sourceDirectory}/${normalizedTarget}`,
    );
}

async function readArchiveText(
    archive,
    path,
) {
    const file =
        archive?.file?.(
            path,
        );

    if (!file) {
        throw new Error(
            `O arquivo ${path} não foi encontrado no modelo XLSX.`,
        );
    }

    return file.async(
        "string",
    );
}

async function readOptionalArchiveText(
    archive,
    path,
) {
    const file =
        archive?.file?.(
            path,
        );

    return file
        ? file.async(
            "string",
        )
        : "";
}

function getXmlTextContent(xml) {
    return Array.from(
        String(xml).matchAll(
            /<t\b[^>]*>([\s\S]*?)<\/t>/g,
        ),
    )
        .map(
            function (match) {
                return decodeXmlText(
                    match[1],
                );
            },
        )
        .join("");
}

function parseSharedStringsXml(
    sharedStringsXml,
) {
    return Array.from(
        String(sharedStringsXml).matchAll(
            /<si\b[^>]*>([\s\S]*?)<\/si>/g,
        ),
    ).map(
        function (match) {
            return getXmlTextContent(
                match[1],
            );
        },
    );
}

function parseWorksheetCellValues(
    worksheetXml,
    sharedStrings = [],
) {
    const cellValues =
        new Map();

    Array.from(
        String(worksheetXml).matchAll(
            /<c\b[^>]*\/>|<c\b[^>]*>[\s\S]*?<\/c>/g,
        ),
    ).forEach(
        function (match) {
            const cellXml =
                match[0];

            const openingTag =
                cellXml.match(
                    /^<c\b[^>]*\/?\s*>/,
                )?.[0];

            const cellReference =
                getXmlAttribute(
                    openingTag,
                    "r",
                )?.toUpperCase();

            if (!cellReference) {
                return;
            }

            const type =
                getXmlAttribute(
                    openingTag,
                    "t",
                );

            if (type === "inlineStr") {
                cellValues.set(
                    cellReference,
                    getXmlTextContent(
                        cellXml,
                    ),
                );

                return;
            }

            const rawValue =
                cellXml.match(
                    /<v\b[^>]*>([\s\S]*?)<\/v>/,
                )?.[1];

            if (rawValue === undefined) {
                return;
            }

            const decodedValue =
                decodeXmlText(
                    rawValue,
                );

            if (type === "s") {
                cellValues.set(
                    cellReference,
                    sharedStrings[
                        Number.parseInt(
                            decodedValue,
                            10,
                        )
                    ] ?? "",
                );

                return;
            }

            if (type === "b") {
                cellValues.set(
                    cellReference,
                    decodedValue === "1",
                );

                return;
            }

            const numericValue =
                Number(
                    decodedValue,
                );

            cellValues.set(
                cellReference,
                decodedValue !== "" &&
                Number.isFinite(
                    numericValue,
                )
                    ? numericValue
                    : decodedValue,
            );
        },
    );

    return cellValues;
}

async function findWorksheetPath(
    archive,
    sheetName,
) {
    const workbookPath =
        "xl/workbook.xml";

    const relationshipsPath =
        "xl/_rels/workbook.xml.rels";

    const [
        workbookXml,
        relationshipsXml,
    ] = await Promise.all([
        readArchiveText(
            archive,
            workbookPath,
        ),
        readArchiveText(
            archive,
            relationshipsPath,
        ),
    ]);

    const normalizedSheetName =
        String(
            sheetName ?? "",
        ).trim();

    const sheetTag =
        Array.from(
            workbookXml.matchAll(
                /<sheet\b[^>]*\/?\s*>/g,
            ),
        )
            .map(
                function (match) {
                    return match[0];
                },
            )
            .find(
                function (tag) {
                    return (
                        getXmlAttribute(
                            tag,
                            "name",
                        ) ===
                        normalizedSheetName
                    );
                },
            );

    if (!sheetTag) {
        throw new Error(
            `A aba ${normalizedSheetName} não foi encontrada no modelo XLSX.`,
        );
    }

    const relationshipId =
        getXmlAttribute(
            sheetTag,
            "r:id",
        );

    const relationshipTag =
        Array.from(
            relationshipsXml.matchAll(
                /<Relationship\b[^>]*\/?\s*>/g,
            ),
        )
            .map(
                function (match) {
                    return match[0];
                },
            )
            .find(
                function (tag) {
                    return (
                        getXmlAttribute(
                            tag,
                            "Id",
                        ) ===
                        relationshipId
                    );
                },
            );

    if (!relationshipTag) {
        throw new Error(
            `A relação da aba ${normalizedSheetName} não foi encontrada.`,
        );
    }

    return resolveRelationshipTarget(
        workbookPath,
        getXmlAttribute(
            relationshipTag,
            "Target",
        ),
    );
}

async function readXlsxTemplateWorksheet({
    archive,
    sheetName,
}) {
    const worksheetPath =
        await findWorksheetPath(
            archive,
            sheetName,
        );

    const [
        worksheetXml,
        sharedStringsXml,
    ] = await Promise.all([
        readArchiveText(
            archive,
            worksheetPath,
        ),
        readOptionalArchiveText(
            archive,
            "xl/sharedStrings.xml",
        ),
    ]);

    return {
        worksheetPath,
        worksheetXml,
        cellValues:
            parseWorksheetCellValues(
                worksheetXml,
                parseSharedStringsXml(
                    sharedStringsXml,
                ),
            ),
    };
}

function normalizeCellReference(value) {
    const cellReference =
        String(
            value ?? "",
        )
            .trim()
            .toUpperCase();

    if (
        !/^[A-Z]+[1-9]\d*$/.test(
            cellReference,
        )
    ) {
        throw new TypeError(
            `A referência de célula ${value} é inválida.`,
        );
    }

    return cellReference;
}

function normalizeCellEntries(cells) {
    let entries;

    if (cells instanceof Map) {
        entries =
            Array.from(
                cells.entries(),
            );
    } else if (Array.isArray(cells)) {
        entries = cells;
    } else if (
        cells &&
        typeof cells === "object"
    ) {
        entries =
            Object.entries(
                cells,
            );
    } else {
        throw new TypeError(
            "Informe as células que devem ser preenchidas no modelo XLSX.",
        );
    }

    const normalizedEntries =
        new Map();

    entries.forEach(
        function ([reference, value]) {
            const cellReference =
                normalizeCellReference(
                    reference,
                );

            if (
                normalizedEntries.has(
                    cellReference,
                )
            ) {
                throw new Error(
                    `A célula ${cellReference} foi informada mais de uma vez.`,
                );
            }

            normalizedEntries.set(
                cellReference,
                value,
            );
        },
    );

    return normalizedEntries;
}

function dateToExcelSerial(date) {
    if (
        !(date instanceof Date) ||
        Number.isNaN(
            date.getTime(),
        )
    ) {
        throw new TypeError(
            "A data informada para a planilha é inválida.",
        );
    }

    return (
        date.getTime() /
        86400000 +
        25569
    );
}

function createTextCellContent(value) {
    const text =
        String(value);

    const preserveSpace =
        /^\s|\s$/.test(
            text,
        );

    return (
        "<is><t" +
        (
            preserveSpace
                ? ' xml:space="preserve"'
                : ""
        ) +
        `>${escapeXmlText(text)}</t></is>`
    );
}

function createCachedFormulaValue(value) {
    if (
        value === undefined ||
        value === null
    ) {
        return {
            type: null,
            content: "",
        };
    }

    if (typeof value === "boolean") {
        return {
            type: "b",
            content:
                `<v>${value ? 1 : 0}</v>`,
        };
    }

    if (
        typeof value === "number" ||
        value instanceof Date
    ) {
        const number =
            value instanceof Date
                ? dateToExcelSerial(
                    value,
                )
                : value;

        if (!Number.isFinite(number)) {
            throw new TypeError(
                "O resultado numérico da fórmula é inválido.",
            );
        }

        return {
            type: null,
            content:
                `<v>${number}</v>`,
        };
    }

    return {
        type: "str",
        content:
            `<v>${escapeXmlText(value)}</v>`,
    };
}

function createCellPayload(value) {
    if (
        value &&
        typeof value === "object" &&
        !(value instanceof Date) &&
        Object.prototype.hasOwnProperty.call(
            value,
            "formula",
        )
    ) {
        const formula =
            String(
                value.formula ?? "",
            )
                .replace(
                    /^=/,
                    "",
                );

        if (!formula) {
            throw new TypeError(
                "A fórmula informada para a planilha está vazia.",
            );
        }

        const cachedValue =
            createCachedFormulaValue(
                value.value,
            );

        return {
            type:
                cachedValue.type,
            content:
                `<f>${escapeXmlText(formula)}</f>` +
                cachedValue.content,
        };
    }

    if (
        value === undefined ||
        value === null
    ) {
        return {
            type: null,
            content: "",
        };
    }

    if (typeof value === "boolean") {
        return {
            type: "b",
            content:
                `<v>${value ? 1 : 0}</v>`,
        };
    }

    if (
        typeof value === "number" ||
        value instanceof Date
    ) {
        const number =
            value instanceof Date
                ? dateToExcelSerial(
                    value,
                )
                : value;

        if (!Number.isFinite(number)) {
            throw new TypeError(
                "O valor numérico informado para a planilha é inválido.",
            );
        }

        return {
            type: null,
            content:
                `<v>${number}</v>`,
        };
    }

    return {
        type: "inlineStr",
        content:
            createTextCellContent(
                value,
            ),
    };
}

function replaceWorksheetCells(
    worksheetXml,
    cells,
) {
    const normalizedCells =
        normalizeCellEntries(
            cells,
        );

    const replacedCells =
        new Set();

    const updatedXml =
        String(worksheetXml).replace(
            /<c\b[^>]*\/>|<c\b[^>]*>[\s\S]*?<\/c>/g,
            function (cellXml) {
                const openingTag =
                    cellXml.match(
                        /^<c\b[^>]*\/?\s*>/,
                    )?.[0];

                const cellReference =
                    getXmlAttribute(
                        openingTag,
                        "r",
                    )?.toUpperCase();

                if (
                    !cellReference ||
                    !normalizedCells.has(
                        cellReference,
                    )
                ) {
                    return cellXml;
                }

                const payload =
                    createCellPayload(
                        normalizedCells.get(
                            cellReference,
                        ),
                    );

                let updatedOpeningTag =
                    setXmlAttribute(
                        openingTag,
                        "t",
                        payload.type,
                    )
                        .replace(
                            /\s*\/>$/,
                            ">",
                        );

                replacedCells.add(
                    cellReference,
                );

                if (!payload.content) {
                    updatedOpeningTag =
                        updatedOpeningTag.replace(
                            />$/,
                            "/>",
                        );

                    return updatedOpeningTag;
                }

                return (
                    updatedOpeningTag +
                    payload.content +
                    "</c>"
                );
            },
        );

    const missingCells =
        Array.from(
            normalizedCells.keys(),
        ).filter(
            function (cellReference) {
                return !replacedCells.has(
                    cellReference,
                );
            },
        );

    if (missingCells.length > 0) {
        throw new Error(
            "As seguintes células não existem no modelo XLSX: " +
            missingCells.join(", ") +
            ".",
        );
    }

    return updatedXml;
}

async function updateXlsxTemplateArchive({
    archive,
    sheetName,
    cells,
}) {
    if (
        !archive ||
        typeof archive.file !==
            "function"
    ) {
        throw new TypeError(
            "O modelo XLSX carregado é inválido.",
        );
    }

    const template =
        await readXlsxTemplateWorksheet({
            archive,
            sheetName,
        });

    const resolvedCells =
        typeof cells === "function"
            ? await cells(
                template,
            )
            : cells;

    archive.file(
        template.worksheetPath,
        replaceWorksheetCells(
            template.worksheetXml,
            resolvedCells,
        ),
        {
            createFolders: false,
        },
    );

    return {
        archive,
        worksheetPath:
            template.worksheetPath,
    };
}

function getJsZipLibrary(
    jsZipLibrary =
        globalThis.JSZip,
) {
    if (
        !jsZipLibrary ||
        typeof jsZipLibrary.loadAsync !==
            "function"
    ) {
        throw new Error(
            "A biblioteca JSZip não foi carregada.",
        );
    }

    return jsZipLibrary;
}

async function createXlsxTemplateBlob({
    templateUrl,
    sheetName,
    cells,
    fetchFunction =
        globalThis.fetch,
    jsZipLibrary =
        globalThis.JSZip,
}) {
    if (
        typeof fetchFunction !==
        "function"
    ) {
        throw new Error(
            "O navegador não permite carregar o modelo XLSX.",
        );
    }

    const response =
        await fetchFunction(
            templateUrl,
            {
                cache: "no-store",
            },
        );

    if (!response.ok) {
        throw new Error(
            `Não foi possível carregar o modelo XLSX (${response.status}).`,
        );
    }

    const jsZip =
        getJsZipLibrary(
            jsZipLibrary,
        );

    const archive =
        await jsZip.loadAsync(
            await response.arrayBuffer(),
        );

    await updateXlsxTemplateArchive({
        archive,
        sheetName,
        cells,
    });

    return archive.generateAsync({
        type: "blob",
        mimeType:
            XLSX_MIME_TYPE,
        compression: "DEFLATE",
        compressionOptions: {
            level: 6,
        },
    });
}

export {
    XLSX_MIME_TYPE,
    createXlsxTemplateBlob,
    findWorksheetPath,
    parseSharedStringsXml,
    parseWorksheetCellValues,
    readXlsxTemplateWorksheet,
    replaceWorksheetCells,
    updateXlsxTemplateArchive,
};
