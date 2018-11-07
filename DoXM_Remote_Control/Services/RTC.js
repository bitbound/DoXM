"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Sockets = require("../Services/Sockets");
const Logger = require("../Services/Logger");
const electron_1 = require("electron");
var configuration = {
    iceServers: [
        { urls: 'stun:stun.stunprotocol.org:3478' },
    ]
};
var peerConnection;
var dataChannel;
async function Init() {
    try {
        peerConnection = new RTCPeerConnection(configuration);
        dataChannel = peerConnection.createDataChannel("data");
        peerConnection.onicecandidate = (ev) => {
            Sockets.SendIceCandidate(ev.candidate);
        };
        peerConnection.onnegotiationneeded = async () => {
            try {
                await peerConnection.setLocalDescription(await peerConnection.createOffer());
                Sockets.SendRTCSession(peerConnection.localDescription);
            }
            catch (err) {
                console.error(err);
            }
        };
        await addDesktopStreams();
        Sockets.SendRTCSession(peerConnection.localDescription);
    }
    catch (err) {
        console.error(err);
    }
}
exports.Init = Init;
async function ReceiveRTCSession(description) {
    if (description.type === 'offer') {
        await peerConnection.setRemoteDescription(description);
        await addDesktopStreams();
        await peerConnection.setLocalDescription(await peerConnection.createAnswer());
        Sockets.SendRTCSession(peerConnection.localDescription);
    }
    else if (description.type === 'answer') {
        await peerConnection.setRemoteDescription(description);
    }
    else {
        Logger.WriteLog("Unsupported SDP type.");
        console.log('Unsupported SDP type.');
    }
}
exports.ReceiveRTCSession = ReceiveRTCSession;
async function ReceiveCandidate(candidate) {
    await peerConnection.addIceCandidate(candidate);
}
exports.ReceiveCandidate = ReceiveCandidate;
async function addDesktopStreams() {
    electron_1.desktopCapturer.getSources({ types: ['window', 'screen'] }, (error, sources) => {
        if (error) {
            throw error;
        }
        for (let i = 0; i < sources.length; ++i) {
            if (sources[i].name === 'Electron') {
                navigator.mediaDevices.getUserMedia({
                    audio: true,
                    video: true
                    //{
                    //    mandatory: {
                    //        chromeMediaSource: 'desktop',
                    //        chromeMediaSourceId: sources[i].id,
                    //        minWidth: 1280,
                    //        maxWidth: 1280,
                    //        minHeight: 720,
                    //        maxHeight: 720
                    //    }
                    //}
                }).then((stream) => {
                    stream.getTracks().forEach(track => {
                        peerConnection.addTrack(track);
                    });
                    return Promise.resolve();
                }).catch((e) => {
                    Logger.WriteLog(e.message);
                    return Promise.resolve();
                });
            }
        }
    });
}
//# sourceMappingURL=RTC.js.map