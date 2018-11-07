using DoXM_Library.Models;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Text;
using System.Threading;
using System.Collections.Concurrent;

namespace DoXM_Client.Services
{
    public class Bash
    {
        private static ConcurrentDictionary<string, Bash> Sessions { get; set; } = new ConcurrentDictionary<string, Bash>();
        private System.Timers.Timer ProcessIdleTimeout { get; set; }
        public static Bash GetCurrent(string connectionID)
        {
            if (Sessions.ContainsKey(connectionID))
            {
                var bash = Sessions[connectionID];
                bash.ProcessIdleTimeout.Stop();
                bash.ProcessIdleTimeout.Start();
                return bash;
            }
            else
            {
                var bash = new Bash();
                bash.ProcessIdleTimeout = new System.Timers.Timer(600000); // 10 minutes.
                bash.ProcessIdleTimeout.AutoReset = false;
                bash.ProcessIdleTimeout.Elapsed += (sender, args) =>
                {
                    Bash outResult;
                    while (!Sessions.TryRemove(connectionID, out outResult))
                    {
                        System.Threading.Thread.Sleep(1000);
                    }
                    outResult.BashProc.Kill();
                };
                while (!Sessions.TryAdd(connectionID, bash))
                {
                    System.Threading.Thread.Sleep(1000);
                }
                bash.ProcessIdleTimeout.Start();
                return bash;
            }
        }
        
        private Process BashProc { get; }

        private Bash()
        {
            var psi = new ProcessStartInfo("cmd.exe");
            psi.WindowStyle = ProcessWindowStyle.Hidden;
            psi.Verb = "RunAs";
            psi.UseShellExecute = false;
            psi.RedirectStandardError = true;
            psi.RedirectStandardInput = true;
            psi.RedirectStandardOutput = true;

            BashProc = new Process();
            BashProc.StartInfo = psi;
            BashProc.ErrorDataReceived += CMDProc_ErrorDataReceived;
            BashProc.OutputDataReceived += CMDProc_OutputDataReceived;

            BashProc.Start();

            BashProc.BeginErrorReadLine();
            BashProc.BeginOutputReadLine();
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
            lock (BashProc)
            {
                LastInputID = commandID;
                OutputDone = false;
                BashProc.StandardInput.WriteLine(input);
                BashProc.StandardInput.WriteLine("echo " + commandID);
                while (!OutputDone)
                {
                    Thread.Sleep(1);
                }
            }
            return new GenericCommandResult()
            {
                CommandContextID = commandID,
                MachineID = Utilities.GetConnectionInfo().MachineID,
                CommandType = "Bash",
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
