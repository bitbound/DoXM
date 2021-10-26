"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Electron = require("@electron/remote");
const Logger = require("../Services/Logger");
const RCClient_1 = require("../Services/RCClient");
var host = Electron.getGlobal("TargetHost");
function getContextMenu() {
    var contextMenu = new Electron.Menu();
    var titleItem = new Electron.MenuItem({
        label: "DoXM Remote Control",
        enabled: false,
    });
    var hostItem = new Electron.MenuItem({
        label: "Host: " + host,
        enabled: false
    });
    var separator = new Electron.MenuItem({
        type: "separator"
    });
    var minimizeItem = new Electron.MenuItem({
        label: "Minimize",
        click: (item, window, ev) => { Electron.getCurrentWindow().minimize(); }
    });
    var closeItem = new Electron.MenuItem({
        label: "Exit",
        click: (item, window, ev) => { Electron.app.exit(); }
    });
    contextMenu.append(titleItem);
    contextMenu.append(hostItem);
    contextMenu.append(separator);
    contextMenu.append(minimizeItem);
    contextMenu.append(closeItem);
    return contextMenu;
}
window.onload = () => {
    window.addEventListener("error", (ev) => {
        Logger.WriteLog(`Unhandled Error: Message: ${ev.message}, Line: ${ev.lineno}, Col: ${ev.colno}, File: ${ev.filename}`);
    });
    if (RCClient_1.RCClient.Mode == "Unattended" || RCClient_1.RCClient.Mode == "DesktopSwitch") {
        document.body.addEventListener("click", (e) => {
            getContextMenu().popup({});
        });
        document.body.addEventListener("contextmenu", (e) => {
            getContextMenu().popup({});
        });
        RCClient_1.RCClient.DeviceSocket.Connect();
    }
    else {
        Logger.WriteLog(`Invalid startup arguments specified.`);
        Electron.dialog.showMessageBox(Electron.getCurrentWindow(), {
            buttons: ["OK"],
            title: "Invalid Arguments",
            message: "Invalid arguments were specified.  DoXM will now close.",
        }).then(() => {
            Electron.app.exit();
        });
    }
};
//# sourceMappingURL=UnattendedPage.js.map