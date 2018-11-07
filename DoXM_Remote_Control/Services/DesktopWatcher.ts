import { remote } from "electron";
import * as path from "path";
import { ChildProcess, spawn } from "child_process";
import { RCClient } from "./RCClient";

export var WatcherProcess: ChildProcess;

export function Watch() {
    WatcherProcess = spawn("DoXM_Switch_Watch.exe", [remote.getGlobal("Desktop")], {
        shell: true,
        cwd: path.join(process.env.ProgramData, "DoXM", "remote_control", "resources")
    });

    WatcherProcess.stdout.on("data", (data) => {
        RCClient.ViewerList.forEach(x => {
            RCClient.RCDeviceSockets.HubConnection.invoke("NotifyViewerDesktopSwitching", x.ViewerConnectionID);
        });
        var viewers = RCClient.ViewerList.map(x => x.ViewerConnectionID);
        RCClient.RCDeviceSockets.HubConnection.invoke("LaunchRCInNewDesktop", remote.getGlobal("ServiceID"), viewers, data.toString().trim());
        remote.app.exit();
    })
}