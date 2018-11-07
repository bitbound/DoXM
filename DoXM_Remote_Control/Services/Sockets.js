"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Electron = require("electron");
const Store_1 = require("./Store");
const signalR = require("@aspnet/signalr");
const Logger = require("../Services/Logger");
const RTC = require("./RTC");
const electron_1 = require("electron");
var doxm = Electron.remote.getGlobal("DoXM");
exports.ConnectionURL = "https://" + doxm.Host + "/RCHub";
function Connect() {
    exports.Connection = new signalR.HubConnectionBuilder()
        .withUrl(exports.ConnectionURL)
        .configureLogging(signalR.LogLevel.Information)
        .build();
    applyMessageHandlers(exports.Connection);
    exports.Connection.start().catch(err => {
        Logger.WriteLog("Connection error: " + err.toString());
        console.error(err.toString());
    }).then(() => {
        if (doxm.RequesterID) {
            exports.Connection.invoke("NotifyRequester", doxm.RequesterID);
        }
        else {
            exports.Connection.invoke("SendSessionID");
        }
    });
    this.Connection.closedCallbacks.push((ev) => {
        if (!Store_1.Store.IsDisconnectExpected) {
            Electron.remote.dialog.showErrorBox("Connection Failure", "Your connection was lost.");
            electron_1.remote.app.exit();
        }
    });
}
exports.Connect = Connect;
;
function SendRTCSession(description) {
    exports.Connection.invoke("SendRTCSessionToBrowser", description, doxm.RequesterID);
}
exports.SendRTCSession = SendRTCSession;
function SendIceCandidate(candidate) {
    exports.Connection.invoke("SendIceCandidateToBrowser", candidate, doxm.RequesterID);
}
exports.SendIceCandidate = SendIceCandidate;
function applyMessageHandlers(hubConnection) {
    hubConnection.on("ReceiveOffer", (description) => {
        RTC.ReceiveRTCSession(description);
    });
    hubConnection.on("ReceiveIceCandidate", (candidate) => {
        RTC.ReceiveCandidate(candidate);
    });
}
//# sourceMappingURL=Sockets.js.map