"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = require("path");
const child_process_1 = require("child_process");
const RCClient_1 = require("./RCClient");
function Watch() {
    exports.WatcherProcess = child_process_1.spawn("DoXM_Switch_Watch.exe", [electron_1.remote.getGlobal("Desktop")], {
        shell: true,
        cwd: path.join(process.env.ProgramData, "DoXM", "remote_control", "resources")
    });
    exports.WatcherProcess.stdout.on("data", (data) => {
        RCClient_1.RCClient.ViewerList.forEach(x => {
            RCClient_1.RCClient.RCDeviceSockets.HubConnection.invoke("NotifyViewerDesktopSwitching", x.ViewerConnectionID);
        });
        var viewers = RCClient_1.RCClient.ViewerList.map(x => x.ViewerConnectionID);
        RCClient_1.RCClient.RCDeviceSockets.HubConnection.invoke("LaunchRCInNewDesktop", electron_1.remote.getGlobal("ServiceID"), viewers, data.toString().trim());
        electron_1.remote.app.exit();
    });
}
exports.Watch = Watch;
//# sourceMappingURL=DesktopWatcher.js.map