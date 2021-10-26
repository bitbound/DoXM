import * as Utilities from "../Utilities.js";
import { RCBrowserSocket } from "./RCBrowserSocket.js";
import { BrowserRTC } from "./BrowserRTC.js";
import * as UI from "./UI.js";
var queryString = Utilities.ParseSearchString();
var rcBrowserSocket = new RCBrowserSocket();
var browserRTC = new BrowserRTC();
export const RemoteControl = new class {
    constructor() {
        this.RCBrowserSocket = rcBrowserSocket;
        this.BrowserRTC = browserRTC;
        this.ClientID = queryString["clientID"] ? decodeURIComponent(queryString["clientID"]) : undefined;
        this.ServiceID = queryString["serviceID"] ? decodeURIComponent(queryString["serviceID"]) : undefined;
    }
};
export function ConnectToClient() {
    UI.ConnectButton.disabled = true;
    RemoteControl.ClientID = UI.SessionIDInput.value.split(" ").join("");
    RemoteControl.RequesterName = UI.RequesterNameInput.value;
    RemoteControl.Mode = "Normal";
    RemoteControl.RCBrowserSocket.Connect();
    UI.StatusMessage.innerHTML = "Sending connection request...";
}
window.onload = () => {
    UI.ApplyInputHandlers(rcBrowserSocket, browserRTC);
    if (queryString["clientID"]) {
        RemoteControl.Mode = "Unattended";
        UI.ConnectBox.style.display = "none";
        RemoteControl.RCBrowserSocket.Connect();
    }
    else if (queryString["sessionID"]) {
        UI.SessionIDInput.value = decodeURIComponent(queryString["sessionID"]);
        if (queryString["requesterName"]) {
            UI.RequesterNameInput.value = decodeURIComponent(queryString["requesterName"]);
            ConnectToClient();
        }
    }
};
//# sourceMappingURL=RemoteControl.js.map