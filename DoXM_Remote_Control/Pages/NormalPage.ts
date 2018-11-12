import * as Electron from "electron";
import * as RCDeviceSockets from "../Services/RCDeviceSockets";
import * as Logger from "../Services/Logger";
import { Viewer } from "../Models/Viewer";
import { RCClient } from "../Services/RCClient";

var host = Electron.remote.getGlobal("TargetHost");

export var ConnectButton = document.getElementById("connectButton") as HTMLButtonElement;
export var RequesterNameInput = document.getElementById("requesterName") as HTMLInputElement;
export var MySessionIDInput = document.getElementById("mySessionID") as HTMLInputElement;
export var TheirSessionIDInput = document.getElementById("theirSessionID") as HTMLInputElement;
export var ViewerListSelect = document.getElementById("viewerList") as HTMLSelectElement;
export var RemoveViewerButton = document.getElementById("removeViewerButton") as HTMLButtonElement;
export var ViewOnlyToggle = document.getElementById("viewOnlyToggle") as HTMLInputElement;
export var CopyInviteLinkButton = document.getElementById("copyInviteLinkButton") as HTMLButtonElement;
export var MinimizeButton = document.getElementById("minimizeButton") as HTMLButtonElement;
export var CloseButton = document.getElementById("closeButton") as HTMLButtonElement;

window.onload = () => {
    document.getElementById("doxmTitle").onclick = () => {
        Electron.remote.shell.openExternal("https://doxm.app");
    }
    document.getElementById("connectButton").onclick = () => {
        var requesterName = encodeURIComponent(RequesterNameInput.value);
        var theirSessionID = encodeURIComponent(TheirSessionIDInput.value.trim().split(" ").join(""));
        var window = new Electron.remote.BrowserWindow({
            icon: '../Assets/DoXM_Icon.png',
            show: false,
            webPreferences: {
                nodeIntegration: false
            }
        });
        window.setMenuBarVisibility(false);
        window.loadURL(`https://${host}/RemoteControl?sessionID=${theirSessionID}&requesterName=${requesterName}`);
        window.show();
    }
    document.querySelectorAll("#requesterName, #theirSessionID").forEach(x => {
        x.addEventListener("keypress", (ev: KeyboardEvent) => {
            if (ev.key.toLowerCase() == "enter") {
                ConnectButton.click();
            }
        });
    })
    document.getElementById("removeViewerButton").addEventListener("click", (ev) => {
        var viewerID = ViewerListSelect.options[ViewerListSelect.selectedIndex].value;
        RCClient.ViewerList.find(x => x.ViewerConnectionID == viewerID).PeerConnection.close();
    })
    document.getElementById("copyInviteLinkButton").addEventListener("click", (ev) => {
        Electron.remote.clipboard.writeText(`https://${host}/RemoteControl?sessionID=${MySessionIDInput.value.split(" ").join("")}`);
        ShowMessage("Copied to clipboard.");
    });
    document.getElementById("closeButton").addEventListener("click", (ev) => {
        Electron.remote.getCurrentWindow().close();
    });
    document.getElementById("minimizeButton").addEventListener("click", (ev) => {
        Electron.remote.getCurrentWindow().minimize();
    });
    RCClient.RCDeviceSockets.Connect();
}

export function ShowMessage(message: string) {
    var messageDiv = document.createElement("div");
    messageDiv.classList.add("float-message");
    messageDiv.innerHTML = message;
    document.body.appendChild(messageDiv);
    window.setTimeout(() => {
        messageDiv.remove();
    }, 4000);
}