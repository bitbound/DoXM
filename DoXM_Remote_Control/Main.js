"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const Logger = require("./Services/Logger");
const fs = require("fs");
const path = require("path");
const Remote = require("@electron/remote/main");
const Robot = require("robotjs");
Remote.initialize();
// If TargetHost isn't specified, the remote control will ask the
// user for a hostname on the first run.
global["TargetHost"] = "";
global["ProxyServer"] = "";
global["ServiceID"] = "";
var args = processArgs();
var mainWindow;
function createNormalPage() {
    global["Mode"] = "Normal";
    mainWindow = new electron_1.BrowserWindow({
        width: 475,
        height: 450,
        minHeight: 450,
        minWidth: 475,
        show: false,
        frame: false,
        titleBarStyle: "hidden",
        icon: __dirname + '/Assets/DoXM_Icon_Transparent.png',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });
    Remote.enable(mainWindow.webContents);
    mainWindow.setMenuBarVisibility(false);
    mainWindow.loadFile(__dirname + '/Pages/NormalPage.html');
    mainWindow.show();
    setSessionHeaders(mainWindow.webContents.session);
}
function createTargetHostPromptPage() {
    global["Mode"] = "Normal";
    mainWindow = new electron_1.BrowserWindow({
        width: 400,
        height: 300,
        minHeight: 300,
        minWidth: 400,
        show: false,
        frame: false,
        titleBarStyle: "hidden",
        icon: __dirname + '/Assets/DoXM_Icon_Transparent.png',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });
    Remote.enable(mainWindow.webContents);
    mainWindow.setMenuBarVisibility(false);
    mainWindow.loadFile(__dirname + '/Pages/TargetHostPrompt.html');
    mainWindow.show();
    setSessionHeaders(mainWindow.webContents.session);
}
function createUnattendedPage(mode) {
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
    mainWindow = new electron_1.BrowserWindow({
        width: windowWidth,
        height: windowHeight,
        backgroundColor: "black",
        alwaysOnTop: true,
        autoHideMenuBar: true,
        resizable: false,
        frame: false,
        titleBarStyle: "hidden",
        show: false,
        icon: __dirname + '/Assets/DoXM_Icon_Transparent.png',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });
    Remote.enable(mainWindow.webContents);
    mainWindow.setMenuBarVisibility(false);
    mainWindow.loadFile(__dirname + '/Pages/UnattendedPage.html');
    mainWindow.show();
    setSessionHeaders(mainWindow.webContents.session);
    var currentScreen = electron_1.screen.getDisplayMatching(mainWindow.getBounds());
    mainWindow.setPosition(currentScreen.workArea.width - windowWidth, currentScreen.workArea.height - windowHeight);
}
async function createWindow() {
    if (args["proxy"]) {
        global["ProxyServer"] = args["proxy"];
    }
    if (args["hostname"]) {
        global["TargetHost"] = args["hostname"];
    }
    if (args["mode"]) {
        if (!global["TargetHost"] && !getTargetHostFromStorage()) {
            Logger.WriteLog("No TargetHost is specified, and an unattended session was attempted.  Closing the app.");
            electron_1.app.exit();
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
function getTargetHostFromStorage() {
    var rcConfigPath = path.join(electron_1.app.getPath("userData"), "rc_config.json");
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
electron_1.ipcMain.on("SetIceConfiguration", (ev, iceConfiguration) => {
    global["IceConfiguration"] = iceConfiguration;
    ev.returnValue = "";
});
electron_1.ipcMain.on("SetTargetHost", (ev, targetHost) => {
    var targetHostWindow = mainWindow;
    global["TargetHost"] = targetHost;
    createWindow().then(() => {
        targetHostWindow.close();
    });
});
electron_1.ipcMain.on("MoveMouse", (ev, x, y) => {
    Robot.moveMouse(x, y);
});
electron_1.ipcMain.on("MouseToggle", (ev, direction, button) => {
    Robot.mouseToggle(direction, button);
});
electron_1.ipcMain.on("MoveMouseRelative", (ev, moveX, moveY) => {
    let mousePos = Robot.getMousePos();
    Robot.moveMouse(mousePos.x + moveX, mousePos.y + moveY);
});
electron_1.ipcMain.on("MouseClick", (ev, button) => {
    Robot.mouseClick(button);
});
electron_1.ipcMain.on("ScrollMouse", (ev, deltaX, deltaY) => {
    Robot.scrollMouse(deltaX, deltaY);
});
electron_1.ipcMain.on("KeyToggle", (ev, key, direction) => {
    Robot.keyToggle(key, direction);
});
electron_1.ipcMain.on("KeyTap", (ev, key) => {
    Robot.keyTap(key);
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('ready', () => {
    setSessionHeaders(electron_1.session.defaultSession);
    createWindow();
});
electron_1.app.on('activate', function () {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (this.MainWindow == null) {
        createWindow();
    }
});
function setSessionHeaders(currentSession) {
    currentSession.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: Object.assign(details.responseHeaders, {
                'Content-Security-Policy': [`default-src 'self' 'unsafe-inline' https://${global["TargetHost"]} wss://${global["TargetHost"]};`]
            })
        });
    });
}
//# sourceMappingURL=Main.js.map