import { desktopCapturer } from "electron";

export async function SetDesktopStream(peerConnection: RTCPeerConnection, screenIndex: number) {
    let constraints = getDefaultConstraints();
    let stream: MediaStream;

    try {
        stream = await getStream(constraints, screenIndex);
        setTrack(stream, peerConnection);
    }
    catch {
        delete constraints.audio;
        stream = await getStream(constraints, screenIndex);
        setTrack(stream, peerConnection);
    }
}

export async function WarmUpRTC(): Promise<void> {
    let constraints = getDefaultConstraints();

    try {
        await getTracks(constraints, 0);
    }
    catch {
        delete constraints.audio;
        await getTracks(constraints, 0);
    }
}

async function getStream(constraints: any, screenIndex: number): Promise<MediaStream> {
    let sources = await desktopCapturer.getSources({ types: ['screen']});
    if (sources?.length > screenIndex) {
        const source = sources[screenIndex];
        constraints.video.mandatory.chromeMediaSourceId = sources[0].id;
        return await navigator.mediaDevices.getUserMedia(constraints as MediaStreamConstraints);
    }
    return null;
}

export async function getTracks(constraints: any, screenIndex: number): Promise<MediaStreamTrack[]> {
    let stream = await getStream(constraints, screenIndex);
    return stream?.getTracks();
}

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

function setTrack(stream: MediaStream, peerConnection: RTCPeerConnection) {
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