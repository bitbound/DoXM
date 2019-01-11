import { app, BrowserWindow, screen, session, ipcMain } from "electron";
import * as Logger from "./Services/Logger";
import * as fs from "fs";
import * as path from "path";

// If TargetHost isn't specified, the remote control will ask the
// user for a hostname on the first run.
global["TargetHost"] = "my.doxm.app";
global["Proxy"] = "";
global["ServiceID"] = "";

var args = processArgs()
var mainWindow: BrowserWindow;

function createNormalPage() {
    global["Mode"] = "Normal";
    mainWindow = new BrowserWindow({
        width: 475,
        height: 450,
        minHeight: 450,
        minWidth: 475,
        show: false,
        frame: false,
        titleBarStyle: "hidden",
        icon: __dirname + '/Assets/DoXM_Icon_Transparent.png'
    });
    mainWindow.setMenuBarVisibility(false);
    mainWindow.loadFile(__dirname + '/Pages/NormalPage.html');
    mainWindow.show();
    setSessionHeaders(mainWindow.webContents.session);
}
function createTargetHostPromptPage() {
    global["Mode"] = "Normal";
    mainWindow = new BrowserWindow({
        width: 400,
        height: 300,
        minHeight: 300,
        minWidth: 400,
        show: false,
        frame: false,
        titleBarStyle: "hidden",
        icon: __dirname + '/Assets/DoXM_Icon_Transparent.png'
    });
    mainWindow.setMenuBarVisibility(false);
    mainWindow.loadFile(__dirname + '/Pages/TargetHostPrompt.html');
    mainWindow.show();
    setSessionHeaders(mainWindow.webContents.session);
}
function createUnattendedPage(mode: string) {
    if (mode.toLowerCase() == "unattended") {
        global["Mode"] = "Unattended";
    }
    else if (mode.toLowerCase() == "desktopswitch") {
        global["Mode"] = "DesktopSwitch";
    }
    global["RequesterID"] = args["requester"];
    global["ServiceID"] = args["serviceid"];
    global["Desktop"] = args["desktop"];
    global["ViewerIDs"] = args["viewers"];

    var windowWidth = 80;
    var windowHeight = 80;
    mainWindow = new BrowserWindow({
        width: windowWidth,
        height: windowHeight,
        backgroundColor: "black",
        alwaysOnTop: true,
        autoHideMenuBar: true,
        resizable: false,
        frame: false,
        titleBarStyle: "hidden",
        show: false,
        icon: __dirname + '/Assets/DoXM_Icon_Transparent.png'
    });
    mainWindow.setMenuBarVisibility(false);
    mainWindow.loadFile(__dirname + '/Pages/UnattendedPage.html');
    mainWindow.show();
    setSessionHeaders(mainWindow.webContents.session);

    var currentScreen = screen.getDisplayMatching(mainWindow.getBounds());
    mainWindow.setPosition(currentScreen.workArea.width - windowWidth, currentScreen.workArea.height - windowHeight);
}
async function createWindow() {
    if (args["proxy"]) {
        global["Proxy"] = args["proxy"];
    }
    if (args["hostname"]) {
        global["TargetHost"] = args["hostname"];
    }
    if (args["mode"]) {
        if (!global["TargetHost"] && !getTargetHostFromStorage()) {
            Logger.WriteLog("No TargetHost is specified, and an unattended session was attempted.  Closing the app.");
            app.exit();
            return;
        }
        createUnattendedPage(args["mode"]);
    }
    else {
        if (!global["TargetHost"] && !getTargetHostFromStorage()) {
            createTargetHostPromptPage();
            return;
        }
        createNormalPage();
    }
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

}
function getTargetHostFromStorage(): boolean {
    var rcConfigPath = path.join(app.getPath("userData"), "rc_config.json");
    if (fs.existsSync(rcConfigPath)) {
        var fileContents = fs.readFileSync(rcConfigPath).toString();
        var config = JSON.parse(fileContents);
        if (config.TargetHost) {
            global["TargetHost"] = config.TargetHost;
            return true;
        }
    }
    return false;
}
function processArgs() {
    var argDict = {};
    var argsStartIndex = process.argv.findIndex(x => x.startsWith("-"));
    for (var i = argsStartIndex; i < process.argv.length; i += 2) {
        var key = process.argv[i];
        if (key) {
            key = key.trim().replace("-", "").toLowerCase();
            var value = process.argv[i + 1];
            if (value) {
                argDict[key] = process.argv[i + 1].trim();
            }
        }
    }
    return argDict;
}

ipcMain.on("SetIceConfiguration", (ev, iceConfiguration) => {
    global["IceConfiguration"] = iceConfiguration;
    ev.returnValue = "";
});

ipcMain.on("SetTargetHost", (ev, targetHost) => {
    var targetHostWindow = mainWindow;
    global["TargetHost"] = targetHost;
    createWindow().then(() => {
        targetHostWindow.close();
    })
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
app.on('ready', () => {
    setSessionHeaders(session.defaultSession);
    createWindow();
});
app.on('activate', function () {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (this.MainWindow == null) {
        createWindow();
    }
})
function setSessionHeaders(currentSession: Electron.Session) {
    currentSession.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: Object.assign(details.responseHeaders, {
                'Content-Security-Policy': [`default-src 'self' 'unsafe-inline' https://${global["TargetHost"]} wss://${global["TargetHost"]};`]
            })
        })
    })
}















