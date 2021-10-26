"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTracks = exports.WarmUpRTC = exports.SetDesktopStream = void 0;
const electron_1 = require("electron");
async function SetDesktopStream(peerConnection, screenIndex) {
    let constraints = getDefaultConstraints();
    let stream;
    try {
        stream = await getStream(constraints, screenIndex);
        setTrack(stream, peerConnection);
    }
    catch (_a) {
        delete constraints.audio;
        stream = await getStream(constraints, screenIndex);
        setTrack(stream, peerConnection);
    }
}
exports.SetDesktopStream = SetDesktopStream;
async function WarmUpRTC() {
    let constraints = getDefaultConstraints();
    try {
        await getTracks(constraints, 0);
    }
    catch (_a) {
        delete constraints.audio;
        await getTracks(constraints, 0);
    }
}
exports.WarmUpRTC = WarmUpRTC;
async function getStream(constraints, screenIndex) {
    let sources = await electron_1.desktopCapturer.getSources({ types: ['screen'] });
    if ((sources === null || sources === void 0 ? void 0 : sources.length) > screenIndex) {
        const source = sources[screenIndex];
        if (source.name == "Electron") {
            constraints.video.mandatory.chromeMediaSourceId = sources[0].id;
            return await navigator.mediaDevices.getUserMedia(constraints);
        }
    }
    return null;
}
async function getTracks(constraints, screenIndex) {
    let stream = await getStream(constraints, screenIndex);
    return stream === null || stream === void 0 ? void 0 : stream.getTracks();
}
exports.getTracks = getTracks;
function getDefaultConstraints() {
    return {
        video: {
            mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: ''
            }
        },
        audio: {
            mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: ''
            }
        }
    };
}
function setTrack(stream, peerConnection) {
    stream.getTracks().forEach(track => {
        var existingSenders = peerConnection.getSenders();
        if (existingSenders.some(x => x.track.kind == track.kind)) {
            existingSenders.find(x => x.track.kind == track.kind).replaceTrack(track);
        }
        else {
            peerConnection.addTrack(track, stream);
        }
    });
}
//# sourceMappingURL=RtcHelper.js.map