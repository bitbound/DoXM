"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Electron = require("electron");
const Logger = require("../Services/Logger");
const Utilities = require("../Services/Utilities");
const RCClient_1 = require("../Services/RCClient");
const NormalPage_1 = require("../Pages/NormalPage");
const electron_1 = require("electron");
class Viewer {
    constructor(requesterID, requesterName = "") {
        this.CurrentScreenIndex = 0;
        this.ViewerConnectionID = requesterID;
        this.Name = requesterName;
        this.AddToViewersList();
    }
    async InitRTC() {
        try {
            var iceConfiguration = Electron.remote.getGlobal("IceConfiguration");
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
                            Electron.remote.app.exit();
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
                            Electron.remote.app.exit();
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
        return RCClient_1.RCClient.RCDeviceSockets.HubConnection.invoke("SendScreenCountToBrowser", primaryScreenIndex, screenCount, this.ViewerConnectionID);
    }
    SendRTCSession(description) {
        return RCClient_1.RCClient.RCDeviceSockets.HubConnection.invoke("SendRTCSessionToBrowser", description, this.ViewerConnectionID);
    }
    SendIceCandidate(candidate) {
        return RCClient_1.RCClient.RCDeviceSockets.HubConnection.invoke("SendIceCandidateToBrowser", candidate, this.ViewerConnectionID);
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
    SetDesktopStream(screenIndex) {
        var peerConnection = this.PeerConnection;
        this.CurrentScreenIndex = screenIndex;
        var constraints = {
            video: {
                mandatory: {
                    chromeMediaSource: 'desktop'
                }
            },
            audio: {
                mandatory: {
                    chromeMediaSource: 'desktop'
                }
            }
        };
        return new Promise((resolve, reject) => {
            electron_1.desktopCapturer.getSources({ types: ['screen'] }, (error, sources) => {
                if (error) {
                    reject(error);
                    throw error;
                }
                constraints.video.mandatory.chromeMediaSourceId = sources[screenIndex].id;
                async function setTrack(stream) {
                    stream.getTracks().forEach(track => {
                        var existingSenders = peerConnection.getSenders();
                        if (existingSenders.some(x => x.track.kind == track.kind)) {
                            existingSenders.find(x => x.track.kind == track.kind).replaceTrack(track);
                        }
                        else {
                            peerConnection.addTrack(track, stream);
                        }
                    });
                    resolve();
                }
                navigator.mediaDevices.getUserMedia(constraints).then(async (stream) => {
                    setTrack(stream);
                }).catch(() => {
                    delete constraints.audio;
                    navigator.mediaDevices.getUserMedia(constraints).then(async (stream) => {
                        setTrack(stream);
                    }).catch((e) => {
                        console.error(e);
                        Logger.WriteLog(e.message);
                        Electron.remote.dialog.showErrorBox("Capture Failure", "Unable to capture desktop.");
                        reject(e);
                    });
                });
            });
        });
    }
}
exports.Viewer = Viewer;
//# sourceMappingURL=Viewer.js.map