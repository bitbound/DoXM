import * as Electron from "electron";
import * as signalR from "@aspnet/signalr";
import * as Logger from "../Services/Logger";
import { remote } from "electron";
import { Viewer } from "../Models/Viewer";
import { MySessionIDInput, ViewOnlyToggle } from "../Pages/NormalPage";
import * as Robot from "robotjs";
import { GetAbsolutePointFromPercents } from "./Utilities";
import { RCClient } from "./RCClient";
import * as fs from "fs";
import * as path from "path";
import * as DesktopWatcher from "../Services/DesktopWatcher";
import { platform } from "os";

export class RCDeviceSockets {
    HubConnection: any;
    async Connect() {
        if (RCClient.Mode == "Unattended" || RCClient.Mode == "DesktopSwitch") {
            window.setTimeout(() => {
                if (RCClient.ViewerList.length == 0) {
                    Logger.WriteLog("No viewers connected.  Closing remote control.");
                    Electron.remote.app.exit();
                }
            }, 10000);
        }
        await RCClient.WarmUpRTC();
        this.HubConnection = new signalR.HubConnectionBuilder()
            .withUrl(RCClient.ConnectionURL, {
                proxy: `${RCClient.Proxy}`
            } as any)
            .configureLogging(signalR.LogLevel.Information)
            .build();

        this.ApplyMessageHandlers();
        this.HubConnection.start().catch(err => {
            Logger.WriteLog("Connection error: " + err.toString());
            console.error(err.toString());
            remote.dialog.showErrorBox("Connection Failure", "Unable to connect to server.");
            var rcConfigPath = path.join(Electron.remote.app.getPath("userData"), "rc_config.json");
            if (fs.existsSync(rcConfigPath)) {
                fs.unlinkSync(rcConfigPath);
            }
            remote.app.exit();
        }).then(() => {
            if ((RCClient.Mode == "Unattended" || RCClient.Mode == "DesktopSwitch") && platform() == "win32") {
                DesktopWatcher.Watch();
            }
            this.HubConnection.invoke("GetIceConfiguration");
        });
        this.HubConnection.closedCallbacks.push((ev) => {
            if (RCClient.Mode == "Normal") {
                remote.dialog.showErrorBox("Connection Failure", "Your connection was lost.");
                remote.app.exit();
            }
            else if (RCClient.Mode == "Unattended" || RCClient.Mode == "DesktopSwitch") {
                remote.app.exit();
            }
        });
    };
    ApplyMessageHandlers() {
        this.HubConnection.on("GetOfferRequest", (viewerRequesterID: string, requesterName: string) => {
            if (RCClient.Mode == "Normal") {
                var selection = Electron.remote.dialog.showMessageBox(Electron.remote.getCurrentWindow(), {
                    message: `Received connection request from ${requesterName}.  Accept?`,
                    title: "Connection Request",
                    buttons: ["Yes", "No"],
                    type: "question"
                });
                if (selection == 1) {
                    Logger.WriteLog(`Remote control request denied.  Requester Name: ${requesterName}.  Requester ID: ${viewerRequesterID}.`);
                    this.HubConnection.invoke("SendConnectionFailedToBrowser", viewerRequesterID);
                    return;
                }
                Logger.WriteLog(`Remote control request accepted.  Requester Name: ${requesterName}.  Requester ID: ${viewerRequesterID}.`);
                var viewer = new Viewer(viewerRequesterID, requesterName);
                viewer.InitRTC();
            }
            else if (RCClient.Mode == "Unattended" || RCClient.Mode == "DesktopSwitch") {
                Logger.WriteLog(`Unattended remote control session started.  Requester ID: ${viewerRequesterID}.  Mode: ${RCClient.Mode}.`);
                var viewer = new Viewer(viewerRequesterID, null);
                viewer.InitRTC();
            }
        });
      
        this.HubConnection.on("IceConfiguration", (iceConfiguration) => {
            Electron.ipcRenderer.sendSync("SetIceConfiguration", iceConfiguration);
            if (RCClient.Mode == "Unattended") {
                this.HubConnection.invoke("NotifyConsoleRequesterUnattendedReady", RCClient.ConsoleRequesterID);
            }
            else if (RCClient.Mode == "DesktopSwitch")
            {
                var viewersList = RCClient.PreSwitchViewers.split(",");
                viewersList.forEach(x => {
                    this.HubConnection.invoke("NotifyRequesterDesktopSwitchCompleted", x);
                })
            }
            else if (RCClient.Mode == "Normal") {
                this.HubConnection.invoke("GetSessionID");
            }
        });
        this.HubConnection.on("SessionID", (sessionID: string) => {
            var formattedSessionID = "";
            for (var i = 0; i < sessionID.length; i += 3) {
                formattedSessionID += sessionID.substr(i, 3) + " ";
            }
            MySessionIDInput.value = formattedSessionID.trim();
        });
        this.HubConnection.on("SelectScreen", async (screenIndex: number, requesterID: string) => {
            var viewer = RCClient.ViewerList.find(x => x.ViewerConnectionID == requesterID);
            await viewer.SetDesktopStream(screenIndex);
        });
        this.HubConnection.on("RTCSession", (description: RTCSessionDescription, requesterID: string) => {
            var viewer = RCClient.ViewerList.find(x => x.ViewerConnectionID == requesterID);
            if (viewer) {
                viewer.ReceiveRTCSession(description);
            }
        });

        this.HubConnection.on("IceCandidate", (candidate: RTCIceCandidate, requesterID: string) => {
            var viewer = RCClient.ViewerList.find(x => x.ViewerConnectionID == requesterID);
            if (viewer) {
                viewer.ReceiveCandidate(candidate);
            }
        });

        this.HubConnection.on("MouseMove", (percentX: number, percentY: number, requesterID: string) => {
            if (RCClient.Mode == "Normal" && ViewOnlyToggle.checked) {
                return;
            }
            var viewer = RCClient.ViewerList.find(x => x.ViewerConnectionID == requesterID);
            if (viewer) {
                var absolutePoint = GetAbsolutePointFromPercents(percentX, percentY, viewer);
                Robot.moveMouse(absolutePoint.x, absolutePoint.y);
            }
        });
        this.HubConnection.on("MouseDown", (button: string, percentX: number, percentY: number, requesterID: string) => {
            if (RCClient.Mode == "Normal" && ViewOnlyToggle.checked) {
                return;
            }
            var viewer = RCClient.ViewerList.find(x => x.ViewerConnectionID == requesterID);
            if (viewer) {
                var absolutePoint = GetAbsolutePointFromPercents(percentX, percentY, viewer);
                Robot.moveMouse(absolutePoint.x, absolutePoint.y);
                Robot.mouseToggle("down", button);
            }
        });
        this.HubConnection.on("MouseUp", (button: string, percentX: number, percentY: number, requesterID: string) => {
            if (RCClient.Mode == "Normal" && ViewOnlyToggle.checked) {
                return;
            }
            var viewer = RCClient.ViewerList.find(x => x.ViewerConnectionID == requesterID);
            if (viewer) {
                var absolutePoint = GetAbsolutePointFromPercents(percentX, percentY, viewer);
                Robot.moveMouse(absolutePoint.x, absolutePoint.y);
                Robot.mouseToggle("up", button);
            }
        });
        this.HubConnection.on("TouchDown", (requesterID: string) => {
            if (RCClient.Mode == "Normal" && ViewOnlyToggle.checked) {
                return;
            }
            var viewer = RCClient.ViewerList.find(x => x.ViewerConnectionID == requesterID);
            if (viewer) {
                Robot.mouseToggle("down", "left");
            }
        });
        this.HubConnection.on("LongPress", (requesterID: string) => {
            if (RCClient.Mode == "Normal" && ViewOnlyToggle.checked) {
                return;
            }
            var viewer = RCClient.ViewerList.find(x => x.ViewerConnectionID == requesterID);
            if (viewer) {
                Robot.mouseClick("right");
            }
        });
        this.HubConnection.on("TouchMove", (moveX: number, moveY: number, requesterID: string) => {
            if (RCClient.Mode == "Normal" && ViewOnlyToggle.checked) {
                return;
            }
            var viewer = RCClient.ViewerList.find(x => x.ViewerConnectionID == requesterID);
            if (viewer) {
                var mousePos = Robot.getMousePos();
                Robot.moveMouse(mousePos.x + moveX, mousePos.y + moveY);
            }
        });
        this.HubConnection.on("TouchUp", (requesterID: string) => {
            if (RCClient.Mode == "Normal" && ViewOnlyToggle.checked) {
                return;
            }
            var viewer = RCClient.ViewerList.find(x => x.ViewerConnectionID == requesterID);
            if (viewer) {
                Robot.mouseToggle("up", "left");
            }
        });
        this.HubConnection.on("Tap", (requesterID: string) => {
            if (RCClient.Mode == "Normal" && ViewOnlyToggle.checked) {
                return;
            }
            var viewer = RCClient.ViewerList.find(x => x.ViewerConnectionID == requesterID);
            if (viewer) {
                Robot.mouseClick("left");
            }
        });
        this.HubConnection.on("MouseWheel", (deltaX: number, deltaY: number, requesterID: string) => {
            if (RCClient.Mode == "Normal" && ViewOnlyToggle.checked) {
                return;
            }
            var viewer = RCClient.ViewerList.find(x => x.ViewerConnectionID == requesterID);
            if (viewer) {
                var modifiedX = (deltaX > 0 ? 120 : -120) * -1;
                var modifiedY = (deltaY > 0 ? 120 : -120) * -1;
                Robot.scrollMouse(modifiedX, modifiedY);
            }
        });
        this.HubConnection.on("KeyDown", (key: string, requesterID: string) => {
            if (RCClient.Mode == "Normal" && ViewOnlyToggle.checked) {
                return;
            }
            var viewer = RCClient.ViewerList.find(x => x.ViewerConnectionID == requesterID);
            if (viewer) {
                key = key.replace("arrow", "");
                Robot.keyToggle(key, "down");
            }
        });
        this.HubConnection.on("KeyUp", (key: string, requesterID: string) => {
            if (RCClient.Mode == "Normal" && ViewOnlyToggle.checked) {
                return;
            }
            var viewer = RCClient.ViewerList.find(x => x.ViewerConnectionID == requesterID);
            if (viewer) {
                key = key.replace("arrow", "");
                Robot.keyToggle(key, "up");
            }
        });
        this.HubConnection.on("KeyPress", (key: string, requesterID: string) => {
            if (RCClient.Mode == "Normal" && ViewOnlyToggle.checked) {
                return;
            }
            var viewer = RCClient.ViewerList.find(x => x.ViewerConnectionID == requesterID);
            if (viewer) {
                key = key.replace("Arrow", "");
                Robot.keyTap(key);
            }
        });
        this.HubConnection.on("SharedFileIDs", (fileIDs: Array<string>) => {
            var prompted = false;
            fileIDs.forEach(x => {
                var url = `https://${RCClient.Host}/API/FileSharing/${x}`
                var xhr = new XMLHttpRequest();
                xhr.responseType = "arraybuffer";
                xhr.open("get", url);
                xhr.onload = (ev) => {
                    var cd = xhr.getResponseHeader("Content-Disposition");
                    var filename = cd.split(";").find(x => x.trim().startsWith("filename")).split("=")[1];
                    var sharedFilePath = path.join(Electron.remote.app.getPath("userData"), "DoXM", "SharedFiles");
                    if (!fs.existsSync(sharedFilePath)) {
                        fs.mkdirSync(sharedFilePath, null);
                    }
                    fs.writeFileSync(path.join(sharedFilePath, filename), new Buffer(xhr.response));
                    if (!prompted) {
                        prompted = true;
                        remote.dialog.showMessageBox({
                            message: `File downloaded to ${path.join(sharedFilePath, filename)}.  Open the folder now?`,
                            title: "Download Complete",
                            type: "question",
                            buttons: ["Yes", "No"]
                        }, (response) => {
                            if (response == 0) {
                                remote.shell.openExternal(sharedFilePath);
                            }
                        });
                    }
                };
                xhr.onerror = (ev) => {
                    Logger.WriteLog("Error downloading shared file.");
                    remote.dialog.showErrorBox("Download Error", "There was an error downloading the shared file.");
                };
                xhr.send();
            })
        });
    }
}
