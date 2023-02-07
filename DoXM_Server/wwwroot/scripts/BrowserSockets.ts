﻿import * as UI from "./UI.js";
import * as DataGrid from "./DataGrid.js";
import { Machine } from "./Models/Machine.js";
import { PSCoreCommandResult } from "./Models/PSCoreCommandResult.js";
import { GenericCommandResult } from "./Models/GenericCommandResult.js";
import { CommandContext } from "./Models/CommandContext.js";
import { CreateCommandHarness, AddCommandResultsHarness, AddPSCoreResultsHarness, UpdateResultsCount } from "./ResultsParser.js";
import { Store } from "./Store.js";
import { DoXMUserOptions } from "./Models/DoXMUserOptions.js";
import { UserSettings } from "./UserSettings.js";
import { Main } from "./Main.js";

export var Connection: any;
export var ServiceID: string;
export var Connected: boolean;

export function Connect() {
    var signalR = window["signalR"];
    Connection = new signalR.HubConnectionBuilder()
        .withUrl("/BrowserHub")
        .configureLogging(signalR.LogLevel.Information)
        .build();

    applyMessageHandlers(Connection);

    Connection.start().catch(err => {
        console.error(err.toString());
        Connected = false;
        UI.AddConsoleOutput("Your connection was lost.  Refresh the page or enter a command to reconnect.");
    }).then(() => {
        Connected = true;
    })
    this.Connection.onclose(() => {
        Connected = false;
        if (!Store.IsDisconnectExpected) {
            UI.ShowModal("Connection Failure", "Your connection was lost. Refresh the page or enter a command to reconnect.");
            UI.AddConsoleOutput("Connection lost.");
        }
    });
};

function applyMessageHandlers(hubConnection) {
    hubConnection.on("UserOptions", (options: DoXMUserOptions) => {
        Main.UserSettings.CommandModeShortcuts.DoXM = options.CommandModeShortcutDoXM;
        Main.UserSettings.CommandModeShortcuts.PSCore = options.CommandModeShortcutPSCore;
        Main.UserSettings.CommandModeShortcuts.WinPS = options.CommandModeShortcutWinPS;
        Main.UserSettings.CommandModeShortcuts.Bash = options.CommandModeShortcutBash;
        Main.UserSettings.CommandModeShortcuts.CMD = options.CommandModeShortcutCMD;
        UI.AddConsoleOutput("Console connected.");
        DataGrid.RefreshGrid();
    });
    hubConnection.on("LockedOut", (args) => {
        location.assign("/Identity/Account/Lockout");
    });

    hubConnection.on("MachineCameOnline", (machine:Machine) => {
        DataGrid.AddOrUpdateMachine(machine);
    });
    hubConnection.on("MachineWentOffline", (machine: Machine) => {
        DataGrid.AddOrUpdateMachine(machine);
    });
    hubConnection.on("MachineHeartbeat", (machine: Machine) => {
        DataGrid.AddOrUpdateMachine(machine);
    });

    hubConnection.on("RefreshMachineList", () => {
        DataGrid.RefreshGrid();
    });

    hubConnection.on("PSCoreResult", (result: PSCoreCommandResult) => {
        AddPSCoreResultsHarness(result);
        UpdateResultsCount(result.CommandContextID);
    });
    hubConnection.on("CommandResult", (result: GenericCommandResult) => {
        AddCommandResultsHarness(result);
        UpdateResultsCount(result.CommandContextID);
    });
    hubConnection.on("DisplayConsoleMessage", (message: string) => {
        UI.AddConsoleOutput(message);
    });
    hubConnection.on("DisplayConsoleHTML", (message: string) => {
        UI.AddConsoleHTML(message);
    });
    hubConnection.on("TransferCompleted", (transferID: string) => {
        var completedWrapper = document.getElementById(transferID + "-completed");
        var count = parseInt(completedWrapper.innerHTML);
        completedWrapper.innerHTML = (count + 1).toString();
    })
    hubConnection.on("PSCoreResultViaAjax", (commandID: string, machineID: string) => {
        var targetURL = `${location.origin}/API/Commands/PSCoreResult/${commandID}/${machineID}`;
        var xhr = new XMLHttpRequest();
        xhr.open("get", targetURL);
        xhr.onload = function () {
            if (xhr.status == 200) {
                AddPSCoreResultsHarness(JSON.parse(xhr.responseText));
                UpdateResultsCount(commandID);
            }
        };
        xhr.send();
    });
    hubConnection.on("WinPSResultViaAjax", (commandID: string, machineID: string) => {
        var targetURL = `${location.origin}/API/Commands/WinPSResult/${commandID}/${machineID}`;
        var xhr = new XMLHttpRequest();
        xhr.open("get", targetURL);
        xhr.onload = function () {
            if (xhr.status == 200) {
                AddCommandResultsHarness(JSON.parse(xhr.responseText));
                UpdateResultsCount(commandID);
            }
        };
        xhr.send();
    });
    hubConnection.on("CMDResultViaAjax", (commandID: string, machineID: string) => {
        var targetURL = `${location.origin}/API/Commands/PSCoreResult/${commandID}/${machineID}`;
        var xhr = new XMLHttpRequest();
        xhr.open("get", targetURL);
        xhr.onload = function () {
            if (xhr.status == 200) {
                AddCommandResultsHarness(JSON.parse(xhr.responseText));
                UpdateResultsCount(commandID);
            }
        };
        xhr.send();
    });
    hubConnection.on("BashResultViaAjax", (commandID: string, machineID: string) => {
        var targetURL = `${location.origin}/API/Commands/PSCoreResult/${commandID}/${machineID}`;
        var xhr = new XMLHttpRequest();
        xhr.open("get", targetURL);
        xhr.onload = function () {
            if (xhr.status == 200) {
                AddCommandResultsHarness(JSON.parse(xhr.responseText));
                UpdateResultsCount(commandID);
            }
        };
        xhr.send();
    });
    hubConnection.on("CommandContextCreated", (context: CommandContext) => {
        UI.AddConsoleHTML(CreateCommandHarness(context).outerHTML);
    });
    hubConnection.on("ServiceID", (serviceID: string) => {
        ServiceID = serviceID;
    });
    hubConnection.on("UnattendedRTCReady", (rcConnectionID: string) => {
        window.open(`/RemoteControl?clientID=${rcConnectionID}&serviceID=${ServiceID}`, "_blank");
    });
}