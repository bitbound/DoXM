import * as path from "path";
import * as fs from "fs";
import * as Electron from "@electron/remote";
import { ipcRenderer } from "electron";

const MinimizeButton = document.getElementById("minimizeButton") as HTMLButtonElement;
const CloseButton = document.getElementById("closeButton") as HTMLButtonElement;
const TargetHostInput = document.getElementById("targetHostInput") as HTMLButtonElement;
const OKButton = document.getElementById("okButton") as HTMLButtonElement;

window.onload = () => {
    document.getElementById("doxmTitle").onclick = () => {
        Electron.shell.openExternal("https://lucency.co");
    }
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
    })

    OKButton.addEventListener("click", () => {
        if (TargetHostInput.checkValidity()) {
            var rcConfigPath = path.join(Electron.app.getPath("userData"), "rc_config.json");
            var hostSplit = TargetHostInput.value.split("//");
            var host = hostSplit[hostSplit.length - 1];
            fs.writeFileSync(rcConfigPath, `{ "TargetHost": "${host}" }`);
            ipcRenderer.sendSync("SetTargetHost", host);
        }
        else {
            Electron.dialog.showErrorBox("Hostname Required", "A fully-qualified hostname is required.");
        }
    });
}