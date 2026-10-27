import {
    exportDashboardSettings,
    importDashboardSettings,
    validateDashboardSettings,
} from "../spreadsheets/load-spreadsheets.js";
import { downloadReportBlob } from "../reports/export.js";
import {
    createDashboardSettingsFileName,
    parseDashboardSettingsFile,
    readDashboardSettingsFile,
    serializeDashboardSettingsFile,
} from "./settings-file.js";

const notification = document.getElementById("settingsNotification");
const notificationIcon = document.getElementById("settingsNotificationIcon");
const notificationText = document.getElementById("settingsNotificationText");
const notificationIcons = {
    info: "images/geral-icons/bell-icon.svg",
    success: "images/geral-icons/success-icon.svg",
    error: "images/geral-icons/error-icon.svg",
};
const importButton = document.getElementById("settingsImportButton");
const fileInput = document.getElementById("settingsFileInput");

function notify(message, type = "success") {
    const notificationType = Object.hasOwn(notificationIcons, type) ? type : "info";
    notificationText.textContent = message;
    notification.dataset.notificationType = notificationType;
    notificationIcon.src = notificationIcons[notificationType];
}

function validateInputs() {
    const invalid = [...document.querySelectorAll('.settings input:not([type="checkbox"])')]
        .find(input => !input.checkValidity() || input.getAttribute("aria-invalid") === "true");
    if (!invalid) return true;
    const panel = invalid.closest(".tabs-panel");
    document.querySelector(`#settings a[href="#${panel.id}"]`)?.click();
    invalid.focus();
    invalid.reportValidity();
    notify("Confira o campo destacado antes de salvar as configurações.", "error");
    return false;
}

function saveSettings(returnToDashboard = false) {
    if (!validateInputs()) return;
    try {
        const settings = exportDashboardSettings();
        validateDashboardSettings(settings);
        const content = serializeDashboardSettingsFile(settings);
        const fileName = createDashboardSettingsFileName(settings.profile.name);
        downloadReportBlob(new Blob([content], { type: "text/javascript;charset=utf-8" }), fileName);
        notify(`Configurações salvas em ${fileName}.`);
        if (returnToDashboard) {
            // Permite que o navegador inicie o download antes de sair da página.
            window.setTimeout(() => window.location.assign(document.getElementById("settingsBackButton").href), 150);
        }
    } catch (error) {
        console.error("Não foi possível salvar as configurações.", error);
        notify("Não foi possível salvar as configurações neste navegador. Tente novamente.", "error");
    }
}

document.getElementById("settingsSaveButton").addEventListener("click", () => saveSettings());
document.getElementById("settingsSaveAndBackButton").addEventListener("click", () => saveSettings(true));
importButton.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    fileInput.value = "";
    if (!file) return;
    importButton.disabled = true;
    notify(`Importando configurações de ${file.name}...`, "info");
    try {
        const source = await readDashboardSettingsFile(file);
        importDashboardSettings(parseDashboardSettingsFile(source));
        notify(`Configurações importadas de ${file.name}.`);
    } catch (error) {
        notify(error.message || "Não foi possível importar as configurações.", "error");
    } finally {
        importButton.disabled = false;
    }
});

document.querySelectorAll("footer .external-link").forEach(button => {
    button.addEventListener("click", () => {
        if (!button.disabled && button.dataset.url) {
            window.open(button.dataset.url, "_blank", "noopener,noreferrer");
        }
    });
});
