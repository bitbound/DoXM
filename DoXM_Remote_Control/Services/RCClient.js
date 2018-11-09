"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const RCDeviceSockets_1 = require("./RCDeviceSockets");
const electron_1 = require("electron");
exports.RCClient = new class {
    constructor() {
        this.ViewerList = new Array();
        this.RCDeviceSockets = new RCDeviceSockets_1.RCDeviceSockets();
        this.Host = electron_1.remote.getGlobal("TargetHost");
        this.Mode = electron_1.remote.getGlobal("Mode");
        this.ConsoleRequesterID = electron_1.remote.getGlobal("RequesterID");
        this.PreSwitchViewers = electron_1.remote.getGlobal("ViewerIDs");
        this.ServiceID = electron_1.remote.getGlobal("ServiceID");
        this.Desktop = electron_1.remote.getGlobal("Desktop");
        this.ConnectionURL = "https://" + this.Host + "/RCDeviceHub";
        this.Proxy = electron_1.remote.getGlobal("Proxy");
    }
    WarmUpRTC() {
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
                        electron_1.remote.dialog.showErrorBox("Capture Failure", "Unable to capture desktop.");
                        reject(e);
                    });
                });
            });
        });
    }
};
//# sourceMappingURL=RCClient.js.map