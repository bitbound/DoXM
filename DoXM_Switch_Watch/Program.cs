using DoXM_Switch_Watch.Win32;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Timers;

namespace DoXM_Switch_Watch
{
    class Program
    {
        private static string DesktopName { get; set; }
        static void Main(string[] args)
        {
            DesktopName = (args.Length > 0 ? args[0] : Win32Interop.GetCurrentDesktop()).ToLower();
            while (Process.GetProcesses().Any(x=>x.ProcessName.ToLower().Contains("doxm remote control")))
            {
                var currentDesktop = Win32Interop.GetCurrentDesktop().ToLower();
                if (currentDesktop != DesktopName)
                {
                    DesktopName = currentDesktop;
                    Console.WriteLine(DesktopName);
                    Environment.Exit(0);
                }
                System.Threading.Thread.Sleep(100);
            }
        }
    }
}
