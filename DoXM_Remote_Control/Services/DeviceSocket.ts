import * as Electron from "@electron/remote";
import * as Logger from "../Services/Logger";
import * as SignalR from "@microsoft/signalr"
import { Viewer } from "../Models/Viewer";
import { MySessionIDInput, ViewOnlyToggle } from "../Pages/NormalPage";
import { GetAbsolutePointFromPercents } from "./Utilities";
import { RCClient } from "./RCClient";
import * as fs from "fs";
import * as path from "path";
import * as DesktopWatcher from "../Services/DesktopWatcher";
import { platform } from "os";
import { WarmUpRTC } from "./RtcHelper";
import { ipcRenderer } from "electron";

export class DeviceSocket {
    HubConnection: any;
    async Connect() {
        if (RCClient.Mode == "Unattended" || RCClient.Mode == "DesktopSwitch") {
            window.setTimeout(() => {
                if (RCClient.ViewerList.length == 0) {
                    Logger.WriteLog("No viewers connected.  Closing remote control.");
                    Electron.app.exit();
                }
            }, 10000);
        }
        await WarmUpRTC();
        this.HubConnection = new SignalR.HubConnectionBuilder()
            .withUrl(RCClient.ConnectionURL, {
                proxy: `${RCClient.Proxy}`
            } as any)
            .configureLogging(SignalR.LogLevel.Information)
            .build();

        await this.ApplyMessageHandlers();
        this.HubConnection.start().catch(err => {
            Logger.WriteLog("Connection error: " + err.toString());
            console.error(err.toString());
            Electron.dialog.showErrorBox("Connection Failure", "Unable to connect to server.");
            let rcConfigPath = path.join(Electron.app.getPath("userData"), "rc_config.json");
            if (fs.existsSync(rcConfigPath)) {
                fs.unlinkSync(rcConfigPath);
            }
            Electron.app.exit();
        }).then(() => {
            if ((RCClient.Mode == "Unattended" || RCClient.Mode == "DesktopSwitch") && platform() == "win32") {
                DesktopWatcher.Watch();
            }
            this.HubConnection.invoke("GetIceConfiguration");
        });
        this.HubConnection.closedCallbacks.push((ev) => {
            if (RCClient.Mode == "Normal") {
                Electron.dialog.showErrorBox("Connection Failure", "Your connection was lost.");
                Electron.app.exit();
            }
            else if (RCClient.Mode == "Unattended" || RCClient.Mode == "DesktopSwitch") {
                Electron.app.exit();
            }
        });
    };

    async ApplyMessageHandlers() {
        this.HubConnection.on("GetOfferRequest", async (viewerRequesterID: string, requesterName: string) => {
            if (RCClient.Mode == "Normal") {
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
                let viewer = new Viewer(viewerRequesterID, requesterName);
                viewer.InitRTC();
            }
            else if (RCClient.Mode == "Unattended" || RCClient.Mode == "DesktopSwitch") {
                Logger.WriteLog(`Unattended remote control session started.  Requester ID: ${viewerRequesterID}.  Mode: ${RCClient.Mode}.`);
                let viewer = new Viewer(viewerRequesterID, null);
                viewer.InitRTC();
            }
        });
      
        this.HubConnection.on("IceConfiguration", (iceConfiguration) => {
            ipcRenderer.sendSync("SetIceConfiguration", iceConfiguration);
            if (RCClient.Mode == "Unattended") {
                this.HubConnection.invoke("NotifyConsoleRequesterUnattendedReady", RCClient.ConsoleRequesterID);
            }
            else if (RCClient.Mode == "DesktopSwitch")
            {
                let viewersList = RCClient.PreSwitchViewers.split(",");
                viewersList.forEach(x => {
                    this.HubConnection.invoke("NotifyRequesterDesktopSwitchCompleted", x);
                })
            }
            else if (RCClient.Mode == "Normal") {
                this.HubConnection.invoke("GetSessionID");
            }
        });
        this.HubConnection.on("SessionID", (sessionID: string) => {
            let formattedSessionID = "";
            for (let i = 0; i < sessionID.length; i += 3) {
                formattedSessionID += sessionID.substr(i, 3) + " ";
            }
            MySessionIDInput.value = formattedSessionID.trim();
        });
        this.HubConnection.on("SelectScreen", async (screenIndex: number, requesterID: string) => {
            let viewer = RCClient.ViewerList.find(x => x.ViewerConnectionID == requesterID);
            await viewer.SetDesktopStream(screenIndex);
        });
        this.HubConnection.on("RTCSession", (description: RTCSessionDescription, requesterID: string) => {
            let viewer = RCClient.ViewerList.find(x => x.ViewerConnectionID == requesterID);
            if (viewer) {
                viewer.ReceiveRTCSession(description);
            }
        });

        this.HubConnection.on("IceCandidate", (candidate: RTCIceCandidate, requesterID: string) => {
            let viewer = RCClient.ViewerList.find(x => x.ViewerConnectionID == requesterID);
            if (viewer) {
                viewer.ReceiveCandidate(candidate);
            }
        });

        this.HubConnection.on("MouseMove", (percentX: number, percentY: number, requesterID: string) => {
            if (RCClient.Mode == "Normal" && ViewOnlyToggle.checked) {
                return;
            }
            let viewer = RCClient.ViewerList.find(x => x.ViewerConnectionID == requesterID);
            if (viewer) {
                let absolutePoint = GetAbsolutePointFromPercents(percentX, percentY, viewer);
                ipcRenderer.send("MoveMouse", absolutePoint.x, absolutePoint.y);
            }
        });
        this.HubConnection.on("MouseDown", (button: string, percentX: number, percentY: number, requesterID: string) => {
            if (RCClient.Mode == "Normal" && ViewOnlyToggle.checked) {
                return;
            }
            let viewer = RCClient.ViewerList.find(x => x.ViewerConnectionID == requesterID);
            if (viewer) {
                let absolutePoint = GetAbsolutePointFromPercents(percentX, percentY, viewer);
                ipcRenderer.send("MoveMouse", absolutePoint.x, absolutePoint.y);
                ipcRenderer.send("MouseToggle", "down", button);
            }
        });
        this.HubConnection.on("MouseUp", (button: string, percentX: number, percentY: number, requesterID: string) => {
            if (RCClient.Mode == "Normal" && ViewOnlyToggle.checked) {
                return;
            }
            let viewer = RCClient.ViewerList.find(x => x.ViewerConnectionID == requesterID);
            if (viewer) {
                let absolutePoint = GetAbsolutePointFromPercents(percentX, percentY, viewer);
                ipcRenderer.send("MoveMouse", absolutePoint.x, absolutePoint.y);
                ipcRenderer.send("MouseToggle", "up", button);
            }
        });
        this.HubConnection.on("TouchDown", (requesterID: string) => {
            if (RCClient.Mode == "Normal" && ViewOnlyToggle.checked) {
                return;
            }
            let viewer = RCClient.ViewerList.find(x => x.ViewerConnectionID == requesterID);
            if (viewer) {
                ipcRenderer.send("MouseToggle", "down", "left");
            }
        });
        this.HubConnection.on("LongPress", (requesterID: string) => {
            if (RCClient.Mode == "Normal" && ViewOnlyToggle.checked) {
                return;
            }
            let viewer = RCClient.ViewerList.find(x => x.ViewerConnectionID == requesterID);
            if (viewer) {
                ipcRenderer.send("MouseToggle", "down", "right");
            }
        });
        this.HubConnection.on("TouchMove", (moveX: number, moveY: number, requesterID: string) => {
            if (RCClient.Mode == "Normal" && ViewOnlyToggle.checked) {
                return;
            }
            let viewer = RCClient.ViewerList.find(x => x.ViewerConnectionID == requesterID);
            if (viewer) {
                ipcRenderer.send("MoveMouseRelative", moveX, moveY);
            }
        });
        this.HubConnection.on("TouchUp", (requesterID: string) => {
            if (RCClient.Mode == "Normal" && ViewOnlyToggle.checked) {
                return;
            }
            let viewer = RCClient.ViewerList.find(x => x.ViewerConnectionID == requesterID);
            if (viewer) {
                ipcRenderer.send("MouseToggle", "up", "left");
            }
        });
        this.HubConnection.on("Tap", (requesterID: string) => {
            if (RCClient.Mode == "Normal" && ViewOnlyToggle.checked) {
                return;
            }
            let viewer = RCClient.ViewerList.find(x => x.ViewerConnectionID == requesterID);
            if (viewer) {
                ipcRenderer.send("MouseClick", "left");
            }
        });
        this.HubConnection.on("MouseWheel", (deltaX: number, deltaY: number, requesterID: string) => {
            if (RCClient.Mode == "Normal" && ViewOnlyToggle.checked) {
                return;
            }
            let viewer = RCClient.ViewerList.find(x => x.ViewerConnectionID == requesterID);
            if (viewer) {
                let modifiedX = (deltaX > 0 ? 120 : -120) * -1;
                let modifiedY = (deltaY > 0 ? 120 : -120) * -1;
                ipcRenderer.send("ScrollMouse", modifiedX, modifiedY);
            }
        });
        this.HubConnection.on("KeyDown", (key: string, requesterID: string) => {
            if (RCClient.Mode == "Normal" && ViewOnlyToggle.checked) {
                return;
            }
            let viewer = RCClient.ViewerList.find(x => x.ViewerConnectionID == requesterID);
            if (viewer) {
                key = key.replace("arrow", "");
                ipcRenderer.send("KeyToggle", key, "down");
            }
        });
        this.HubConnection.on("KeyUp", (key: string, requesterID: string) => {
            if (RCClient.Mode == "Normal" && ViewOnlyToggle.checked) {
                return;
            }
            let viewer = RCClient.ViewerList.find(x => x.ViewerConnectionID == requesterID);
            if (viewer) {
                key = key.replace("arrow", "");
                ipcRenderer.send("KeyToggle", key, "up");
            }
        });
        this.HubConnection.on("KeyPress", (key: string, requesterID: string) => {
            if (RCClient.Mode == "Normal" && ViewOnlyToggle.checked) {
                return;
            }
            let viewer = RCClient.ViewerList.find(x => x.ViewerConnectionID == requesterID);
            if (viewer) {
                key = key.replace("Arrow", "");
                ipcRenderer.send("KeyTap", key);
            }
        });
        this.HubConnection.on("SharedFileIDs", (fileIDs: Array<string>) => {
            let prompted = false;
            fileIDs.forEach(x => {
                let url = `https://${RCClient.Host}/API/FileSharing/${x}`
                let xhr = new XMLHttpRequest();
                xhr.responseType = "arraybuffer";
                xhr.open("get", url);
                xhr.onload = async () => {
                    let cd = xhr.getResponseHeader("Content-Disposition");
                    let filename = cd.split(";").find(x => x.trim().startsWith("filename")).split("=")[1];
                    let sharedFilePath = path.join(Electron.app.getPath("userData"), "SharedFiles");
                    if (!fs.existsSync(sharedFilePath)) {
                        fs.mkdirSync(sharedFilePath, { recursive:true });
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
            })
        });
    }
}
