import * as Electron from "@electron/remote";
import * as Logger from "../Services/Logger";
import * as Utilities from "../Services/Utilities";
import { RCClient } from "../Services/RCClient";
import { ViewerListSelect } from "../Pages/NormalPage";
import { SetDesktopStream } from "../Services/RtcHelper";

export class Viewer {
    constructor(requesterID: string, requesterName: string = "") {
        this.ViewerConnectionID = requesterID;
        this.Name = requesterName;
        this.AddToViewersList();
    }
    ViewerConnectionID: string;
    PeerConnection: RTCPeerConnection;
    Name: string;
    CurrentScreenIndex: number = 0;
    NegotiationTimeout: number;
    MediaTracks: Array<MediaStreamTrack>;
    MediaStream: MediaStream;

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
                        var viewerIndex = RCClient.ViewerList.findIndex(x => x.ViewerConnectionID == connectionID);
                        if (viewerIndex > -1) {
                            RCClient.ViewerList.splice(viewerIndex, 1);
                        }
                        var viewerOptionElement = document.getElementById(connectionID);
                        if (viewerOptionElement) {
                            viewerOptionElement.remove();
                        }
                        if ((RCClient.Mode == "Unattended" || RCClient.Mode == "DesktopSwitch") && RCClient.ViewerList.length == 0) {
                            Electron.app.exit();
                        }
                        break;
                    default:
                        break;
                }
            }
            this.PeerConnection.oniceconnectionstatechange = function (ev) {
                switch (this.iceConnectionState) {
                    case "closed":
                    case "disconnected":
                    case "failed":
                        var viewerIndex = RCClient.ViewerList.findIndex(x => x.ViewerConnectionID == connectionID);
                        if (viewerIndex > -1) {
                            RCClient.ViewerList.splice(viewerIndex, 1);
                        }
                        var viewerOptionElement = document.getElementById(connectionID);
                        if (viewerOptionElement) {
                            viewerOptionElement.remove();
                        }
                        if ((RCClient.Mode == "Unattended" || RCClient.Mode == "DesktopSwitch") && RCClient.ViewerList.length == 0) {
                            Electron.app.exit();
                        }
                        break;
                    default:
                        break;
                }
            }

            this.PeerConnection.onicecandidate = async (ev) => {
                await this.SendIceCandidate(ev.candidate);
            }

            this.PeerConnection.onnegotiationneeded = async (ev) => {
                await this.PeerConnection.setLocalDescription(await this.PeerConnection.createOffer());
                await this.SendRTCSession(this.PeerConnection.localDescription);
            }

            this.SendScreenCount(this.CurrentScreenIndex, Electron.screen.getAllDisplays().length);
            await this.SetDesktopStream(this.CurrentScreenIndex);
        } catch (err) {
            console.error(err);
        }
    }

    AddToViewersList() {
        RCClient.ViewerList.push(this);
        if (ViewerListSelect) {
            var option = document.createElement("option");
            option.value = this.ViewerConnectionID;
            option.id = this.ViewerConnectionID;
            option.innerText = this.Name;
            ViewerListSelect.add(option);
        }
    }

    SendScreenCount(primaryScreenIndex: number, screenCount: number) {
        return RCClient.DeviceSocket.HubConnection.invoke("SendScreenCountToBrowser", primaryScreenIndex, screenCount, this.ViewerConnectionID);
    }
    SendRTCSession(description: RTCSessionDescription) {
        return RCClient.DeviceSocket.HubConnection.invoke("SendRTCSessionToBrowser", description, this.ViewerConnectionID);
    }

    SendIceCandidate(candidate: RTCIceCandidate) {
        return RCClient.DeviceSocket.HubConnection.invoke("SendIceCandidateToBrowser", candidate, this.ViewerConnectionID);
    }

    async ReceiveRTCSession(description: RTCSessionDescription) {
        if (description.type == 'offer') {
            await this.PeerConnection.setRemoteDescription(description);
            await this.PeerConnection.setLocalDescription(await this.PeerConnection.createAnswer());
            await this.SendRTCSession(this.PeerConnection.localDescription);
        } else if (description.type == 'answer') {
            await this.PeerConnection.setRemoteDescription(description);
        } else {
            Logger.WriteLog("Unsupported SDP type.")
            console.log('Unsupported SDP type.');
        }
    }
    async ReceiveCandidate(candidate: RTCIceCandidate) {
        Utilities.When(() => {
            return this.PeerConnection.remoteDescription.sdp.length > 0;
        }).then(async () => {
            await this.PeerConnection.addIceCandidate(candidate);
        })
    }
    async SetDesktopStream(screenIndex: number) {
        const peerConnection = this.PeerConnection;
        this.CurrentScreenIndex = screenIndex;
        await SetDesktopStream(peerConnection, screenIndex);
    }
}



