"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RCClient = void 0;
const DeviceSocket_1 = require("./DeviceSocket");
const Electron = require("@electron/remote");
exports.RCClient = new class {
    constructor() {
        this.ViewerList = new Array();
        this.DeviceSocket = new DeviceSocket_1.DeviceSocket();
        this.Host = Electron.getGlobal("TargetHost");
        this.Mode = Electron.getGlobal("Mode");
        this.ConsoleRequesterID = Electron.getGlobal("RequesterID");
        this.PreSwitchViewers = Electron.getGlobal("ViewerIDs");
        this.ServiceID = Electron.getGlobal("ServiceID");
        this.Desktop = Electron.getGlobal("Desktop");
        this.ConnectionURL = "https://" + this.Host + "/RCDeviceHub";
        this.Proxy = Electron.getGlobal("ProxyServer");
    }
};
//# sourceMappingURL=RCClient.js.map