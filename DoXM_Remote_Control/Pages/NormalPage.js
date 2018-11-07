"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Electron = require("electron");
const RCClient_1 = require("../Services/RCClient");
var host = Electron.remote.getGlobal("TargetHost");
exports.ConnectButton = document.getElementById("connectButton");
exports.RequesterNameInput = document.getElementById("requesterName");
exports.MySessionIDInput = document.getElementById("mySessionID");
exports.TheirSessionIDInput = document.getElementById("theirSessionID");
exports.ViewerListSelect = document.getElementById("viewerList");
exports.RemoveViewerButton = document.getElementById("removeViewerButton");
exports.ViewOnlyToggle = document.getElementById("viewOnlyToggle");
exports.CopyInviteLinkButton = document.getElementById("copyInviteLinkButton");
window.onload = () => {
    document.getElementById("doxmTitle").onclick = () => {
        Electron.remote.shell.openExternal("https://doxm.app");
    };
    document.getElementById("connectButton").onclick = () => {
        var requesterName = encodeURIComponent(exports.RequesterNameInput.value);
        var theirSessionID = encodeURIComponent(exports.TheirSessionIDInput.value.trim().split(" ").join(""));
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
    };
    document.querySelectorAll("#requesterName, #theirSessionID").forEach(x => {
        x.addEventListener("keypress", (ev) => {
            if (ev.key.toLowerCase() == "enter") {
                exports.ConnectButton.click();
            }
        });
    });
    document.getElementById("removeViewerButton").addEventListener("click", (ev) => {
        var viewerID = exports.ViewerListSelect.options[exports.ViewerListSelect.selectedIndex].value;
        RCClient_1.RCClient.ViewerList.find(x => x.ViewerConnectionID == viewerID).PeerConnection.close();
    });
    document.getElementById("copyInviteLinkButton").addEventListener("click", (ev) => {
        Electron.remote.clipboard.writeText(`https://${host}/RemoteControl?sessionID=${exports.MySessionIDInput.value.split(" ").join("")}`);
        ShowMessage("Copied to clipboard.");
    });
    RCClient_1.RCClient.RCDeviceSockets.Connect();
};
function ShowMessage(message) {
    var messageDiv = document.createElement("div");
    messageDiv.classList.add("float-message");
    messageDiv.innerHTML = message;
    document.body.appendChild(messageDiv);
    window.setTimeout(() => {
        messageDiv.remove();
    }, 4000);
}
exports.ShowMessage = ShowMessage;
//# sourceMappingURL=NormalPage.js.map