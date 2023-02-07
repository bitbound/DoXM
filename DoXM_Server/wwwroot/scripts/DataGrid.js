import * as UI from "./UI.js";
import { Main } from "./Main.js";
import { MachineGrid } from "./UI.js";
import * as BrowserSockets from "./BrowserSockets.js";
export var DataSource = new Array();
export function AddOrUpdateMachines(machines) {
    machines.forEach(x => {
        AddOrUpdateMachine(x);
    });
}
export function AddOrUpdateMachine(machine) {
    var _a, _b;
    var existingIndex = DataSource.findIndex(x => x.ID == machine.ID);
    if (existingIndex > -1) {
        DataSource[existingIndex] = machine;
    }
    else {
        DataSource.push(machine);
    }
    var tableBody = document.querySelector("#" + Main.UI.MachineGrid.id + " tbody");
    var recordRow = document.getElementById(machine.ID);
    if (recordRow == null) {
        recordRow = document.createElement("tr");
        recordRow.classList.add("record-row");
        recordRow.id = machine.ID;
        tableBody.appendChild(recordRow);
        recordRow.addEventListener("click", (e) => {
            e.currentTarget.classList.toggle("row-selected");
            UpdateMachineCounts();
        });
    }
    recordRow.innerHTML = `
                    <td>${String(machine.IsOnline)
        .replace("true", "<span class='glyphicon glyphicon-ok'></span>")
        .replace("false", "<span class='glyphicon glyphicon-remove'></span>")}</td>
                    <td>${machine.MachineName}</td>
                    <td>${machine.CurrentUser}</td>
                    <td>${(_a = new Date(machine.LastOnline)) === null || _a === void 0 ? void 0 : _a.toLocaleDateString()}</td>
                    <td>${machine.Platform}</td>
                    <td>${machine.OSDescription}</td>
                    <td>${Math.round(machine.FreeStorage * 100)}%</td>
                    <td>${(_b = machine.TotalStorage) === null || _b === void 0 ? void 0 : _b.toLocaleString()}</td>
                    <td>${Math.round(machine.FreeMemory * 100)}%</td>
                    <td>${machine.TotalMemory.toLocaleString()}</td>
                    <td><input type="text" class="machine-tag" value="${machine.Tags}" /></td>`;
    recordRow.querySelector(".machine-tag").onchange = (ev) => {
        var newTag = ev.currentTarget.value;
        DataSource.find(x => x.ID == machine.ID).Tags = newTag;
        BrowserSockets.Connection.invoke("UpdateTags", machine.ID, newTag);
    };
    UpdateMachineCounts();
}
export function GetSelectedMachines() {
    var machines = new Array();
    MachineGrid.querySelectorAll(".row-selected").forEach(row => {
        machines.push(DataSource.find(x => x.ID == row.id));
    });
    return machines;
}
;
export function ClearAllData() {
    DataSource.splice(0, DataSource.length);
    UI.MachineGrid.querySelectorAll(".record-row").forEach(row => {
        row.remove();
    });
    UpdateMachineCounts();
}
export function RefreshGrid() {
    ClearAllData();
    var xhr = new XMLHttpRequest();
    xhr.open("get", "/API/Machines");
    xhr.onerror = () => {
        UI.ShowModal("Request Failure", "Failed to retrieve machine data.  Please refresh your connection or contact support.");
    };
    xhr.onload = (e) => {
        if (xhr.status == 200) {
            var machines = JSON.parse(xhr.responseText);
            if (machines.length == 0) {
                UI.AddConsoleOutput("It looks like you don't have the DoXM service installed on any machines.  You can get the install script from the Client Downloads page.");
            }
            else {
            }
            AddOrUpdateMachines(machines);
        }
        else {
            UI.ShowModal("Request Failure", "Failed to retrieve machine data.  Please refresh your connection or contact support.");
        }
    };
    xhr.send();
}
export function ToggleSelectAll() {
    var currentlySelected = MachineGrid.querySelectorAll(".row-selected:not(.hidden)");
    if (currentlySelected.length > 0) {
        currentlySelected.forEach(elem => {
            elem.classList.remove("row-selected");
        });
    }
    else {
        MachineGrid.querySelectorAll(".record-row:not(.hidden)").forEach(elem => {
            elem.classList.add("row-selected");
        });
    }
    UpdateMachineCounts();
}
export function UpdateMachineCounts() {
    UI.MachinesSelectedCount.innerText = UI.MachineGrid.querySelectorAll(".row-selected").length.toString();
    UI.OnlineMachinesCount.innerText = DataSource.filter(x => x.IsOnline).length.toString();
    UI.TotalMachinesCount.innerText = DataSource.length.toString();
    if (DataSource.some(x => x.IsOnline == false &&
        document.getElementById(x.ID).classList.contains("row-selected"))) {
        UI.AddConsoleOutput(`Your selection contains offline computers.  Your commands will only be sent to those that are online.`);
    }
}
//# sourceMappingURL=DataGrid.js.map