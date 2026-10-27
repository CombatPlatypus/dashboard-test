import {
    loadDefaultSpreadsheetSettings,
} from "./default-spreadsheets.js";
import { updateReportContextField } from "../reports/core/report-context.js";

const DASHBOARD_SETTINGS_SESSION_KEY = "dashboard-settings-session-v1";
const DASHBOARD_THEMES = Object.freeze(["default", "red", "blue", "green", "pink", "purple"]);

const DEFAULT_DASHBOARD_PROFILE = Object.freeze({
    name: "", email: "", shift: "AM", icon: "default",
});
const DASHBOARD_PROFILE_ICONS = Object.freeze({
    default: "images/geral-icons/hub-logo-menu.svg",
    owl: "images/profile-icons/owl-icon.svg",
    platypus: "images/profile-icons/platypus-icon.svg",
    elephant: "images/profile-icons/elephant-icon.svg",
    snake: "images/profile-icons/snake-icon.svg",
    cat: "images/profile-icons/cat-icon.svg",
});

const DASHBOARD_SPREADSHEET_LIMIT = 20;

const DASHBOARD_SPREADSHEET_IMPORT_LIMIT = 30;

const EMPTY_SPREADSHEET_COUNT = 8;

const EMPTY_SPREADSHEET_LABEL =
    "Esperando uma Planilha";

const EMPTY_SPREADSHEET_URL =
    "https://docs.google.com/spreadsheets/d/1ZVWMVaT3bCAPxZbZgKfMqZUIBif3pr8cnnpc4Lx8lkA/edit?gid=0#gid=0";

const GOOGLE_SPREADSHEETS_URL_PREFIX =
    "https://docs.google.com/spreadsheets/";

const DEFAULT_REVERSE_FORM_URL =
    "https://docs.google.com/forms/d/e/1FAIpQLSdD3VRRIrvWhUQc5-IOjqMKdL6bIuGemyUeH2SJPv5l2qcnaQ/viewform";

const DEFAULT_PACK_RECOVERY_URL =
    "https://www.appsheet.com/Account/Login?" +
    "appName=Pack%20Recovery&FullScope=False&provider=google" +
    "&returnUrl=https%3A%2F%2Fwww.appsheet.com%2Fstart%2Fb80b7b1a-f8dc-42f5-a596-082252124ffb%3Fplatform%3Ddesktop" +
    "#appName=PackRecover-51650155" +
    "&vss=H4sIAAAAAAAAA6XOsQ7CIBgE4He5mSdg1Q6NUYeaLuKA5W9CbKEpVG0I7y5ojXPjyJHv_gu4a3pUXjY38HP4vXY0gyMInOaBBLjAxho_2k6ACRxk_wm3RVWXx0ogIl7Yl3ty4GGV5n_dZtCKjNetpjFXZZgqFpa-M0rBQhAZ-snLa0fvtYnEmLLWNpMjVach6we40hTPQRq1tyo1trJzFF-JXWqEYAEAAA==" +
    "&view=DESVIOS";

const DEFAULT_DAMAGE_APP_URL =
    "https://www.appsheet.com/start/9898e1c7-28cc-4bcc-9e15-b13a73533544?platform=desktop" +
    "#appName=AVARIASLSP-63-957299733-25-10-22" +
    "&vss=H4sIAAAAAAAAA6WRzU7CQBDHX4XMuREoWGBPihhjjB8BwoUSM7ZT2dh2m90tSJo-jM_iiznLR_TgBbjtzsxv5v-fqWAlaT2xGH2AmFe_vwfagIAqhOmmoBBECDcqt1qlIXghPGG2C758f73LHNsh1OCBIdTRcko6Y3Y49oPu4LLd6wwGfvuZ0xbfUnLoVE22lVx1vUIt0UDtnT78dUQWZeo01Avv0MaSAVEdZ0GcuwEZU25lIkm7Xo7kHnuO047iwIFh15CV27VsBTNTc-gU42co_9PlWAN79B8fMFbrnQ6M-v2g0_NFo9VttoKm3_ID0VhJq_SFkRmqK7NUBdFFpDKecKdVWQwZnPMpJ0rbw3tECZapnWFausvOF7XbVaKi0lA8Y--nezb3-e1ngXn8qGIWn2BqqP4BMXkggBsDAAA=" +
    "&row=ac886372:%2004/06/2026:%20vitor.simao@shopee.com" +
    "&view=P%C3%A1gina1_Detail";

const DEFAULT_COLLECTION_APP_URL =
    "https://www.appsheet.com/start/e90438ea-37a9-47f7-a28f-1499b53fbd35" +
    "#appName=ColetasLMHub-510641030" +
    "&page=gallery&sort=%5B%5D" +
    "&table=MenuInicial&view=Menu";

const FALLBACK_SPREADSHEET_SETTINGS =
    Object.freeze([
        {
            spreadsheetId: "15goeiy-QDNIVC6N1kFSG55rqECRwv58FMXwgoDyt25o",
            menuName: "Checklist Operacional",
        },
        {
            spreadsheetId: "1WaHywDEm3ipdvEtq-pB01v4kyaREhn2i",
            menuName: "Avarias",
        },
        {
            spreadsheetId: "1xJZpuck84CM9-FTYd5UnWbZ4AezWUdGx",
            menuName: "Pacotes em Análise",
        },
        {
            spreadsheetId: "1cbHXjnfHGIDSob9Sh977p5J827qPlM5f9juRq_sIgcM",
            menuName: "Backlog e Logs",
        },
        {
            spreadsheetId: "1b9VlTXNfWhOqJtx9UoPrQchh77AiPqcs",
            menuName: "Pacotes Retornados",
        },
        {
            spreadsheetId: "1MJFZlrUrcZXve4WOYYLjCrKeUkD0QgSshCfZdWxNMZA",
            menuName: "Erros de Etiquetagem",
        },
        {
            spreadsheetId: "1UWlOQfVw-eD1ZkD5gxCo2MHZ4CEyJUd4osungKFTfwA",
            menuName: "Gerenciamento de Rotas",
        },
        {
            spreadsheetId: "1sh3TgSwLOt8EhoDhji2CHivbrEQiuhIpoBw0VHe2JoE",
            menuName: "Controle Operacional",
        },
        {
            spreadsheetId: "1FisKLnYYdqg94k6ZFENFIj8nJaCv4-rr4TeCHm4mCSw",
            menuName: "Stuck Orders",
        },
        {
            spreadsheetId: "18jFdAElZYUlGEQaAMrUdqLu6Ux_LyQupyq9N-m-jLg0",
            menuName: "Controle de Endereços",
        },
        {
            spreadsheetId: "1sOzs3lgS6dO0WluGRQR2B8kmFTDUR5VC",
            menuName: "Justificativas",
        },
        {
            spreadsheetId: "1FpcZuJboPyMKUGZwYHGHRYg4Pr_Phs4-ycqg-u7qGSU",
            menuName: "Erros de Processo",
        },
        {
            spreadsheetId: "1J41DYbdogIyzxJxKOBJa_9uforRo5faS",
            menuName: "Insucesso",
        },
        {
            spreadsheetId: "1wtALHYfXyFm9nfkV9TP1idnVV12oBwa-",
            menuName: "Reversa",
        },
        {
            spreadsheetId: "15ycLVugBymQR63SivMIvwRMce4dTe5XV",
            menuName: "Equipamentos",
        },
        {
            spreadsheetId: "1PnKEGQtfETj0ptk7xAIPG3dcrZgbBunWFUJp18O_XDE",
            menuName: "Pacotes Full",
        },
        {
            spreadsheetId: "1SpChx2r8HHeqWQAYDELewvKzQM8eRLIgknT2EiMjPnU",
            menuName: "Avarias AppSheet",
        },
    ]);

let defaultSpreadsheetSettings =
    FALLBACK_SPREADSHEET_SETTINGS;

const SPREADSHEET_POSITION_NAMES =
    Object.freeze([
        "Primeira",
        "Segunda",
        "Terceira",
        "Quarta",
        "Quinta",
        "Sexta",
        "Sétima",
        "Oitava",
        "Nona",
        "Décima",
        "Décima Primeira",
        "Décima Segunda",
        "Décima Terceira",
        "Décima Quarta",
        "Décima Quinta",
        "Décima Sexta",
        "Décima Sétima",
        "Décima Oitava",
        "Décima Nona",
        "Vigésima",
    ]);

const DASHBOARD_EXTERNAL_LINK_KEYS =
    Object.freeze([
        "reverseForm",
        "packRecovery",
        "damageApp",
        "collectionApp",
    ]);

const LEGACY_DASHBOARD_EXTERNAL_LINK_KEYS =
    Object.freeze([
        "damageApp",
        "collectionApp",
    ]);

const DEFAULT_DASHBOARD_EXTERNAL_LINKS =
    Object.freeze({
        reverseForm:
            DEFAULT_REVERSE_FORM_URL,
        packRecovery:
            DEFAULT_PACK_RECOVERY_URL,
        damageApp:
            DEFAULT_DAMAGE_APP_URL,
        collectionApp:
            DEFAULT_COLLECTION_APP_URL,
    });

const dashboardSettingsState = {
    theme: "default",
    profile: { ...DEFAULT_DASHBOARD_PROFILE },
    footerVisibility: Object.fromEntries(DASHBOARD_EXTERNAL_LINK_KEYS.map(key => [key, true])),
    spreadsheets: [],

    externalLinks: {
        ...DEFAULT_DASHBOARD_EXTERNAL_LINKS,
    },
};

let dashboardSettingsElements = null;

let spreadsheetRenderTimer = null;

let updateSpreadsheetIframes = null;

/* CRIA A CONFIGURAÇÃO INICIAL */

function createDefaultSpreadsheetSetting(
    index,
) {
    const defaultSetting =
        defaultSpreadsheetSettings[
            index
        ];

    if (!defaultSetting) {
        return {
            link: "",
            menuName: "",
            visible: true,
        };
    }

    return {
        link:
            defaultSetting.link ||
            (
                `${GOOGLE_SPREADSHEETS_URL_PREFIX}` +
                `d/${defaultSetting.spreadsheetId}/` +
                "edit?gid=0#gid=0"
            ),
        menuName:
            defaultSetting.menuName,
        visible: true,
    };
}

function createDefaultDashboardSettings() {
    return {
        theme: "default",
        profile: { ...DEFAULT_DASHBOARD_PROFILE },
        footerVisibility: Object.fromEntries(DASHBOARD_EXTERNAL_LINK_KEYS.map(key => [key, true])),
        spreadsheets:
            Array.from(
                {
                    length:
                        DASHBOARD_SPREADSHEET_LIMIT,
                },
                (_, index) =>
                    createDefaultSpreadsheetSetting(
                        index,
                    ),
            ),

        externalLinks: {
            ...DEFAULT_DASHBOARD_EXTERNAL_LINKS,
        },
    };
}

/* NORMALIZA OS VALORES RECEBIDOS */

function normalizeSettingsText(
    value,
    maximumLength = 4096,
) {
    return String(
        value ?? "",
    )
        .trim()
        .slice(
            0,
            maximumLength,
        );
}

function normalizeDashboardUrl(
    value,
) {
    const normalizedValue =
        normalizeSettingsText(
            value,
        );

    if (!normalizedValue) {
        return "";
    }

    try {
        const url =
            new URL(
                normalizedValue,
            );

        if (
            url.protocol !== "https:" &&
            url.protocol !== "http:"
        ) {
            return "";
        }

        return url.href;
    } catch {
        return "";
    }
}

function normalizeSpreadsheetUrl(
    value,
) {
    const normalizedValue =
        normalizeSettingsText(
            value,
        );

    if (
        !normalizedValue.startsWith(
            GOOGLE_SPREADSHEETS_URL_PREFIX,
        )
    ) {
        return "";
    }

    return normalizeDashboardUrl(
        normalizedValue,
    );
}

function normalizeSpreadsheetSetting(
    value = {},
) {
    return {
        link:
            normalizeSettingsText(
                value.link,
            ),

        menuName:
            normalizeSettingsText(
                value.menuName,
                22,
            ),

        visible:
            value.visible !== false &&
            value.visible !== "hide",
    };
}

function normalizeDashboardSettings(
    value = {},
) {
    const receivedSpreadsheets =
        Array.isArray(
            value.spreadsheets,
        )
            ? value.spreadsheets
            : [];

    const receivedExternalLinks =
        value.externalLinks &&
        typeof value.externalLinks ===
            "object" &&
        !Array.isArray(
            value.externalLinks,
        )
            ? value.externalLinks
            : {};

    return {
        theme: value.theme ?? "default",
        profile: {
            name: normalizeSettingsText(value.profile?.name, 60),
            email: normalizeSettingsText(value.profile?.email, 254),
            shift: value.profile?.shift || DEFAULT_DASHBOARD_PROFILE.shift,
            icon: value.profile?.icon || DEFAULT_DASHBOARD_PROFILE.icon,
        },
        footerVisibility: Object.fromEntries(
            DASHBOARD_EXTERNAL_LINK_KEYS.map(key => [key, value.footerVisibility?.[key] !== false]),
        ),
        spreadsheets:
            Array.from(
                {
                    length:
                        DASHBOARD_SPREADSHEET_LIMIT,
                },
                function (
                    unused,
                    index,
                ) {
                    return normalizeSpreadsheetSetting(
                        receivedSpreadsheets[
                            index
                        ],
                    );
                },
            ),

        externalLinks:
            Object.fromEntries(
                DASHBOARD_EXTERNAL_LINK_KEYS.map(
                    function (key) {
                        return [
                            key,
                            normalizeSettingsText(
                                Object.prototype
                                    .hasOwnProperty.call(
                                        receivedExternalLinks,
                                        key,
                                    )
                                    ? receivedExternalLinks[
                                        key
                                    ]
                                    : DEFAULT_DASHBOARD_EXTERNAL_LINKS[
                                        key
                                    ],
                            ),
                        ];
                    },
                ),
            ),
    };
}

/* VALIDA AS CONFIGURAÇÕES DE UMA SESSÃO */

function validateDashboardSettings(
    value,
) {
    if (
        !value ||
        typeof value !== "object" ||
        Array.isArray(value)
    ) {
        throw new TypeError(
            "As configurações do dashboard são inválidas.",
        );
    }

    if (
        !Array.isArray(
            value.spreadsheets,
        ) ||
        value.spreadsheets.length >
            DASHBOARD_SPREADSHEET_IMPORT_LIMIT
    ) {
        throw new TypeError(
            "A lista de planilhas da sessão é inválida.",
        );
    }

    value.spreadsheets.forEach(
        function (
            spreadsheet,
            index,
        ) {
            if (
                !spreadsheet ||
                typeof spreadsheet !==
                    "object" ||
                Array.isArray(
                    spreadsheet,
                ) ||
                typeof spreadsheet.link !==
                    "string" ||
                typeof spreadsheet.menuName !==
                    "string" ||
                typeof spreadsheet.visible !==
                    "boolean"
            ) {
                throw new TypeError(
                    `A configuração da planilha ${index + 1} é inválida.`,
                );
            }
        },
    );

    if (
        !value.externalLinks ||
        typeof value.externalLinks !==
            "object" ||
        Array.isArray(
            value.externalLinks,
        ) ||
        LEGACY_DASHBOARD_EXTERNAL_LINK_KEYS
            .some(
                function (key) {
                    return typeof value
                        .externalLinks[
                            key
                        ] !== "string";
                },
            ) ||
        DASHBOARD_EXTERNAL_LINK_KEYS.some(
            function (key) {
                return Object.prototype
                    .hasOwnProperty.call(
                        value.externalLinks,
                        key,
                    ) &&
                    typeof value.externalLinks[
                        key
                    ] !== "string";
            },
        )
    ) {
        throw new TypeError(
            "Os links adicionais da sessão são inválidos.",
        );
    }

    if (value.theme !== undefined && !DASHBOARD_THEMES.includes(value.theme)) {
        throw new TypeError("O tema do dashboard é inválido.");
    }
    if (value.profile !== undefined) {
        const profile = value.profile;
        if (!profile || typeof profile !== "object" || Array.isArray(profile) ||
            typeof profile.name !== "string" || profile.name.length > 60 ||
            typeof profile.email !== "string" || profile.email.length > 254 ||
            !["AM", "PM1", "PM2"].includes(profile.shift) ||
            !Object.hasOwn(DASHBOARD_PROFILE_ICONS, profile.icon)) {
            throw new TypeError("O perfil do analista é inválido.");
        }
    }
    if (value.footerVisibility !== undefined && (
        !value.footerVisibility || typeof value.footerVisibility !== "object" ||
        Array.isArray(value.footerVisibility) || DASHBOARD_EXTERNAL_LINK_KEYS.some(key =>
            Object.hasOwn(value.footerVisibility, key) && typeof value.footerVisibility[key] !== "boolean")
    )) {
        throw new TypeError("A visibilidade dos links do footer é inválida.");
    }

    return true;
}

/* EXPÕE UMA CÓPIA SEGURA PARA A SESSÃO */

function exportDashboardSettings() {
    return {
        theme: dashboardSettingsState.theme,
        profile: { ...dashboardSettingsState.profile },
        footerVisibility: { ...dashboardSettingsState.footerVisibility },
        spreadsheets:
            dashboardSettingsState
                .spreadsheets
                .map(
                    function (spreadsheet) {
                        return {
                            ...spreadsheet,
                        };
                    },
                ),

        externalLinks: {
            ...dashboardSettingsState
                .externalLinks,
        },
    };
}

/* CRIA O ÍCONE DO BOTÃO EXTERNO */

function createSpreadsheetLinkIcon() {
    const svgNamespace =
        "http://www.w3.org/2000/svg";

    const icon =
        document.createElementNS(
            svgNamespace,
            "svg",
        );

    const path =
        document.createElementNS(
            svgNamespace,
            "path",
        );

    icon.classList.add(
        "spreadsheets-link-icon",
    );

    icon.setAttribute(
        "viewBox",
        "0 0 24 24",
    );

    icon.setAttribute(
        "aria-hidden",
        "true",
    );

    path.setAttribute(
        "d",
        "M7 17L17 7M9 7H17V15",
    );

    path.setAttribute(
        "fill",
        "none",
    );

    path.setAttribute(
        "stroke",
        "currentColor",
    );

    path.setAttribute(
        "stroke-width",
        "2.5",
    );

    path.setAttribute(
        "stroke-linecap",
        "round",
    );

    path.setAttribute(
        "stroke-linejoin",
        "round",
    );

    icon.appendChild(
        path,
    );

    return icon;
}

/* MONTA AS CONFIGURAÇÕES VISÍVEIS */

function getVisibleSpreadsheetConfigurations() {
    const configurations =
        dashboardSettingsState
            .spreadsheets
            .map(
                function (
                    spreadsheet,
                    index,
                ) {
                    const url =
                        normalizeSpreadsheetUrl(
                            spreadsheet.link,
                        );

                    if (
                        !spreadsheet.visible ||
                        !url
                    ) {
                        return null;
                    }

                    const menuName =
                        spreadsheet.menuName ||
                        `Planilha ${index + 1}`;

                    return {
                        key:
                            `configured-${index + 1}`,
                        menuName,
                        spreadsheetName:
                            menuName,
                        url,
                    };
                },
            )
            .filter(Boolean);

    if (configurations.length > 0) {
        return configurations;
    }

    return Array.from(
        {
            length:
                EMPTY_SPREADSHEET_COUNT,
        },
        function (
            unused,
            index,
        ) {
            return {
                key:
                    `empty-${index + 1}`,
                menuName:
                    EMPTY_SPREADSHEET_LABEL,
                spreadsheetName:
                    EMPTY_SPREADSHEET_LABEL,
                url:
                    EMPTY_SPREADSHEET_URL,
            };
        },
    );
}

/* CRIA UMA OPÇÃO DO MENU */

function createSpreadsheetTab(
    configuration,
    index,
    panelId,
    activeKey,
) {
    const isInitialSpreadsheet =
        configuration.key ===
            activeKey ||
        (
            !activeKey &&
            index === 0
        );

    const tabItem =
        document.createElement(
            "li",
        );

    const tabLink =
        document.createElement(
            "a",
        );

    tabItem.classList.add(
        "tabs-title",
        "flex-box-center",
    );

    tabItem.classList.toggle(
        "is-active",
        isInitialSpreadsheet,
    );

    tabItem.dataset.spreadsheetKey =
        configuration.key;

    tabLink.setAttribute(
        "href",
        `#${panelId}`,
    );

    tabLink.textContent =
        configuration.menuName;

    tabItem.appendChild(
        tabLink,
    );

    const spreadsheetButton =
        document.createElement(
            "button",
        );

    spreadsheetButton.type =
        "button";

    spreadsheetButton.classList.add(
        "spreadsheets-links",
    );

    spreadsheetButton.dataset.url =
        configuration.url;

    spreadsheetButton.setAttribute(
        "aria-label",
        `Abrir ${configuration.menuName} em uma nova aba`,
    );

    spreadsheetButton.appendChild(
        createSpreadsheetLinkIcon(),
    );

    spreadsheetButton.addEventListener(
        "click",
        function (event) {
            event.stopPropagation();

            window.open(
                configuration.url,
                "_blank",
                "noopener,noreferrer",
            );
        },
    );

    tabItem.appendChild(
        spreadsheetButton,
    );

    return tabItem;
}

/* CRIA O PAINEL E O IFRAME */

function createSpreadsheetPanel(
    configuration,
    index,
    panelId,
    activeKey,
) {
    const isInitialSpreadsheet =
        configuration.key ===
            activeKey ||
        (
            !activeKey &&
            index === 0
        );

    const panel =
        document.createElement(
            "div",
        );

    panel.id = panelId;

    panel.classList.add(
        "tabs-panel",
    );

    panel.classList.toggle(
        "is-active",
        isInitialSpreadsheet,
    );

    const iframe =
        document.createElement(
            "iframe",
        );

    iframe.dataset.src =
        configuration.url;

    iframe.title =
        configuration.spreadsheetName;

    iframe.setAttribute(
        "loading",
        "lazy",
    );

    panel.appendChild(
        iframe,
    );

    return panel;
}

/* ATUALIZA O FOUNDATION APÓS CRIAR AS ABAS */

function initializeFoundationTabs(
    tabsElement,
) {
    if (
        typeof window.jQuery !==
            "function" ||
        !window.Foundation
    ) {
        return false;
    }

    const foundationTabs =
        window.jQuery(
            tabsElement,
        );

    if (
        foundationTabs.data(
            "zfPlugin",
        )
    ) {
        window.Foundation.reInit(
            foundationTabs,
        );

        return true;
    }

    return false;
}

/* MONTA TODO O PAINEL DE PLANILHAS */

function renderSpreadsheetInterface() {
    if (!dashboardSettingsElements?.tabs || !dashboardSettingsElements?.panels) {
        return false;
    }

    const {
        tabs,
        panels,
    } = dashboardSettingsElements;

    const activeKey =
        tabs.querySelector(
            ".tabs-title.is-active",
        )?.dataset.spreadsheetKey ||
        "";

    const configurations =
        getVisibleSpreadsheetConfigurations();

    const nextActiveKey =
        configurations.some(
            function (configuration) {
                return configuration.key ===
                    activeKey;
            },
        )
            ? activeKey
            : configurations[0]?.key ||
              "";

    const tabsFragment =
        document.createDocumentFragment();

    const panelsFragment =
        document.createDocumentFragment();

    configurations.forEach(
        function (
            configuration,
            index,
        ) {
            const panelId =
                `spreadsheet-${index + 1}`;

            tabsFragment.appendChild(
                createSpreadsheetTab(
                    configuration,
                    index,
                    panelId,
                    nextActiveKey,
                ),
            );

            panelsFragment.appendChild(
                createSpreadsheetPanel(
                    configuration,
                    index,
                    panelId,
                    nextActiveKey,
                ),
            );
        },
    );

    tabs.replaceChildren(
        tabsFragment,
    );

    panels.replaceChildren(
        panelsFragment,
    );

    initializeFoundationTabs(
        tabs,
    );

    updateSpreadsheetIframes?.();

    return true;
}

/* ATUALIZA SOMENTE O NOME DA ABA, SEM RECRIAR O IFRAME */

function renderSpreadsheetMenuName(
    index,
) {
    if (!dashboardSettingsElements?.tabs || !dashboardSettingsElements?.panels) return false;
    if (!dashboardSettingsElements) {
        return false;
    }

    const spreadsheet =
        dashboardSettingsState
            .spreadsheets[index];

    const tabItem =
        dashboardSettingsElements
            .tabs
            .querySelector(
                `[data-spreadsheet-key="configured-${index + 1}"]`,
            );

    if (!spreadsheet || !tabItem) {
        return false;
    }

    const menuName =
        spreadsheet.menuName ||
        `Planilha ${index + 1}`;

    const tabLink =
        tabItem.querySelector(
            "a",
        );

    const externalButton =
        tabItem.querySelector(
            "button.spreadsheets-links",
        );

    if (!tabLink) {
        return false;
    }

    tabLink.textContent =
        menuName;

    externalButton?.setAttribute(
        "aria-label",
        `Abrir ${menuName} em uma nova aba`,
    );

    const panelId =
        tabLink
            .getAttribute(
                "href",
            )
            ?.replace(
                /^#/,
                "",
            );

    const iframe =
        panelId
            ? dashboardSettingsElements
                .panels
                .querySelector(
                    `[id="${panelId}"] iframe`,
                )
            : null;

    if (iframe) {
        iframe.title =
            menuName;
    }

    return true;
}

/* CARREGA SOMENTE A PLANILHA VISÍVEL */

function initializeSpreadsheetNavigation(
    tabsElement,
    panelsElement,
) {
    const spreadsheetsPanel =
        document.getElementById(
            "spreadsheets",
        );

    const mainTabs =
        document.getElementById(
            "change-panel",
        );

    if (
        !(spreadsheetsPanel instanceof
            HTMLElement) ||
        !(mainTabs instanceof
            HTMLElement)
    ) {
        return false;
    }

    const update =
        function () {
            const panels =
                panelsElement.querySelectorAll(
                    ".tabs-panel",
                );

            const activePanel =
                panelsElement.querySelector(
                    ".tabs-panel.is-active",
                );

            panels.forEach(
                function (panel) {
                    const iframe =
                        panel.querySelector(
                            "iframe[data-src]",
                        );

                    if (!iframe) {
                        return;
                    }

                    const shouldLoad =
                        spreadsheetsPanel.classList
                            .contains(
                                "is-active",
                            ) &&
                        panel === activePanel;

                    if (!shouldLoad) {
                        iframe.removeAttribute(
                            "src",
                        );

                        return;
                    }

                    if (
                        !iframe.hasAttribute(
                            "src",
                        )
                    ) {
                        iframe.src =
                            iframe.dataset.src;
                    }
                },
            );
        };

    updateSpreadsheetIframes =
        update;

    if (
        tabsElement.dataset
            .spreadsheetNavigationInitialized !==
        "true"
    ) {
        tabsElement.dataset
            .spreadsheetNavigationInitialized =
                "true";

        tabsElement.addEventListener(
            "click",
            function () {
                window.setTimeout(
                    update,
                    0,
                );
            },
        );

        mainTabs.addEventListener(
            "click",
            function () {
                window.setTimeout(
                    update,
                    0,
                );
            },
        );
    }

    update();

    return true;
}

/* CRIA AS 20 LINHAS DAS CONFIGURAÇÕES */

function createSpreadsheetSettingsRow(
    index,
) {
    const position =
        index + 1;

    const group =
        document.createElement(
            "div",
        );

    const title =
        document.createElement(
            "h4",
        );

    title.textContent =
        `${SPREADSHEET_POSITION_NAMES[index]} Planilha`;

    const row =
        document.createElement(
            "div",
        );

    row.dataset.dashboardSpreadsheetRow =
        String(index);

    const linkInput =
        document.createElement(
            "input",
        );

    linkInput.type = "url";
    linkInput.inputMode = "none";
    linkInput.autocomplete = "off";
    linkInput.id =
        `settingsSpreadsheetLink${position}`;
    linkInput.placeholder =
        "Link da Planilha";
    linkInput.dataset.dashboardSpreadsheetField =
        "link";
    linkInput.setAttribute(
        "aria-label",
        `Link da planilha ${position}`,
    );

    const nameInput =
        document.createElement(
            "input",
        );

    nameInput.type = "text";
    nameInput.id =
        `settingsSpreadsheetName${position}`;
    nameInput.placeholder =
        "Nome no Menu";
    nameInput.maxLength = 22;
    nameInput.dataset.dashboardSpreadsheetField =
        "menuName";
    nameInput.setAttribute(
        "aria-label",
        `Nome da planilha ${position} no menu`,
    );

    const selectContainer =
        document.createElement(
            "div",
        );

    const visibilitySelect =
        document.createElement(
            "select",
        );

    visibilitySelect.id =
        `settingsSpreadsheetVisibility${position}`;
    visibilitySelect.classList.add(
        "standard-select",
    );
    visibilitySelect.style.width =
        "100%";
    visibilitySelect.dataset.dashboardSpreadsheetField =
        "visible";
    visibilitySelect.setAttribute(
        "aria-label",
        `Visibilidade da planilha ${position}`,
    );

    visibilitySelect.append(
        new Option(
            "Visível",
            "show",
        ),
        new Option(
            "Oculta",
            "hide",
        ),
    );

    selectContainer.appendChild(
        visibilitySelect,
    );

    row.append(
        linkInput,
        nameInput,
        selectContainer,
    );

    group.append(
        title,
        row,
    );

    return group;
}

function createSpreadsheetSettingsRows(
    container,
) {
    const fragment =
        document.createDocumentFragment();

    for (
        let index = 0;
        index <
            DASHBOARD_SPREADSHEET_LIMIT;
        index += 1
    ) {
        fragment.appendChild(
            createSpreadsheetSettingsRow(
                index,
            ),
        );
    }

    container.replaceChildren(
        fragment,
    );

    window.initializeSelect2Fields?.(
        container,
    );
}

/* VALIDA VISUALMENTE UM INPUT DE URL */

function renderUrlInputValidity(
    input,
    normalizeUrl =
        normalizeDashboardUrl,
    invalidMessage =
        "Informe um endereço HTTP ou HTTPS válido.",
) {
    const hasValue =
        normalizeSettingsText(
            input.value,
        ) !== "";

    const isInvalid =
        hasValue &&
        !normalizeUrl(
            input.value,
        );

    input.setAttribute(
        "aria-invalid",
        isInvalid
            ? "true"
            : "false",
    );

    input.title =
        isInvalid
            ? invalidMessage
            : "";
}

/* RENDERIZA OS VALORES NOS INPUTS */

function renderSettingsInputs() {
    if (!dashboardSettingsElements?.spreadsheetRows) {
        return;
    }

    dashboardSettingsElements
        .spreadsheetRows
        .querySelectorAll(
            "[data-dashboard-spreadsheet-row]",
        )
        .forEach(
            function (row) {
                const index =
                    Number(
                        row.dataset
                            .dashboardSpreadsheetRow,
                    );

                const spreadsheet =
                    dashboardSettingsState
                        .spreadsheets[
                            index
                        ];

                if (!spreadsheet) {
                    return;
                }

                const linkInput =
                    row.querySelector(
                        '[data-dashboard-spreadsheet-field="link"]',
                    );

                const nameInput =
                    row.querySelector(
                        '[data-dashboard-spreadsheet-field="menuName"]',
                    );

                const visibilitySelect =
                    row.querySelector(
                        '[data-dashboard-spreadsheet-field="visible"]',
                    );

                linkInput.value =
                    spreadsheet.link;

                nameInput.value =
                    spreadsheet.menuName;

                visibilitySelect.value =
                    spreadsheet.visible
                        ? "show"
                        : "hide";

                if (
                    typeof window.jQuery ===
                    "function"
                ) {
                    window.jQuery(
                        visibilitySelect,
                    ).trigger(
                        "change.select2",
                    );
                }

                renderUrlInputValidity(
                    linkInput,
                    normalizeSpreadsheetUrl,
                    `Informe um link iniciado por ${GOOGLE_SPREADSHEETS_URL_PREFIX}`,
                );
            },
        );

    dashboardSettingsElements
        .externalLinkInputs
        .forEach(
            function (input) {
                const key =
                    input.dataset
                        .dashboardExternalLink;

                input.value =
                    dashboardSettingsState
                        .externalLinks[
                            key
                        ] || "";

                renderUrlInputValidity(
                    input,
                );
            },
        );

    document.querySelectorAll("[data-dashboard-footer-visible]").forEach(input => {
        input.checked = dashboardSettingsState.footerVisibility[input.dataset.dashboardFooterVisible];
    });
    document.querySelectorAll("[data-dashboard-profile-field]").forEach(input => {
        const value = dashboardSettingsState.profile[input.dataset.dashboardProfileField];
        if (input instanceof HTMLSelectElement && !Array.from(input.options).some(option => option.value === value)) {
            input.add(new Option(value, value));
        }
        input.value = value;
        window.jQuery?.(input).trigger("change.select2");
    });
}

/* ATUALIZA OS LINKS FORA DO PAINEL */

function renderExternalLinks() {
    if (!dashboardSettingsElements) {
        return;
    }

    const damageAppUrl =
        normalizeDashboardUrl(
            dashboardSettingsState
                .externalLinks
                .damageApp,
        );

    const reverseFormUrl =
        normalizeDashboardUrl(
            dashboardSettingsState
                .externalLinks
                .reverseForm,
        );

    const packRecoveryUrl =
        normalizeDashboardUrl(
            dashboardSettingsState
                .externalLinks
                .packRecovery,
        );

    const collectionAppUrl =
        normalizeDashboardUrl(
            dashboardSettingsState
                .externalLinks
                .collectionApp,
        );

    const {
        reverseFormButton,
        packRecoveryButton,
        damageAppButton,
        collectionAppButton,
    } = dashboardSettingsElements;

    [
        [
            reverseFormButton,
            reverseFormUrl,
            "reverseForm",
        ],
        [
            packRecoveryButton,
            packRecoveryUrl,
            "packRecovery",
        ],
        [
            damageAppButton,
            damageAppUrl,
            "damageApp",
        ],
        [
            collectionAppButton,
            collectionAppUrl,
            "collectionApp",
        ],
    ].forEach(
        function (
            [
                button,
                url,
                key,
            ],
        ) {
            if (!button) return;
            const item = button.closest("footer > div > div");
            if (item) item.hidden = !dashboardSettingsState.footerVisibility[key];
            button.dataset.url = url;
            button.disabled = !url;
            button.setAttribute(
                "aria-disabled",
                url
                    ? "false"
                    : "true",
            );
        },
    );

    const visibleItems = [...document.querySelectorAll("footer > div > div")].filter(item => !item.hidden);
    document.querySelectorAll("footer > div > div").forEach(item => item.classList.remove("footer-last-visible"));
    visibleItems.at(-1)?.classList.add("footer-last-visible");

}

function renderDashboardProfile(applyToReports = true) {
    if (!globalThis.document) return;
    const profile = dashboardSettingsState.profile;
    document.querySelectorAll("[data-dashboard-profile-icon]").forEach(image => {
        image.src = DASHBOARD_PROFILE_ICONS[profile.icon];
        image.alt = profile.name ? `Perfil de ${profile.name}` : "Ícone do dashboard";
    });
    if (applyToReports && document.getElementById("reportWindowInput")) {
        updateReportContextField("window", profile.shift);
        updateReportContextField("analyst", profile.name);
    }
}

function renderDashboardTheme() {
    if (!globalThis.document?.documentElement) return;
    document.documentElement.dataset.theme = dashboardSettingsState.theme;
    document.querySelectorAll("[data-dashboard-theme]").forEach(card => {
        const selected = card.dataset.dashboardTheme === dashboardSettingsState.theme;
        card.classList.toggle("is-selected", selected);
        card.setAttribute("aria-checked", String(selected));
        card.tabIndex = selected ? 0 : -1;
    });
}

/* APLICA AS CONFIGURAÇÕES IMPORTADAS */

function renderDashboardSettings(applyProfileToReports = true) {
    renderDashboardTheme();
    renderSettingsInputs();
    renderExternalLinks();
    renderDashboardProfile(applyProfileToReports);
    renderSpreadsheetInterface();
}

function importDashboardSettings(
    value,
    { applyProfileToReports = value.profile !== undefined } = {},
) {
    validateDashboardSettings(
        value,
    );

    const normalizedSettings =
        normalizeDashboardSettings(
            value,
        );

    if (value.profile === undefined) normalizedSettings.profile = { ...dashboardSettingsState.profile };

    Object.assign(dashboardSettingsState, normalizedSettings);

    renderDashboardSettings(applyProfileToReports);

    return true;
}

function saveDashboardSettingsToSession(settings = exportDashboardSettings(), storage) {
    validateDashboardSettings(settings);
    (storage ?? window.sessionStorage).setItem(DASHBOARD_SETTINGS_SESSION_KEY, JSON.stringify(settings));
}

function readDashboardSettingsFromSession(storage) {
    try {
        const source = (storage ?? window.sessionStorage).getItem(DASHBOARD_SETTINGS_SESSION_KEY);
        if (!source) return null;
        const settings = JSON.parse(source);
        validateDashboardSettings(settings);
        return normalizeDashboardSettings(settings);
    } catch (error) {
        console.warn("Não foi possível recuperar as configurações da sessão da aba.", error);
        return null;
    }
}

/* AGENDA A ATUALIZAÇÃO DO PAINEL */

function scheduleSpreadsheetRender() {
    window.clearTimeout(
        spreadsheetRenderTimer,
    );

    spreadsheetRenderTimer =
        window.setTimeout(
            function () {
                spreadsheetRenderTimer =
                    null;

                renderSpreadsheetInterface();
            },
            180,
        );
}

/* CONECTA A NAVEGAÇÃO E OS INPUTS DAS CONFIGURAÇÕES */

function bindDashboardSettingsEvents() {
    const {
        spreadsheetRows,
        anotherLinks,
    } = dashboardSettingsElements;

    const settingsLink = document.getElementById("dashboardSettingsLink");
    if (settingsLink && settingsLink.dataset.settingsNavigationInitialized !== "true") {
        // A nova guia herda uma cópia da sessão da guia de origem, atualizada antes da abertura.
        const prepareSettingsPage = () => {
            try {
                saveDashboardSettingsToSession();
            } catch (error) {
                console.warn("Não foi possível preparar as configurações para a nova guia.", error);
            }
        };
        settingsLink.addEventListener("click", prepareSettingsPage);
        settingsLink.addEventListener("auxclick", event => {
            if (event.button === 1) prepareSettingsPage();
        });
        settingsLink.dataset.settingsNavigationInitialized = "true";
    }

    if (!spreadsheetRows || !anotherLinks) return;

    const themeCards = [...document.querySelectorAll("[data-dashboard-theme]")];
    const chooseTheme = card => {
        const theme = card.dataset.dashboardTheme;
        if (!DASHBOARD_THEMES.includes(theme)) return;
        dashboardSettingsState.theme = theme;
        renderDashboardTheme();
        card.focus();
    };
    themeCards.forEach((card, index) => {
        card.addEventListener("click", () => chooseTheme(card));
        card.addEventListener("keydown", event => {
            let next = index;
            if (["ArrowRight", "ArrowDown"].includes(event.key)) next = (index + 1) % themeCards.length;
            else if (["ArrowLeft", "ArrowUp"].includes(event.key)) next = (index + themeCards.length - 1) % themeCards.length;
            else if (event.key === "Home") next = 0;
            else if (event.key === "End") next = themeCards.length - 1;
            else if (![" ", "Enter"].includes(event.key)) return;
            event.preventDefault();
            chooseTheme(themeCards[next]);
        });
    });

    document.querySelectorAll("[data-dashboard-profile-field]").forEach(input => {
        const update = () => {
            const field = input.dataset.dashboardProfileField;
            dashboardSettingsState.profile[field] = input.value;
            if (field === "name") {
                const selectedOption = input.selectedOptions[0];
                const email = selectedOption?.dataset.email || "";
                dashboardSettingsState.profile.email = email;
                const emailInput = document.querySelector('[data-dashboard-profile-field="email"]');
                if (emailInput) emailInput.value = email;
                const shift = selectedOption?.dataset.shift || DEFAULT_DASHBOARD_PROFILE.shift;
                dashboardSettingsState.profile.shift = shift;
                const shiftInput = document.querySelector('[data-dashboard-profile-field="shift"]');
                if (shiftInput) {
                    shiftInput.value = shift;
                    window.jQuery?.(shiftInput).trigger("change.select2");
                }
            }
            renderDashboardProfile();
        };
        input.addEventListener(input.tagName === "SELECT" ? "change" : "input", update);
        if (input.tagName === "SELECT" && window.jQuery) {
            window.jQuery(input).on("change.dashboardProfile", update);
        }
    });
    anotherLinks.addEventListener("change", event => {
        const input = event.target.closest("[data-dashboard-footer-visible]");
        if (!input) return;
        dashboardSettingsState.footerVisibility[input.dataset.dashboardFooterVisible] = input.checked;
        renderExternalLinks();
    });

    const getSpreadsheetLinkInput =
        function (target) {
            return target.closest(
                '[data-dashboard-spreadsheet-field="link"]',
            );
        };

    spreadsheetRows.addEventListener(
        "beforeinput",
        function (event) {
            const input =
                getSpreadsheetLinkInput(
                    event.target,
                );

            if (!input) {
                return;
            }

            const isPaste =
                event.inputType ===
                "insertFromPaste";

            const isDeletion =
                event.inputType.startsWith(
                    "delete",
                );

            if (!isPaste && !isDeletion) {
                event.preventDefault();
            }
        },
    );

    spreadsheetRows.addEventListener(
        "keydown",
        function (event) {
            const input =
                getSpreadsheetLinkInput(
                    event.target,
                );

            if (!input) {
                return;
            }

            const normalizedKey =
                event.key.toLowerCase();

            const hasShortcutModifier =
                event.ctrlKey ||
                event.metaKey;

            const isAllowedShortcut =
                hasShortcutModifier &&
                [
                    "a",
                    "c",
                    "v",
                    "x",
                ].includes(
                    normalizedKey,
                );

            const isAllowedControlKey =
                [
                    "backspace",
                    "delete",
                    "tab",
                    "arrowleft",
                    "arrowright",
                    "home",
                    "end",
                    "escape",
                ].includes(
                    normalizedKey,
                );

            if (
                !isAllowedShortcut &&
                !isAllowedControlKey
            ) {
                event.preventDefault();
            }
        },
    );

    spreadsheetRows.addEventListener(
        "input",
        function (event) {
            const input =
                event.target.closest(
                    "[data-dashboard-spreadsheet-field]",
                );

            const row =
                input?.closest(
                    "[data-dashboard-spreadsheet-row]",
                );

            if (!input || !row) {
                return;
            }

            const index =
                Number(
                    row.dataset
                        .dashboardSpreadsheetRow,
                );

            const field =
                input.dataset
                    .dashboardSpreadsheetField;

            if (
                !Number.isInteger(index) ||
                !dashboardSettingsState
                    .spreadsheets[index] ||
                field === "visible"
            ) {
                return;
            }

            dashboardSettingsState
                .spreadsheets[index][field] =
                    field === "menuName"
                        ? normalizeSettingsText(
                            input.value,
                            22,
                        )
                        : input.value;

            if (field === "link") {
                renderUrlInputValidity(
                    input,
                    normalizeSpreadsheetUrl,
                    `Informe um link iniciado por ${GOOGLE_SPREADSHEETS_URL_PREFIX}`,
                );

                scheduleSpreadsheetRender();

                return;
            }

            renderSpreadsheetMenuName(
                index,
            );
        },
    );

    const handleSpreadsheetVisibilityChange =
        function (target) {
            const select =
                target.closest(
                    'select[data-dashboard-spreadsheet-field="visible"]',
                );

            const row =
                select?.closest(
                    "[data-dashboard-spreadsheet-row]",
                );

            if (!select || !row) {
                return;
            }

            const index =
                Number(
                    row.dataset
                        .dashboardSpreadsheetRow,
                );

            if (
                !Number.isInteger(index) ||
                !dashboardSettingsState
                    .spreadsheets[index]
            ) {
                return;
            }

            dashboardSettingsState
                .spreadsheets[index]
                .visible =
                    select.value ===
                    "show";

            renderSpreadsheetInterface();
        };

    spreadsheetRows.addEventListener(
        "change",
        function (event) {
            handleSpreadsheetVisibilityChange(
                event.target,
            );
        },
    );

    if (
        typeof window.jQuery ===
        "function"
    ) {
        const visibilitySelector =
            'select[data-dashboard-spreadsheet-field="visible"]';

        window.jQuery(
            spreadsheetRows,
        )
            .off(
                "select2:select.dashboardSettings",
                visibilitySelector,
            )
            .on(
                "select2:select.dashboardSettings",
                visibilitySelector,
                function () {
                    handleSpreadsheetVisibilityChange(
                        this,
                    );
                },
            );
    }

    anotherLinks.addEventListener(
        "input",
        function (event) {
            const input =
                event.target.closest(
                    "[data-dashboard-external-link]",
                );

            if (!input) {
                return;
            }

            const key =
                input.dataset
                    .dashboardExternalLink;

            if (
                !DASHBOARD_EXTERNAL_LINK_KEYS
                    .includes(key)
            ) {
                return;
            }

            dashboardSettingsState
                .externalLinks[key] =
                    input.value;

            renderUrlInputValidity(
                input,
            );

            renderExternalLinks();
        },
    );

}

/* LOCALIZA E VALIDA OS ELEMENTOS */

function getDashboardSettingsElements() {
    return {
        tabs:
            document.getElementById(
                "switch-spreadsheet",
            ),

        panels:
            document.getElementById(
                "spreadsheetPanels",
            ),

        spreadsheetRows:
            document.getElementById(
                "settingsSpreadsheetRows",
            ),

        anotherLinks:
            document.getElementById(
                "another-links",
            ),

        externalLinkInputs: [
            ...document.querySelectorAll(
                "[data-dashboard-external-link]",
            ),
        ],

        reverseFormButton:
            document.getElementById(
                "footerReverseFormLink",
            ),

        packRecoveryButton:
            document.getElementById(
                "footerPackRecoveryLink",
            ),

        damageAppButton:
            document.getElementById(
                "footerDamageAppLink",
            ),

        collectionAppButton:
            document.getElementById(
                "footerCollectionAppLink",
            ),
    };
}

function hasDashboardSettingsElements(
    elements,
) {
    return Boolean(elements.spreadsheetRows && elements.anotherLinks) || (
        elements.tabs instanceof
            HTMLElement &&
        elements.panels instanceof
            HTMLElement &&
        elements.reverseFormButton instanceof
            HTMLButtonElement &&
        elements.packRecoveryButton instanceof
            HTMLButtonElement &&
        elements.damageAppButton instanceof
            HTMLButtonElement &&
        elements.collectionAppButton instanceof
            HTMLButtonElement
    );
}

/* INICIALIZA AS CONFIGURAÇÕES E O PAINEL */

async function initializeDashboardSettings() {
    const elements =
        getDashboardSettingsElements();

    if (
        !hasDashboardSettingsElements(
            elements,
        )
    ) {
        console.error(
            "Os elementos das configurações do dashboard não foram encontrados.",
        );

        return false;
    }

    dashboardSettingsElements =
        elements;

    try {
        defaultSpreadsheetSettings =
            await loadDefaultSpreadsheetSettings();
    } catch (error) {
        console.warn(
            "Não foi possível carregar a configuração atualizada das planilhas. Usando a configuração incorporada.",
            error,
        );

        defaultSpreadsheetSettings =
            FALLBACK_SPREADSHEET_SETTINGS;
    }

    const initialSettings = readDashboardSettingsFromSession() || createDefaultDashboardSettings();

    Object.assign(dashboardSettingsState, initialSettings);

    if (elements.spreadsheetRows) createSpreadsheetSettingsRows(elements.spreadsheetRows);

    if (elements.tabs && elements.panels) initializeSpreadsheetNavigation(
        elements.tabs,
        elements.panels,
    );

    bindDashboardSettingsEvents();

    renderDashboardSettings();

    return true;
}

if (globalThis.document) await initializeDashboardSettings();

export {
    DASHBOARD_SETTINGS_SESSION_KEY,
    exportDashboardSettings,
    importDashboardSettings,
    initializeDashboardSettings,
    validateDashboardSettings,
    saveDashboardSettingsToSession,
    readDashboardSettingsFromSession,
};
