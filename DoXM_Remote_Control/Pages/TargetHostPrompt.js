"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const fs = require("fs");
const Electron = require("@electron/remote");
const electron_1 = require("electron");
const MinimizeButton = document.getElementById("minimizeButton");
const CloseButton = document.getElementById("closeButton");
const TargetHostInput = document.getElementById("targetHostInput");
const OKButton = document.getElementById("okButton");
window.onload = () => {
    document.getElementById("doxmTitle").onclick = () => {
        Electron.shell.openExternal("https://lucency.co");
    };
    CloseButton.addEventListener("click", () => {
        Electron.getCurrentWindow().close();
    });
    MinimizeButton.addEventListener("click", () => {
        Electron.getCurrentWindow().minimize();
    });
    TargetHostInput.addEventListener("keypress", (e) => {
        if (e.key.toLowerCase() == "enter") {
            OKButton.click();
        }
    });
    OKButton.addEventListener("click", () => {
        if (TargetHostInput.checkValidity()) {
            var rcConfigPath = path.join(Electron.app.getPath("userData"), "rc_config.json");
            var hostSplit = TargetHostInput.value.split("//");
            var host = hostSplit[hostSplit.length - 1];
            fs.writeFileSync(rcConfigPath, `{ "TargetHost": "${host}" }`);
            electron_1.ipcRenderer.sendSync("SetTargetHost", host);
        }
        else {
            Electron.dialog.showErrorBox("Hostname Required", "A fully-qualified hostname is required.");
        }
    });
};
//# sourceMappingURL=TargetHostPrompt.js.map