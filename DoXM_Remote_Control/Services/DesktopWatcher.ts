import * as path from "path";
import { ChildProcess, spawn } from "child_process";
import { RCClient } from "./RCClient";
import * as Electron from "@electron/remote";

export var WatcherProcess: ChildProcess;

export function Watch() {
    WatcherProcess = spawn("DoXM_Switch_Watch.exe", [Electron.getGlobal("Desktop")], {
        shell: true,
        cwd: path.join(process.env.ProgramData, "DoXM", "remote_control", "resources")
    });

    WatcherProcess.stdout.on("data", (data) => {
        RCClient.ViewerList.forEach(x => {
            RCClient.DeviceSocket.HubConnection.invoke("NotifyViewerDesktopSwitching", x.ViewerConnectionID);
        });
        var viewers = RCClient.ViewerList.map(x => x.ViewerConnectionID);
        RCClient.DeviceSocket.HubConnection.invoke("LaunchRCInNewDesktop", Electron.getGlobal("ServiceID"), viewers, data.toString().trim());
        Electron.app.exit();
    })
}