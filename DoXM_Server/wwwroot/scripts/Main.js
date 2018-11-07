import * as BrowserSockets from "./BrowserSockets.js";
import * as UI from "./UI.js";
import * as CommandProcessor from "./CommandProcessor.js";
import { DoXMCommands } from "./Commands/DoXMCommands.js";
import { CMDCommands } from "./Commands/CMDCommands.js";
import { PSCoreCommands } from "./Commands/PSCoreCommands.js";
import * as Utilities from "./Utilities.js";
import * as DataGrid from "./DataGrid.js";
import { UserSettings } from "./UserSettings.js";
import { WinPSCommands } from "./Commands/WinPSCommands.js";
import { ApplyInputEventHandlers } from "./InputEventHandlers.js";
var doxm = {
    Commands: {
        "DoXM": DoXMCommands,
        "WinPS": WinPSCommands,
        "PSCore": PSCoreCommands,
        "CMD": CMDCommands
    },
    CommandProcessor: CommandProcessor,
    DataGrid: DataGrid,
    UI: UI,
    Utilities: Utilities,
    Sockets: BrowserSockets,
    Storage: Storage,
    UserSettings: UserSettings,
    Init() {
        UI.ConsoleTextArea.focus();
        ApplyInputEventHandlers();
        BrowserSockets.Connect();
    }
};
export const Main = doxm;
window["DoXM"] = doxm;
window.onload = (ev) => {
    doxm.Init();
    document.querySelector(".loading-frame").remove();
    document.querySelector(".work-area").classList.remove("hidden");
};
//# sourceMappingURL=Main.js.map