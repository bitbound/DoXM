"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Watch = exports.WatcherProcess = void 0;
const path = require("path");
const child_process_1 = require("child_process");
const RCClient_1 = require("./RCClient");
const Electron = require("@electron/remote");
function Watch() {
    exports.WatcherProcess = (0, child_process_1.spawn)("DoXM_Switch_Watch.exe", [Electron.getGlobal("Desktop")], {
        shell: true,
        cwd: path.join(process.env.ProgramData, "DoXM", "remote_control", "resources")
    });
    exports.WatcherProcess.stdout.on("data", (data) => {
        RCClient_1.RCClient.ViewerList.forEach(x => {
            RCClient_1.RCClient.DeviceSocket.HubConnection.invoke("NotifyViewerDesktopSwitching", x.ViewerConnectionID);
        });
        var viewers = RCClient_1.RCClient.ViewerList.map(x => x.ViewerConnectionID);
        RCClient_1.RCClient.DeviceSocket.HubConnection.invoke("LaunchRCInNewDesktop", Electron.getGlobal("ServiceID"), viewers, data.toString().trim());
        Electron.app.exit();
    });
}
exports.Watch = Watch;
//# sourceMappingURL=DesktopWatcher.js.map