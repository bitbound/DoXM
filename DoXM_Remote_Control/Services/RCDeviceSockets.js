"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Electron = require("electron");
const signalR = require("@aspnet/signalr");
const Logger = require("../Services/Logger");
const electron_1 = require("electron");
const Viewer_1 = require("../Models/Viewer");
const NormalPage_1 = require("../Pages/NormalPage");
const Robot = require("robotjs");
const Utilities_1 = require("./Utilities");
const RCClient_1 = require("./RCClient");
const fs = require("fs");
const path = require("path");
const DesktopWatcher = require("../Services/DesktopWatcher");
const os_1 = require("os");
class RCDeviceSockets {
    async Connect() {
        if (RCClient_1.RCClient.Mode == "Unattended" || RCClient_1.RCClient.Mode == "DesktopSwitch") {
            window.setTimeout(() => {
                if (RCClient_1.RCClient.ViewerList.length == 0) {
                    Logger.WriteLog("No viewers connected.  Closing remote control.");
                    Electron.remote.app.exit();
                }
            }, 10000);
        }
        await RCClient_1.RCClient.WarmUpRTC();
        this.HubConnection = new signalR.HubConnectionBuilder()
            .withUrl(RCClient_1.RCClient.ConnectionURL, {
            proxy: `${RCClient_1.RCClient.Proxy}`
        })
            .configureLogging(signalR.LogLevel.Information)
            .build();
        this.ApplyMessageHandlers();
        this.HubConnection.start().catch(err => {
            Logger.WriteLog("Connection error: " + err.toString());
            console.error(err.toString());
            electron_1.remote.dialog.showErrorBox("Connection Failure", "Unable to connect to server.");
            electron_1.remote.app.exit();
        }).then(() => {
            if ((RCClient_1.RCClient.Mode == "Unattended" || RCClient_1.RCClient.Mode == "DesktopSwitch") && os_1.platform() == "win32") {
                DesktopWatcher.Watch();
            }
            this.HubConnection.invoke("GetIceConfiguration");
        });
        this.HubConnection.closedCallbacks.push((ev) => {
            if (RCClient_1.RCClient.Mode == "Normal") {
                electron_1.remote.dialog.showErrorBox("Connection Failure", "Your connection was lost.");
                electron_1.remote.app.exit();
            }
            else if (RCClient_1.RCClient.Mode == "Unattended" || RCClient_1.RCClient.Mode == "DesktopSwitch") {
                electron_1.remote.app.exit();
            }
        });
    }
    ;
    ApplyMessageHandlers() {
        this.HubConnection.on("GetOfferRequest", (viewerRequesterID, requesterName) => {
            if (RCClient_1.RCClient.Mode == "Normal") {
                var selection = Electron.remote.dialog.showMessageBox(Electron.remote.getCurrentWindow(), {
                    message: `Received connection request from ${requesterName}.  Accept?`,
                    title: "Connection Request",
                    buttons: ["Yes", "No"],
                    type: "question"
                });
                if (selection == 1) {
                    this.HubConnection.invoke("SendConnectionFailedToBrowser", viewerRequesterID);
                    return;
                }
                var viewer = new Viewer_1.Viewer(viewerRequesterID, requesterName);
                viewer.InitRTC();
            }
            else if (RCClient_1.RCClient.Mode == "Unattended" || RCClient_1.RCClient.Mode == "DesktopSwitch") {
                var viewer = new Viewer_1.Viewer(viewerRequesterID, null);
                viewer.InitRTC();
            }
        });
        this.HubConnection.on("IceConfiguration", (iceConfiguration) => {
            Electron.ipcRenderer.sendSync("SetIceConfiguration", iceConfiguration);
            if (RCClient_1.RCClient.Mode == "Unattended") {
                this.HubConnection.invoke("NotifyConsoleRequesterUnattendedReady", RCClient_1.RCClient.ConsoleRequesterID);
            }
            else if (RCClient_1.RCClient.Mode == "DesktopSwitch") {
                var viewersList = RCClient_1.RCClient.PreSwitchViewers.split(",");
                viewersList.forEach(x => {
                    this.HubConnection.invoke("NotifyRequesterDesktopSwitchCompleted", x);
                });
            }
            else if (RCClient_1.RCClient.Mode == "Normal") {
                this.HubConnection.invoke("GetSessionID");
            }
        });
        this.HubConnection.on("SessionID", (sessionID) => {
            var formattedSessionID = "";
            for (var i = 0; i < sessionID.length; i += 3) {
                formattedSessionID += sessionID.substr(i, 3) + " ";
            }
            NormalPage_1.MySessionIDInput.value = formattedSessionID.trim();
        });
        this.HubConnection.on("SelectScreen", async (screenIndex, requesterID) => {
            var viewer = RCClient_1.RCClient.ViewerList.find(x => x.ViewerConnectionID == requesterID);
            await viewer.SetDesktopStream(screenIndex);
        });
        this.HubConnection.on("RTCSession", (description, requesterID) => {
            var viewer = RCClient_1.RCClient.ViewerList.find(x => x.ViewerConnectionID == requesterID);
            if (viewer) {
                viewer.ReceiveRTCSession(description);
            }
        });
        this.HubConnection.on("IceCandidate", (candidate, requesterID) => {
            var viewer = RCClient_1.RCClient.ViewerList.find(x => x.ViewerConnectionID == requesterID);
            if (viewer) {
                viewer.ReceiveCandidate(candidate);
            }
        });
        this.HubConnection.on("MouseMove", (percentX, percentY, requesterID) => {
            if (RCClient_1.RCClient.Mode == "Normal" && NormalPage_1.ViewOnlyToggle.checked) {
                return;
            }
            var viewer = RCClient_1.RCClient.ViewerList.find(x => x.ViewerConnectionID == requesterID);
            if (viewer) {
                var absolutePoint = Utilities_1.GetAbsolutePointFromPercents(percentX, percentY, viewer);
                Robot.moveMouse(absolutePoint.x, absolutePoint.y);
            }
        });
        this.HubConnection.on("MouseDown", (button, percentX, percentY, requesterID) => {
            if (RCClient_1.RCClient.Mode == "Normal" && NormalPage_1.ViewOnlyToggle.checked) {
                return;
            }
            var viewer = RCClient_1.RCClient.ViewerList.find(x => x.ViewerConnectionID == requesterID);
            if (viewer) {
                var absolutePoint = Utilities_1.GetAbsolutePointFromPercents(percentX, percentY, viewer);
                Robot.moveMouse(absolutePoint.x, absolutePoint.y);
                Robot.mouseToggle("down", button);
            }
        });
        this.HubConnection.on("MouseUp", (button, percentX, percentY, requesterID) => {
            if (RCClient_1.RCClient.Mode == "Normal" && NormalPage_1.ViewOnlyToggle.checked) {
                return;
            }
            var viewer = RCClient_1.RCClient.ViewerList.find(x => x.ViewerConnectionID == requesterID);
            if (viewer) {
                var absolutePoint = Utilities_1.GetAbsolutePointFromPercents(percentX, percentY, viewer);
                Robot.moveMouse(absolutePoint.x, absolutePoint.y);
                Robot.mouseToggle("up", button);
            }
        });
        this.HubConnection.on("TouchDown", (requesterID) => {
            if (RCClient_1.RCClient.Mode == "Normal" && NormalPage_1.ViewOnlyToggle.checked) {
                return;
            }
            var viewer = RCClient_1.RCClient.ViewerList.find(x => x.ViewerConnectionID == requesterID);
            if (viewer) {
                Robot.mouseToggle("down", "left");
            }
        });
        this.HubConnection.on("LongPress", (requesterID) => {
            if (RCClient_1.RCClient.Mode == "Normal" && NormalPage_1.ViewOnlyToggle.checked) {
                return;
            }
            var viewer = RCClient_1.RCClient.ViewerList.find(x => x.ViewerConnectionID == requesterID);
            if (viewer) {
                Robot.mouseClick("right");
            }
        });
        this.HubConnection.on("TouchMove", (moveX, moveY, requesterID) => {
            if (RCClient_1.RCClient.Mode == "Normal" && NormalPage_1.ViewOnlyToggle.checked) {
                return;
            }
            var viewer = RCClient_1.RCClient.ViewerList.find(x => x.ViewerConnectionID == requesterID);
            if (viewer) {
                var mousePos = Robot.getMousePos();
                Robot.moveMouse(mousePos.x + moveX, mousePos.y + moveY);
            }
        });
        this.HubConnection.on("TouchUp", (requesterID) => {
            if (RCClient_1.RCClient.Mode == "Normal" && NormalPage_1.ViewOnlyToggle.checked) {
                return;
            }
            var viewer = RCClient_1.RCClient.ViewerList.find(x => x.ViewerConnectionID == requesterID);
            if (viewer) {
                Robot.mouseToggle("up", "left");
            }
        });
        this.HubConnection.on("Tap", (requesterID) => {
            if (RCClient_1.RCClient.Mode == "Normal" && NormalPage_1.ViewOnlyToggle.checked) {
                return;
            }
            var viewer = RCClient_1.RCClient.ViewerList.find(x => x.ViewerConnectionID == requesterID);
            if (viewer) {
                Robot.mouseClick("left");
            }
        });
        this.HubConnection.on("MouseWheel", (deltaX, deltaY, requesterID) => {
            if (RCClient_1.RCClient.Mode == "Normal" && NormalPage_1.ViewOnlyToggle.checked) {
                return;
            }
            var viewer = RCClient_1.RCClient.ViewerList.find(x => x.ViewerConnectionID == requesterID);
            if (viewer) {
                var modifiedX = (deltaX > 0 ? 120 : -120) * -1;
                var modifiedY = (deltaY > 0 ? 120 : -120) * -1;
                Robot.scrollMouse(modifiedX, modifiedY);
            }
        });
        this.HubConnection.on("KeyDown", (key, requesterID) => {
            if (RCClient_1.RCClient.Mode == "Normal" && NormalPage_1.ViewOnlyToggle.checked) {
                return;
            }
            var viewer = RCClient_1.RCClient.ViewerList.find(x => x.ViewerConnectionID == requesterID);
            if (viewer) {
                key = key.replace("arrow", "");
                Robot.keyToggle(key, "down");
            }
        });
        this.HubConnection.on("KeyUp", (key, requesterID) => {
            if (RCClient_1.RCClient.Mode == "Normal" && NormalPage_1.ViewOnlyToggle.checked) {
                return;
            }
            var viewer = RCClient_1.RCClient.ViewerList.find(x => x.ViewerConnectionID == requesterID);
            if (viewer) {
                key = key.replace("arrow", "");
                Robot.keyToggle(key, "up");
            }
        });
        this.HubConnection.on("KeyPress", (key, requesterID) => {
            if (RCClient_1.RCClient.Mode == "Normal" && NormalPage_1.ViewOnlyToggle.checked) {
                return;
            }
            var viewer = RCClient_1.RCClient.ViewerList.find(x => x.ViewerConnectionID == requesterID);
            if (viewer) {
                key = key.replace("Arrow", "");
                Robot.keyTap(key);
            }
        });
        this.HubConnection.on("SharedFileIDs", (fileIDs) => {
            var prompted = false;
            fileIDs.forEach(x => {
                var url = `https://${RCClient_1.RCClient.Host}/API/FileSharing/${x}`;
                var xhr = new XMLHttpRequest();
                xhr.responseType = "arraybuffer";
                xhr.open("get", url);
                xhr.onload = (ev) => {
                    var cd = xhr.getResponseHeader("Content-Disposition");
                    var filename = cd.split(";").find(x => x.trim().startsWith("filename")).split("=")[1];
                    var sharedFilePath = path.join(process.env.ProgramData, "DoXM", "SharedFiles");
                    if (!fs.existsSync(sharedFilePath)) {
                        fs.mkdirSync(sharedFilePath, null);
                    }
                    fs.writeFileSync(path.join(sharedFilePath, filename), new Buffer(xhr.response));
                    if (!prompted) {
                        prompted = true;
                        electron_1.remote.dialog.showMessageBox({
                            message: `File downloaded to ${path.join(sharedFilePath, filename)}.  Open the folder now?`,
                            title: "Download Complete",
                            type: "question",
                            buttons: ["Yes", "No"]
                        }, (response) => {
                            if (response == 0) {
                                electron_1.remote.shell.openExternal(sharedFilePath);
                            }
                        });
                    }
                };
                xhr.onerror = (ev) => {
                    Logger.WriteLog("Error downloading shared file.");
                    electron_1.remote.dialog.showErrorBox("Download Error", "There was an error downloading the shared file.");
                };
                xhr.send();
            });
        });
    }
}
exports.RCDeviceSockets = RCDeviceSockets;
//# sourceMappingURL=RCDeviceSockets.js.map