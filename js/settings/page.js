import {
    exportDashboardSettings,
    importDashboardSettings,
    saveDashboardSettings,
} from "../spreadsheets/load-spreadsheets.js";
import { downloadReportBlob } from "../reports/export.js";
import {
    parseDashboardSettingsFile,
    readDashboardSettingsFile,
    serializeDashboardSettingsFile,
} from "./settings-file.js";

const feedback = document.getElementById("settingsFeedback");
const importButton = document.getElementById("settingsImportButton");
const fileInput = document.getElementById("settingsFileInput");

function notify(message, type = "success") {
    feedback.textContent = message;
    feedback.dataset.notificationType = type;
    feedback.hidden = false;
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
        const content = serializeDashboardSettingsFile(exportDashboardSettings());
        saveDashboardSettings();
        const fileName = `configuracoes-dashboard-${new Date().toISOString().slice(0, 10)}.js`;
        downloadReportBlob(new Blob([content], { type: "text/javascript;charset=utf-8" }), fileName);
        if (returnToDashboard) {
            // Permite que o navegador inicie o download antes de sair da página.
            window.setTimeout(() => window.location.assign("index.html"), 150);
        } else {
            notify(`Configurações salvas em ${fileName}.`);
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
    try {
        const source = await readDashboardSettingsFile(file);
        importDashboardSettings(parseDashboardSettingsFile(source));
        notify(`Configurações importadas de ${file.name}. Salve para aplicá-las ao dashboard.`);
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
