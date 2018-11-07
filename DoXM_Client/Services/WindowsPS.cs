using DoXM_Library.Models;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Diagnostics;
using System.Text;
using System.Threading;

namespace DoXM_Client.Services
{
    public class WindowsPS
    {
        private static ConcurrentDictionary<string, WindowsPS> Sessions { get; set; } = new ConcurrentDictionary<string, WindowsPS>();
        private System.Timers.Timer ProcessIdleTimeout { get; set; }
        public static WindowsPS GetCurrent(string connectionID)
        {
            if (Sessions.ContainsKey(connectionID))
            {
                var winPS = Sessions[connectionID];
                winPS.ProcessIdleTimeout.Stop();
                winPS.ProcessIdleTimeout.Start();
                return winPS;
            }
            else
            {
                var winPS = new WindowsPS();
                winPS.ProcessIdleTimeout = new System.Timers.Timer(600000); // 10 minutes.
                winPS.ProcessIdleTimeout.AutoReset = false;
                winPS.ProcessIdleTimeout.Elapsed += (sender, args) =>
                {
                    WindowsPS outResult;
                    while (!Sessions.TryRemove(connectionID, out outResult))
                    {
                        System.Threading.Thread.Sleep(1000);
                    }
                    outResult.PSProc.Kill();
                };
                while (!Sessions.TryAdd(connectionID, winPS))
                {
                    System.Threading.Thread.Sleep(1000);
                }
                winPS.ProcessIdleTimeout.Start();
                return winPS;
            }
        }
        private Process PSProc { get; }

        private WindowsPS()
        {
            var psi = new ProcessStartInfo("powershell.exe");
            psi.WindowStyle = ProcessWindowStyle.Hidden;
            psi.Verb = "RunAs";
            psi.RedirectStandardError = true;
            psi.RedirectStandardInput = true;
            psi.RedirectStandardOutput = true;

            PSProc = new Process();
            PSProc.StartInfo = psi;
            PSProc.EnableRaisingEvents = true;
            PSProc.ErrorDataReceived += CMDProc_ErrorDataReceived;
            PSProc.OutputDataReceived += CMDProc_OutputDataReceived;

            PSProc.Start();

            PSProc.BeginErrorReadLine();
            PSProc.BeginOutputReadLine();
        }

        private void CMDProc_OutputDataReceived(object sender, DataReceivedEventArgs e)
        {
            if (e?.Data?.Contains(LastInputID) == true)
            {
                OutputDone = true;
            }
            else if (!OutputDone)
            {
                StandardOut += e.Data + Environment.NewLine;
            }
        }

        private void CMDProc_ErrorDataReceived(object sender, DataReceivedEventArgs e)
        {
            if (e?.Data != null)
            {
                ErrorOut += e.Data + Environment.NewLine;
            }
        }

        public GenericCommandResult WriteInput(string input, string commandID)
        {
            StandardOut = "";
            ErrorOut = "";
            lock (PSProc)
            {
                LastInputID = commandID;
                OutputDone = false;
                PSProc.StandardInput.WriteLine(input);
                PSProc.StandardInput.WriteLine("echo " + commandID);
                while (!OutputDone)
                {
                    Thread.Sleep(1);
                }
            }

            return new GenericCommandResult()
            {
                CommandContextID = commandID,
                MachineID = Utilities.GetConnectionInfo().MachineID,
                CommandType = "WinPS",
                StandardOutput = StandardOut,
                ErrorOutput = ErrorOut
            };
        }

        private string LastInputID { get; set; }
        private bool OutputDone { get; set; }
        private string StandardOut { get; set; }
        private string ErrorOut { get; set; }
    }
}
