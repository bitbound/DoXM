﻿import * as CommandProcessor from "./CommandProcessor.js";
import { UserSettings} from "./UserSettings.js";
import * as Utilities from "./Utilities.js";
import { Store } from "./Store.js";
import { ConsoleCommand } from "./Models/ConsoleCommand.js";
import { CommandLineParameter } from "./Models/CommandLineParameter.js";
import { DoXMCommands } from "./Commands/DoXMCommands.js";
import { Parameter } from "./Models/Parameter.js";
import { PositionCommandCompletionWindow, HighlightCompletionWindowItem } from "./CommandCompletion.js";
import { PSCoreCommandResult } from "./Models/PSCoreCommandResult.js";
import { CommandContext } from "./Models/CommandContext.js";
import * as DataGrid from "./DataGrid.js";
import { CreateCommandHarness, AddPSCoreResultsHarness, UpdateResultsCount, AddCommandResultsHarness } from "./ResultsParser.js";
import { GenericCommandResult } from "./Models/GenericCommandResult.js";
import { GetSelectedMachines } from "./DataGrid.js";

const $ = {} as any;

export var CommandCompletionDiv = document.querySelector("#commandCompletionDiv") as HTMLDivElement;
export var CommandInfoDiv = document.querySelector("#commandInfoDiv") as HTMLDivElement;
export var CommandModeSelect = document.querySelector("#commandModeSelect") as HTMLSelectElement;
export var ConsoleOutputDiv = document.querySelector("#consoleOutputDiv") as HTMLDivElement;
export var ConsoleTextArea = document.querySelector("#consoleTextArea") as HTMLTextAreaElement;
export var MachineGrid = document.querySelector("#machineGrid") as HTMLTableElement;
export var MachinesSelectedCount = document.querySelector("#machinesSelectedSpan") as HTMLSpanElement;
export var OnlineMachinesCount = document.querySelector("#onlineMachinesSpan") as HTMLSpanElement;
export var TotalMachinesCount = document.querySelector("#totalMachinesSpan") as HTMLSpanElement;
export var MeasurementCanvas = document.createElement("canvas");
export var MeasurementContext = MeasurementCanvas.getContext("2d");
export var TabContentWrapper = document.getElementById("tabContentWrapper") as HTMLDivElement;


export function AddConsoleOutput(strOutputMessage:string) {
    var outputBlock = document.createElement("div");
    outputBlock.classList.add("console-block");

    var prompt = document.createElement("div");
    prompt.classList.add("console-prompt");
    prompt.innerHTML = UserSettings.PromptString;

    var output = document.createElement("div");
    output.classList.add("console-output");
    output.innerHTML = strOutputMessage;

    outputBlock.appendChild(prompt);
    outputBlock.appendChild(output);

    ConsoleOutputDiv.appendChild(outputBlock);

    TabContentWrapper.scrollTop = TabContentWrapper.scrollHeight;
}
export function AddConsoleHTML(html: string) {
    var contentWrapper = document.createElement("div");
    contentWrapper.innerHTML = html;
    ConsoleOutputDiv.appendChild(contentWrapper);

    TabContentWrapper.scrollTop = TabContentWrapper.scrollHeight;
}
export function AddTransferHarness(transferID: string, totalMachines:number) {
    GetSelectedMachines()
    var transferHarness = document.createElement("div");
    transferHarness.id = transferID;
    transferHarness.classList.add("command-harness");
    transferHarness.innerHTML = `
        <div class="command-harness-title">
            File Transfer Status  |  
            Total Machines: ${totalMachines} |  
            Completed: <span id="${transferID}-completed">0</span>
        </div>`;
    AddConsoleHTML(transferHarness.outerHTML);
}
export function AutoSizeTextArea() {
    ConsoleTextArea.style.height = "1px";
    ConsoleTextArea.style.height = Math.max(12, ConsoleTextArea.scrollHeight) + "px";
}
export function FloatMessage(message: string) {
    var messageDiv = document.createElement("div");
    messageDiv.classList.add("float-message");
    messageDiv.innerHTML = message;
    document.body.appendChild(messageDiv);
    window.setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}
export function ShowModal(title: string, message: string, buttonsHTML: string = "", onDismissCallback: VoidFunction = null) {
    var modalID = Utilities.CreateGUID();
    var modalHTML = `<div id="${modalID}" class="modal fade" tabindex="-1" role="dialog">
          <div class="modal-dialog" role="document">
            <div class="modal-content">
              <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                  <span aria-hidden="true">&times;</span>
                </button>
                <h3 class="modal-title">${title}</h3>
              </div>
              <div class="modal-body">
                ${message}
              </div>
              <div class="modal-footer">
                ${buttonsHTML}
                <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
              </div>
            </div>
          </div>
        </div>`;
    var wrapperDiv = document.createElement("div");
    wrapperDiv.innerHTML = modalHTML;
    document.body.appendChild(wrapperDiv);
    $("#" + modalID).on("hidden.bs.modal", ev => {
        try {
            if (onDismissCallback) {
                onDismissCallback();
            }
        }
        finally {
            (ev.currentTarget as HTMLElement).parentElement.remove();
        }
    });
    $("#" + modalID)["modal"]();
};

export function ValidateInput(inputElement: HTMLInputElement) {
    if (!inputElement.checkValidity()) {
        $(inputElement)["tooltip"]({
            template: '<div class="tooltip" role="tooltip"><div class="arrow"></div><div class="tooltip-inner text-danger"></div></div>',
            title: inputElement.validationMessage
        });
        $(inputElement)["tooltip"]("show");
        return false;
    }
    else {
        return true;
    }
}