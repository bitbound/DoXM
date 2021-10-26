import * as UI from "./UI.js";
import * as Utilities from "../Utilities.js";
import { RemoteControl } from "./RemoteControl.js";
export class BrowserRTC {
    Init() {
        this.PeerConnection = new RTCPeerConnection(this.IceConfiguration);
        UI.ScreenViewer.onloadedmetadata = (ev) => {
            UI.ScreenViewer.play();
        };
        this.PeerConnection.ontrack = (event) => {
            event.streams.forEach(x => {
                UI.ScreenViewer.srcObject = x;
            });
        };
        this.PeerConnection.onconnectionstatechange = function (ev) {
            switch (this.connectionState) {
                case "closed":
                case "disconnected":
                case "failed":
                    UI.ConnectBox.style.removeProperty("display");
                    UI.ConnectButton.removeAttribute("disabled");
                    UI.ScreenViewer.srcObject = null;
                    UI.StatusMessage.innerHTML = "Connection closed.";
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
                    UI.ConnectBox.style.removeProperty("display");
                    UI.ConnectButton.removeAttribute("disabled");
                    UI.ScreenViewer.srcObject = null;
                    UI.StatusMessage.innerHTML = "Connection closed.";
                    break;
                default:
                    break;
            }
        };
        this.PeerConnection.onicecandidate = async (ev) => {
            await RemoteControl.RCBrowserSocket.SendIceCandidate(ev.candidate);
        };
    }
    Disconnect() {
        this.PeerConnection.close();
    }
    async ReceiveRTCSession(description) {
        if (description.type === 'offer') {
            await this.PeerConnection.setRemoteDescription(description);
            Utilities.When(() => {
                return this.PeerConnection.remoteDescription.sdp.length > 0;
            }).then(async () => {
                await this.PeerConnection.setLocalDescription(await this.PeerConnection.createAnswer());
                await RemoteControl.RCBrowserSocket.SendRTCSession(this.PeerConnection.localDescription);
            });
        }
        else if (description.type === 'answer') {
            await this.PeerConnection.setRemoteDescription(description);
        }
        else {
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
}
//# sourceMappingURL=BrowserRTC.js.map