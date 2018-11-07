"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Electron = require("electron");
const Logger = require("../Services/Logger");
const RCClient_1 = require("../Services/RCClient");
var host = Electron.remote.getGlobal("TargetHost");
function getContextMenu() {
    var contextMenu = new Electron.remote.Menu();
    var titleItem = new Electron.remote.MenuItem({
        label: "DoXM Remote Control",
        enabled: false,
    });
    var hostItem = new Electron.remote.MenuItem({
        label: "Host: " + host,
        enabled: false
    });
    var separator = new Electron.remote.MenuItem({
        type: "separator"
    });
    var minimizeItem = new Electron.remote.MenuItem({
        label: "Minimize",
        click: (item, window, ev) => { Electron.remote.getCurrentWindow().minimize(); }
    });
    var closeItem = new Electron.remote.MenuItem({
        label: "Exit",
        click: (item, window, ev) => { Electron.remote.app.exit(); }
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
        RCClient_1.RCClient.RCDeviceSockets.Connect();
    }
    else {
        Logger.WriteLog(`Invalid startup arguments specified.`);
        Electron.remote.dialog.showMessageBox(Electron.remote.getCurrentWindow(), {
            buttons: ["OK"],
            title: "Invalid Arguments",
            message: "Invalid arguments were specified.  DoXM will now close."
        }, () => { Electron.remote.app.exit(); });
    }
};
//# sourceMappingURL=UnattendedPage.js.map