import * as Electron from "electron";
import * as path from "path";
import * as fs from "fs";
export var MinimizeButton = document.getElementById("minimizeButton") as HTMLButtonElement;
export var CloseButton = document.getElementById("closeButton") as HTMLButtonElement;
export var TargetHostInput = document.getElementById("targetHostInput") as HTMLButtonElement;
export var OKButton = document.getElementById("okButton") as HTMLButtonElement;

window.onload = () => {
    document.getElementById("doxmTitle").onclick = () => {
        Electron.remote.shell.openExternal("https://doxm.app");
    }
    CloseButton.addEventListener("click", (ev) => {
        Electron.remote.getCurrentWindow().close();
    });
    MinimizeButton.addEventListener("click", (ev) => {
        Electron.remote.getCurrentWindow().minimize();
    });

    TargetHostInput.addEventListener("keypress", (e) => {
        if (e.key.toLowerCase() == "enter") {
            OKButton.click();
        }
    })

    OKButton.addEventListener("click", () => {
        if (TargetHostInput.checkValidity()) {
            var rcConfigPath = path.join(Electron.remote.app.getPath("userData"), "rc_config.json");
            var hostSplit = TargetHostInput.value.split("//");
            var host = hostSplit[hostSplit.length - 1];
            fs.writeFileSync(rcConfigPath, `{ "TargetHost": "${host}" }`);
            Electron.ipcRenderer.sendSync("SetTargetHost", host);
        }
        else {
            Electron.remote.dialog.showErrorBox("Hostname Required", "A fully-qualified hostname is required.");
        }
    });
}