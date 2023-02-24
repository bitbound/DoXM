﻿using DoXM_Library.Models;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;

namespace DoXM_Client.Services
{
    public static class Utilities
    {


        public static ConnectionInfo GetConnectionInfo()
        {
            if (!File.Exists("ConnectionInfo.json"))
            {
                if (Debugger.IsAttached)
                {
                    var connectionInfo = new ConnectionInfo()
                    {
                        Host = "https://localhost:5001",
                        MachineID = Guid.NewGuid().ToString()
                    };
                    SaveConnectionInfo(connectionInfo);
                }
                else
                {
                    throw new Exception("No connection info available.  Please create ConnectionInfo.json file with appropriate values.");
                }
            }
            return JsonConvert.DeserializeObject<ConnectionInfo>(File.ReadAllText("ConnectionInfo.json"));
        }

        public static string AppDataDir
        {
            get
            {
                return Directory.CreateDirectory(
                    Path.Combine(
                        Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), 
                        "DoXM")
                    ).FullName;
            }
        }

        public static void KillProcs()
        {
            var procs = Process.GetProcessesByName("DoXM_Client_Win").Where(proc => proc.Id != Process.GetCurrentProcess().Id);
            foreach (var proc in procs)
            {
                proc.Kill();
            }
        }

        public static Dictionary<string, string> ProcessArgs(string[] args)
        {
            var argDict = new Dictionary<string, string>();
            var argString = String.Join(" ", args).ToLower();
            var argArray = argString.Split("-".ToCharArray(), StringSplitOptions.RemoveEmptyEntries);
            foreach (var arg in argArray)
            {
                var split = arg.Split(" ".ToCharArray(), 2, StringSplitOptions.RemoveEmptyEntries);
                var key = split[0];
                var value = split.Length == 2 ? split[1] : "";
                argDict.Add(key, value);
            }
            return argDict;
        }

        public static void SaveConnectionInfo(ConnectionInfo connectionInfo)
        {
            File.WriteAllText("ConnectionInfo.json", JsonConvert.SerializeObject(connectionInfo));
        }
    }
}
