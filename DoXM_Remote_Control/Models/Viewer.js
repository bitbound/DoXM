"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Viewer = void 0;
const Electron = require("@electron/remote");
const Logger = require("../Services/Logger");
const Utilities = require("../Services/Utilities");
const RCClient_1 = require("../Services/RCClient");
const NormalPage_1 = require("../Pages/NormalPage");
const RtcHelper_1 = require("../Services/RtcHelper");
class Viewer {
    constructor(requesterID, requesterName = "") {
        this.CurrentScreenIndex = 0;
        this.ViewerConnectionID = requesterID;
        this.Name = requesterName;
        this.AddToViewersList();
    }
    async InitRTC() {
        try {
            var iceConfiguration = Electron.getGlobal("IceConfiguration");
            this.PeerConnection = new RTCPeerConnection(iceConfiguration);
            let connectionID = this.ViewerConnectionID;
            this.PeerConnection.onconnectionstatechange = function (ev) {
                switch (this.connectionState) {
                    case "closed":
                    case "disconnected":
                    case "failed":
                        var viewerIndex = RCClient_1.RCClient.ViewerList.findIndex(x => x.ViewerConnectionID == connectionID);
                        if (viewerIndex > -1) {
                            RCClient_1.RCClient.ViewerList.splice(viewerIndex, 1);
                        }
                        var viewerOptionElement = document.getElementById(connectionID);
                        if (viewerOptionElement) {
                            viewerOptionElement.remove();
                        }
                        if ((RCClient_1.RCClient.Mode == "Unattended" || RCClient_1.RCClient.Mode == "DesktopSwitch") && RCClient_1.RCClient.ViewerList.length == 0) {
                            Electron.app.exit();
                        }
                        break;
                    default:
                        break;
                }
            };
            this.PeerConnection.oniceconnectionstatechange = function (ev) {
                switch (this.iceConnectionState) {
                    case "closed":
                    case "disconnected":
                    case "failed":
                        var viewerIndex = RCClient_1.RCClient.ViewerList.findIndex(x => x.ViewerConnectionID == connectionID);
                        if (viewerIndex > -1) {
                            RCClient_1.RCClient.ViewerList.splice(viewerIndex, 1);
                        }
                        var viewerOptionElement = document.getElementById(connectionID);
                        if (viewerOptionElement) {
                            viewerOptionElement.remove();
                        }
                        if ((RCClient_1.RCClient.Mode == "Unattended" || RCClient_1.RCClient.Mode == "DesktopSwitch") && RCClient_1.RCClient.ViewerList.length == 0) {
                            Electron.app.exit();
                        }
                        break;
                    default:
                        break;
                }
            };
            this.PeerConnection.onicecandidate = async (ev) => {
                await this.SendIceCandidate(ev.candidate);
            };
            this.PeerConnection.onnegotiationneeded = async (ev) => {
                await this.PeerConnection.setLocalDescription(await this.PeerConnection.createOffer());
                await this.SendRTCSession(this.PeerConnection.localDescription);
            };
            this.SendScreenCount(this.CurrentScreenIndex, Electron.screen.getAllDisplays().length);
            await this.SetDesktopStream(this.CurrentScreenIndex);
        }
        catch (err) {
            console.error(err);
        }
    }
    AddToViewersList() {
        RCClient_1.RCClient.ViewerList.push(this);
        if (NormalPage_1.ViewerListSelect) {
            var option = document.createElement("option");
            option.value = this.ViewerConnectionID;
            option.id = this.ViewerConnectionID;
            option.innerText = this.Name;
            NormalPage_1.ViewerListSelect.add(option);
        }
    }
    SendScreenCount(primaryScreenIndex, screenCount) {
        return RCClient_1.RCClient.DeviceSocket.HubConnection.invoke("SendScreenCountToBrowser", primaryScreenIndex, screenCount, this.ViewerConnectionID);
    }
    SendRTCSession(description) {
        return RCClient_1.RCClient.DeviceSocket.HubConnection.invoke("SendRTCSessionToBrowser", description, this.ViewerConnectionID);
    }
    SendIceCandidate(candidate) {
        return RCClient_1.RCClient.DeviceSocket.HubConnection.invoke("SendIceCandidateToBrowser", candidate, this.ViewerConnectionID);
    }
    async ReceiveRTCSession(description) {
        if (description.type == 'offer') {
            await this.PeerConnection.setRemoteDescription(description);
            await this.PeerConnection.setLocalDescription(await this.PeerConnection.createAnswer());
            await this.SendRTCSession(this.PeerConnection.localDescription);
        }
        else if (description.type == 'answer') {
            await this.PeerConnection.setRemoteDescription(description);
        }
        else {
            Logger.WriteLog("Unsupported SDP type.");
            console.log('Unsupported SDP type.');
        }
    }
    async ReceiveCandidate(candidate) {
        Utilities.When(() => {
            return this.PeerConnection.remoteDescription.sdp.length > 0;
        }).then(async () => {
            await this.PeerConnection.addIceCandidate(candidate);
        });
    }
    async SetDesktopStream(screenIndex) {
        const peerConnection = this.PeerConnection;
        this.CurrentScreenIndex = screenIndex;
        await (0, RtcHelper_1.SetDesktopStream)(peerConnection, screenIndex);
    }
}
exports.Viewer = Viewer;
//# sourceMappingURL=Viewer.js.map