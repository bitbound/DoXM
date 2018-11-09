import { Viewer } from "../Models/Viewer";
import { RCDeviceSockets } from "./RCDeviceSockets";
import { remote, desktopCapturer } from "electron";

export const RCClient = new class {
    ViewerList = new Array<Viewer>();
    RCDeviceSockets = new RCDeviceSockets();
    Host = remote.getGlobal("TargetHost");
    Mode: "Normal" | "Unattended" | "DesktopSwitch" = remote.getGlobal("Mode");
    ConsoleRequesterID = remote.getGlobal("RequesterID");
    PreSwitchViewers:string = remote.getGlobal("ViewerIDs");
    ServiceID = remote.getGlobal("ServiceID");
    Desktop = remote.getGlobal("Desktop");
    ConnectionURL = "https://" + this.Host + "/RCDeviceHub";
    Proxy: string = remote.getGlobal("Proxy");

    WarmUpRTC(): any {
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
        } as any;

        return new Promise((resolve, reject) => {
            desktopCapturer.getSources({ types: ['screen'] }, (error, sources) => {
                constraints.video.mandatory.chromeMediaSourceId = sources[0].id;
                navigator.mediaDevices.getUserMedia(constraints).then(async (stream) => {
                    stream.getTracks();
                    resolve();
                }).catch(() => {
                    delete constraints.audio;
                    navigator.mediaDevices.getUserMedia(constraints).then(async (stream) => {
                        stream.getTracks();
                        resolve();
                    }).catch((e) => {
                        console.error(e);
                        remote.dialog.showErrorBox("Capture Failure", "Unable to capture desktop.");
                        reject(e);
                    })
                })
            })
        });
    }
}