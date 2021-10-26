import { Viewer } from "../Models/Viewer";
import { DeviceSocket } from "./DeviceSocket";
import * as Electron from "@electron/remote";

export const RCClient = new class {
    ViewerList = new Array<Viewer>();
    DeviceSocket = new DeviceSocket();
    Host = Electron.getGlobal("TargetHost");
    Mode: "Normal" | "Unattended" | "DesktopSwitch" = Electron.getGlobal("Mode");
    ConsoleRequesterID = Electron.getGlobal("RequesterID");
    PreSwitchViewers:string = Electron.getGlobal("ViewerIDs");
    ServiceID = Electron.getGlobal("ServiceID");
    Desktop = Electron.getGlobal("Desktop");
    ConnectionURL = "https://" + this.Host + "/RCDeviceHub";
    Proxy: string = Electron.getGlobal("ProxyServer");
}