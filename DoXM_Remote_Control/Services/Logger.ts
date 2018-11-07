import { tmpdir } from "os";
import { appendFileSync, statSync, readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

export function WriteLog(message: string) {
    var logPath = join(tmpdir(), "\DoXM_RC_Logs.txt");
    if (existsSync(logPath)) {
        while (statSync(logPath).size > 1000000) {
            var content = readFileSync(logPath, { encoding: "utf8" });
            writeFileSync(logPath, content.substring(1000));
        }
    }
    var entry = `${(new Date()).toLocaleString()}  -  ${message}\r\n`;
    appendFileSync(logPath, entry);
}