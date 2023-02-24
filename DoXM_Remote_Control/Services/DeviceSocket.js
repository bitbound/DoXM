"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceSocket = void 0;
const Electron = require("@electron/remote");
const Logger = require("../Services/Logger");
const SignalR = require("@microsoft/signalr");
const Viewer_1 = require("../Models/Viewer");
const NormalPage_1 = require("../Pages/NormalPage");
const Utilities_1 = require("./Utilities");
const RCClient_1 = require("./RCClient");
const fs = require("fs");
const path = require("path");
const DesktopWatcher = require("../Services/DesktopWatcher");
const os_1 = require("os");
const RtcHelper_1 = require("./RtcHelper");
const electron_1 = require("electron");
class DeviceSocket {
    async Connect() {
        if (RCClient_1.RCClient.Mode == "Unattended" || RCClient_1.RCClient.Mode == "DesktopSwitch") {
            window.setTimeout(() => {
                if (RCClient_1.RCClient.ViewerList.length == 0) {
                    Logger.WriteLog("No viewers connected.  Closing remote control.");
                    Electron.app.exit();
                }
            }, 10000);
        }
        await (0, RtcHelper_1.WarmUpRTC)();
        this.HubConnection = new SignalR.HubConnectionBuilder()
            .withUrl(RCClient_1.RCClient.ConnectionURL)
            .configureLogging(SignalR.LogLevel.Information)
            .build();
        await this.ApplyMessageHandlers();
        this.HubConnection.start().catch(err => {
            Logger.WriteLog(`Error while trying to connect to host ${RCClient_1.RCClient.ConnectionURL}: ${err.toString()}`);
            console.error(err.toString());
            Electron.dialog.showErrorBox("Connection Failure", "Unable to connect to server.");
            let rcConfigPath = path.join(Electron.app.getPath("userData"), "rc_config.json");
            if (fs.existsSync(rcConfigPath)) {
                fs.unlinkSync(rcConfigPath);
            }
            Electron.app.exit();
        }).then(() => {
            if ((RCClient_1.RCClient.Mode == "Unattended" || RCClient_1.RCClient.Mode == "DesktopSwitch") && (0, os_1.platform)() == "win32") {
                DesktopWatcher.Watch();
            }
            this.HubConnection.invoke("GetIceConfiguration");
        });
        this.HubConnection.onclose(() => {
            if (RCClient_1.RCClient.Mode == "Normal") {
                Electron.dialog.showErrorBox("Connection Failure", "Your connection was lost.");
                Electron.app.exit();
            }
            else if (RCClient_1.RCClient.Mode == "Unattended" || RCClient_1.RCClient.Mode == "DesktopSwitch") {
                Electron.app.exit();
            }
        });
    }
    ;
    async ApplyMessageHandlers() {
        this.HubConnection.on("GetOfferRequest", async (viewerRequesterID, requesterName) => {
            if (RCClient_1.RCClient.Mode == "Normal") {
                let selection = await Electron.dialog.showMessageBox(Electron.getCurrentWindow(), {
                    message: `Received connection request from ${requesterName}.  Accept?`,
                    title: "Connection Request",
                    buttons: ["Yes", "No"],
                    type: "question"
                });
                if (selection.response == 1) {
                    Logger.WriteLog(`Remote control request denied.  Requester Name: ${requesterName}.  Requester ID: ${viewerRequesterID}.`);
                    this.HubConnection.invoke("SendConnectionFailedToBrowser", viewerRequesterID);
                    return;
                }
                Logger.WriteLog(`Remote control request accepted.  Requester Name: ${requesterName}.  Requester ID: ${viewerRequesterID}.`);
                let viewer = new Viewer_1.Viewer(viewerRequesterID, requesterName);
                viewer.InitRTC();
            }
            else if (RCClient_1.RCClient.Mode == "Unattended" || RCClient_1.RCClient.Mode == "DesktopSwitch") {
                Logger.WriteLog(`Unattended remote control session started.  Requester ID: ${viewerRequesterID}.  Mode: ${RCClient_1.RCClient.Mode}.`);
                let viewer = new Viewer_1.Viewer(viewerRequesterID, null);
                viewer.InitRTC();
            }
        });
        this.HubConnection.on("IceConfiguration", (iceConfiguration) => {
            electron_1.ipcRenderer.sendSync("SetIceConfiguration", iceConfiguration);
            if (RCClient_1.RCClient.Mode == "Unattended") {
                this.HubConnection.invoke("NotifyConsoleRequesterUnattendedReady", RCClient_1.RCClient.ConsoleRequesterID);
            }
            else if (RCClient_1.RCClient.Mode == "DesktopSwitch") {
                let viewersList = RCClient_1.RCClient.PreSwitchViewers.split(",");
                viewersList.forEach(x => {
                    this.HubConnection.invoke("NotifyRequesterDesktopSwitchCompleted", x);
                });
            }
            else if (RCClient_1.RCClient.Mode == "Normal") {
                this.HubConnection.invoke("GetSessionID");
            }
        });
        this.HubConnection.on("SessionID", (sessionID) => {
            let formattedSessionID = "";
            for (let i = 0; i < sessionID.length; i += 3) {
                formattedSessionID += sessionID.substr(i, 3) + " ";
            }
            NormalPage_1.MySessionIDInput.value = formattedSessionID.trim();
        });
        this.HubConnection.on("SelectScreen", async (screenIndex, requesterID) => {
            let viewer = RCClient_1.RCClient.ViewerList.find(x => x.ViewerConnectionID == requesterID);
            await viewer.SetDesktopStream(screenIndex);
        });
        this.HubConnection.on("RTCSession", (description, requesterID) => {
            let viewer = RCClient_1.RCClient.ViewerList.find(x => x.ViewerConnectionID == requesterID);
            if (viewer) {
                viewer.ReceiveRTCSession(description);
            }
        });
        this.HubConnection.on("IceCandidate", (candidate, requesterID) => {
            let viewer = RCClient_1.RCClient.ViewerList.find(x => x.ViewerConnectionID == requesterID);
            if (viewer) {
                viewer.ReceiveCandidate(candidate);
            }
        });
        this.HubConnection.on("MouseMove", (percentX, percentY, requesterID) => {
            if (RCClient_1.RCClient.Mode == "Normal" && NormalPage_1.ViewOnlyToggle.checked) {
                return;
            }
            let viewer = RCClient_1.RCClient.ViewerList.find(x => x.ViewerConnectionID == requesterID);
            if (viewer) {
                let absolutePoint = (0, Utilities_1.GetAbsolutePointFromPercents)(percentX, percentY, viewer);
                electron_1.ipcRenderer.send("MoveMouse", absolutePoint.x, absolutePoint.y);
            }
        });
        this.HubConnection.on("MouseDown", (button, percentX, percentY, requesterID) => {
            if (RCClient_1.RCClient.Mode == "Normal" && NormalPage_1.ViewOnlyToggle.checked) {
                return;
            }
            let viewer = RCClient_1.RCClient.ViewerList.find(x => x.ViewerConnectionID == requesterID);
            if (viewer) {
                let absolutePoint = (0, Utilities_1.GetAbsolutePointFromPercents)(percentX, percentY, viewer);
                electron_1.ipcRenderer.send("MoveMouse", absolutePoint.x, absolutePoint.y);
                electron_1.ipcRenderer.send("MouseToggle", "down", button);
            }
        });
        this.HubConnection.on("MouseUp", (button, percentX, percentY, requesterID) => {
            if (RCClient_1.RCClient.Mode == "Normal" && NormalPage_1.ViewOnlyToggle.checked) {
                return;
            }
            let viewer = RCClient_1.RCClient.ViewerList.find(x => x.ViewerConnectionID == requesterID);
            if (viewer) {
                let absolutePoint = (0, Utilities_1.GetAbsolutePointFromPercents)(percentX, percentY, viewer);
                electron_1.ipcRenderer.send("MoveMouse", absolutePoint.x, absolutePoint.y);
                electron_1.ipcRenderer.send("MouseToggle", "up", button);
            }
        });
        this.HubConnection.on("TouchDown", (requesterID) => {
            if (RCClient_1.RCClient.Mode == "Normal" && NormalPage_1.ViewOnlyToggle.checked) {
                return;
            }
            let viewer = RCClient_1.RCClient.ViewerList.find(x => x.ViewerConnectionID == requesterID);
            if (viewer) {
                electron_1.ipcRenderer.send("MouseToggle", "down", "left");
            }
        });
        this.HubConnection.on("LongPress", (requesterID) => {
            if (RCClient_1.RCClient.Mode == "Normal" && NormalPage_1.ViewOnlyToggle.checked) {
                return;
            }
            let viewer = RCClient_1.RCClient.ViewerList.find(x => x.ViewerConnectionID == requesterID);
            if (viewer) {
                electron_1.ipcRenderer.send("MouseToggle", "down", "right");
            }
        });
        this.HubConnection.on("TouchMove", (moveX, moveY, requesterID) => {
            if (RCClient_1.RCClient.Mode == "Normal" && NormalPage_1.ViewOnlyToggle.checked) {
                return;
            }
            let viewer = RCClient_1.RCClient.ViewerList.find(x => x.ViewerConnectionID == requesterID);
            if (viewer) {
                electron_1.ipcRenderer.send("MoveMouseRelative", moveX, moveY);
            }
        });
        this.HubConnection.on("TouchUp", (requesterID) => {
            if (RCClient_1.RCClient.Mode == "Normal" && NormalPage_1.ViewOnlyToggle.checked) {
                return;
            }
            let viewer = RCClient_1.RCClient.ViewerList.find(x => x.ViewerConnectionID == requesterID);
            if (viewer) {
                electron_1.ipcRenderer.send("MouseToggle", "up", "left");
            }
        });
        this.HubConnection.on("Tap", (requesterID) => {
            if (RCClient_1.RCClient.Mode == "Normal" && NormalPage_1.ViewOnlyToggle.checked) {
                return;
            }
            let viewer = RCClient_1.RCClient.ViewerList.find(x => x.ViewerConnectionID == requesterID);
            if (viewer) {
                electron_1.ipcRenderer.send("MouseClick", "left");
            }
        });
        this.HubConnection.on("MouseWheel", (deltaX, deltaY, requesterID) => {
            if (RCClient_1.RCClient.Mode == "Normal" && NormalPage_1.ViewOnlyToggle.checked) {
                return;
            }
            let viewer = RCClient_1.RCClient.ViewerList.find(x => x.ViewerConnectionID == requesterID);
            if (viewer) {
                let modifiedX = (deltaX > 0 ? 120 : -120) * -1;
                let modifiedY = (deltaY > 0 ? 120 : -120) * -1;
                electron_1.ipcRenderer.send("ScrollMouse", modifiedX, modifiedY);
            }
        });
        this.HubConnection.on("KeyDown", (key, requesterID) => {
            if (RCClient_1.RCClient.Mode == "Normal" && NormalPage_1.ViewOnlyToggle.checked) {
                return;
            }
            let viewer = RCClient_1.RCClient.ViewerList.find(x => x.ViewerConnectionID == requesterID);
            if (viewer) {
                key = key.replace("arrow", "");
                electron_1.ipcRenderer.send("KeyToggle", key, "down");
            }
        });
        this.HubConnection.on("KeyUp", (key, requesterID) => {
            if (RCClient_1.RCClient.Mode == "Normal" && NormalPage_1.ViewOnlyToggle.checked) {
                return;
            }
            let viewer = RCClient_1.RCClient.ViewerList.find(x => x.ViewerConnectionID == requesterID);
            if (viewer) {
                key = key.replace("arrow", "");
                electron_1.ipcRenderer.send("KeyToggle", key, "up");
            }
        });
        this.HubConnection.on("KeyPress", (key, requesterID) => {
            if (RCClient_1.RCClient.Mode == "Normal" && NormalPage_1.ViewOnlyToggle.checked) {
                return;
            }
            let viewer = RCClient_1.RCClient.ViewerList.find(x => x.ViewerConnectionID == requesterID);
            if (viewer) {
                key = key.replace("Arrow", "");
                electron_1.ipcRenderer.send("KeyTap", key);
            }
        });
        this.HubConnection.on("SharedFileIDs", (fileIDs) => {
            let prompted = false;
            fileIDs.forEach(x => {
                let url = `https://${RCClient_1.RCClient.Host}/API/FileSharing/${x}`;
                let xhr = new XMLHttpRequest();
                xhr.responseType = "arraybuffer";
                xhr.open("get", url);
                xhr.onload = async () => {
                    let cd = xhr.getResponseHeader("Content-Disposition");
                    let filename = cd.split(";").find(x => x.trim().startsWith("filename")).split("=")[1];
                    let sharedFilePath = path.join(Electron.app.getPath("userData"), "SharedFiles");
                    if (!fs.existsSync(sharedFilePath)) {
                        fs.mkdirSync(sharedFilePath, { recursive: true });
                    }
                    fs.writeFileSync(path.join(sharedFilePath, filename), new Buffer(xhr.response));
                    if (!prompted) {
                        prompted = true;
                        let result = await Electron.dialog.showMessageBox(Electron.getCurrentWindow(), {
                            message: `File downloaded to ${path.join(sharedFilePath, filename)}.  Copy path to clipboard?`,
                            title: "Download Complete",
                            type: "question",
                            buttons: ["Yes", "No"]
                        });
                        if (result.response == 0) {
                            Electron.clipboard.writeText(sharedFilePath);
                        }
                    }
                };
                xhr.onerror = (ev) => {
                    Logger.WriteLog("Error downloading shared file.");
                    Electron.dialog.showErrorBox("Download Error", "There was an error downloading the shared file.");
                };
                xhr.send();
            });
        });
    }
}
exports.DeviceSocket = DeviceSocket;
//# sourceMappingURL=DeviceSocket.js.map