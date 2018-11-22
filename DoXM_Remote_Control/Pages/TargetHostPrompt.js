"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Electron = require("electron");
const path = require("path");
const fs = require("fs");
exports.MinimizeButton = document.getElementById("minimizeButton");
exports.CloseButton = document.getElementById("closeButton");
exports.TargetHostInput = document.getElementById("targetHostInput");
exports.OKButton = document.getElementById("okButton");
window.onload = () => {
    document.getElementById("doxmTitle").onclick = () => {
        Electron.remote.shell.openExternal("https://doxm.app");
    };
    exports.CloseButton.addEventListener("click", (ev) => {
        Electron.remote.getCurrentWindow().close();
    });
    exports.MinimizeButton.addEventListener("click", (ev) => {
        Electron.remote.getCurrentWindow().minimize();
    });
    exports.TargetHostInput.addEventListener("keypress", (e) => {
        if (e.key.toLowerCase() == "enter") {
            exports.OKButton.click();
        }
    });
    exports.OKButton.addEventListener("click", () => {
        if (exports.TargetHostInput.checkValidity()) {
            var rcConfigPath = path.join(Electron.remote.app.getPath("userData"), "rc_config.json");
            var hostSplit = exports.TargetHostInput.value.split("//");
            var host = hostSplit[hostSplit.length - 1];
            fs.writeFileSync(rcConfigPath, `{ "TargetHost": "${host}" }`);
            Electron.ipcRenderer.sendSync("SetTargetHost", host);
        }
        else {
            Electron.remote.dialog.showErrorBox("Hostname Required", "A fully-qualified hostname is required.");
        }
    });
};
//# sourceMappingURL=TargetHostPrompt.js.map