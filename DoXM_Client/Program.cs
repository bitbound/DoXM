using DoXM_Client.Client;
using DoXM_Client.Services;
using DoXM_Library.Services;
using DoXM_Library.Win32;
using DoXM_Library.Win32_Classes;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.ServiceProcess;
using System.Threading.Tasks;

namespace DoXM_Client
{
    public class Program
    {
        static void Main(string[] args)
        {
            AppDomain.CurrentDomain.UnhandledException += CurrentDomain_UnhandledException;
            SetWorkingDirectory();
            var argDict = ProcessArgs(args);

            JsonConvert.DefaultSettings = () =>
            {
                var settings = new JsonSerializerSettings();
                settings.Error = (sender, arg) =>
                {
                    arg.ErrorContext.Handled = true;
                };
                return settings;
            };

            if (argDict.TryGetValue("mode", out var mode) && mode == "remotecontrol")
            {
                var rcBinaryPath = Path.Combine(Utilities.AppDataDir, "remote_control", OSUtils.RemoteControlExecutableFileName);
                var procInfo = new ADVAPI32.PROCESS_INFORMATION();
                var desktop = Win32Interop.GetCurrentDesktop();
                Logger.Write("Desktop is " + desktop);
                Win32Interop.OpenInteractiveProcess(rcBinaryPath + $" -mode unattended -requester {argDict["requester"]} -serviceid {argDict["serviceid"]} -desktop {desktop} -hostname {Utilities.GetConnectionInfo().Host.Split("//").Last()}", $"{desktop}", true, out procInfo);
                Environment.Exit(0);
            }

            if (OSUtils.IsWindows)
            {
                //ClientSocket.Connect();
                ServiceBase.Run(new WindowsService());
            }
            else
            {
                ClientSocket.Connect();
            }

            if (argDict.ContainsKey("update"))
            {
                Updater.CoreUpdate();
            }
           
            while (true)
            {
                Console.Read();
            }
        }

        private static Dictionary<string,string> ProcessArgs(string[] args)
        {
            var argDict = new Dictionary<string, string>();
            
            for (var i = 0; i < args.Length; i += 2)
            {
                var key = args?[i];
                if (key != null)
                {
                    key = key.Trim().Replace("-", "").ToLower();
                    var value = args?[i + 1];
                    if (value != null)
                    {
                        argDict[key] = args[i + 1].Trim();
                    }
                }
               
            }
            return argDict;
        }

        private static void SetWorkingDirectory()
        {
            var assemblyPath = System.Reflection.Assembly.GetExecutingAssembly().Location;
            var assemblyDir = Path.GetDirectoryName(assemblyPath);
            Directory.SetCurrentDirectory(assemblyDir);
        }

        private static void CurrentDomain_UnhandledException(object sender, UnhandledExceptionEventArgs e)
        {
            Logger.Write(e.ExceptionObject as Exception);
            if (OSUtils.IsWindows)
            {
                // Remove Secure Attention Sequence policy to allow app to simulate Ctrl + Alt + Del.
                var subkey = Microsoft.Win32.Registry.LocalMachine.OpenSubKey(@"SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System", true);
                if (subkey.GetValue("SoftwareSASGeneration") != null)
                {
                    subkey.DeleteValue("SoftwareSASGeneration");
                }
            }
        }
    }
}
