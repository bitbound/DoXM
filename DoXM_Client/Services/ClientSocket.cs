﻿using DoXM_Client.Client;
using DoXM_Library.Models;
using DoXM_Library.Services;
using DoXM_Library.Win32;
using DoXM_Library.Win32_Classes;
using Microsoft.AspNetCore.SignalR.Client;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net;
using System.Text;
using System.Threading.Tasks;
using System.Timers;

namespace DoXM_Client.Services
{
    public static class ClientSocket
    {
        public static bool IsServerVerified { get; set; }
        public static async Task Connect()
        {
            while (true)
            {
                try
                {
                    ConnectionInfo = Utilities.GetConnectionInfo();

                    if (HubConnection is not null)
                    {
                        await HubConnection.DisposeAsync();
                    }
                    HubConnection = new HubConnectionBuilder()
                        .WithUrl(ConnectionInfo.Host + "/DeviceHub", options => {
                            if (!string.IsNullOrWhiteSpace(ConnectionInfo.ProxyUrl))
                            {
                                options.Proxy = new WebProxy(ConnectionInfo.ProxyUrl, ConnectionInfo.ProxyPort);
                            }
                        })
                        .WithAutomaticReconnect(new RetryPolicy())
                        .Build();
                    HubConnection.Reconnected += HubConnection_Reconnected;


                    RegisterMessageHandlers(HubConnection);

                    await HubConnection.StartAsync();

                    var machine = Machine.Create(ConnectionInfo);

                    await HubConnection.InvokeAsync("MachineCameOnline", machine);

                    if (string.IsNullOrWhiteSpace(ConnectionInfo.ServerVerificationToken))
                    {
                        IsServerVerified = true;
                        ConnectionInfo.ServerVerificationToken = Guid.NewGuid().ToString();
                        await HubConnection.InvokeAsync("SetServerVerificationToken", ConnectionInfo.ServerVerificationToken);
                        Utilities.SaveConnectionInfo(ConnectionInfo);
                        Updater.CheckForCoreUpdates();
                    }
                    else
                    {
                        await HubConnection.InvokeAsync("SendServerVerificationToken");
                    }

                    HeartbeatTimer?.Stop();
                    HeartbeatTimer = new Timer(300000);
                    HeartbeatTimer.Elapsed += HeartbeatTimer_Elapsed;
                    HeartbeatTimer.Start();
                    Logger.Write("Connected to server.");
                    break;
                }
                catch (Exception ex)
                {
                    Logger.Write(ex);
                    await Task.Delay(5_000);
                }
            }
        }

        private static async Task HubConnection_Reconnected(string arg)
        {
            var machine = Machine.Create(ConnectionInfo);
            await HubConnection.InvokeAsync("MachineCameOnline", machine);
            Updater.CheckForCoreUpdates();
        }

        private static void RegisterMessageHandlers(HubConnection hubConnection)
        {
            hubConnection.On("ExecuteCommand", (async (string mode, string command, string commandID, string senderConnectionID) =>
            {
                await ExecuteCommand(mode, command, commandID, senderConnectionID);
            }));
            hubConnection.On("TransferFiles", async (string transferID, List<string> fileIDs, string requesterID) =>
            {
                Logger.Write("File transfer started.");
                var connectionInfo = Utilities.GetConnectionInfo();
                var sharedFilePath = Directory.CreateDirectory(Path.Combine(
                        Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData),
                        "DoXM",
                        "SharedFiles"
                    )).FullName;
                
                foreach (var fileID in fileIDs)
                {
                    var url = $"{connectionInfo.Host}/API/FileSharing/{fileID}";
                    var wr = WebRequest.CreateHttp(url);
                    var response = await wr.GetResponseAsync();
                    var cd = response.Headers["Content-Disposition"];
                    var filename = cd.Split(";").FirstOrDefault(x => x.Trim().StartsWith("filename")).Split("=")[1];
                    using (var rs = response.GetResponseStream())
                    {
                        using (var fs = new FileStream(Path.Combine(sharedFilePath, filename), FileMode.Create))
                        {
                            rs.CopyTo(fs);
                        }
                    }
                }
                await HubConnection.InvokeAsync("TransferCompleted", transferID, requesterID);
            });
            hubConnection.On("DeployScript", async (string mode, string fileID, string commandContextID, string requesterID) => {
                var connectionInfo = Utilities.GetConnectionInfo();
                var sharedFilePath = Directory.CreateDirectory(Path.Combine(
                        Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData),
                        "DoXM",
                        "SharedFiles"
                    )).FullName;
                var webClient = new WebClient();

                var url = $"{connectionInfo.Host}/API/FileSharing/{fileID}";
                var wr = WebRequest.CreateHttp(url);
                var response = await wr.GetResponseAsync();
                var cd = response.Headers["Content-Disposition"];
                var filename = cd.Split(";").FirstOrDefault(x => x.Trim().StartsWith("filename")).Split("=")[1];
                using (var rs = response.GetResponseStream())
                {
                    using (var sr = new StreamReader(rs))
                    {
                        var result = await sr.ReadToEndAsync();
                        await ExecuteCommand(mode, result, commandContextID, requesterID);
                    }
                }
            });
            hubConnection.On("UninstallClient", () =>
            {
                Uninstaller.UninstallClient();
            });
            hubConnection.On("LaunchRCInNewDesktop", async (string[] viewerIDs, string serviceID, string desktop) =>
            {
                if (!IsServerVerified)
                {
                    Logger.Write("Remote control attempted before server was verified.");
                    Uninstaller.UninstallClient();
                    return;
                }
                var rcBinaryPath = Path.Combine(Utilities.AppDataDir, "remote_control", OSUtils.RemoteControlExecutableFileName);
                var procInfo = new ADVAPI32.PROCESS_INFORMATION();
                var processResult = Win32Interop.OpenInteractiveProcess(rcBinaryPath + $" -mode desktopswitch -viewers {String.Join(",",viewerIDs)} -serviceid {serviceID} -desktop {desktop} -hostname {Utilities.GetConnectionInfo().Host.Split("//").Last()}", desktop, true, out procInfo);
                if (!processResult)
                {
                    foreach (var viewer in viewerIDs)
                    {
                        await hubConnection.InvokeAsync("DesktopSwitchFailed", viewer);
                    }
                }
            });
            hubConnection.On("RemoteControl", async (string requesterID, string serviceID) =>
            {
                if (!IsServerVerified)
                {
                    Logger.Write("Remote control attempted before server was verified.");
                    Uninstaller.UninstallClient();
                    return;
                }
                try
                {
                    //var latestVersion = await Updater.GetLatestRCVersion();
                    //var shouldUpdate = false;

                    //if (!File.Exists(rcBinaryPath))
                    //{
                    //    shouldUpdate = true;
                    //}
                    //else
                    //{
                    //    var fileVersion = FileVersionInfo.GetVersionInfo(rcBinaryPath)?.FileVersion;
                    //    if (!string.IsNullOrWhiteSpace(fileVersion) && fileVersion?.ToString() != latestVersion)
                    //    {
                    //        shouldUpdate = true;
                    //    }
                    //}
                    
                    var rcBinaryPath = Path.Combine(Utilities.AppDataDir, "remote_control", OSUtils.RemoteControlExecutableFileName);
                    if (!File.Exists(rcBinaryPath))
                    {
                        await hubConnection.InvokeAsync("DisplayConsoleMessage", "A new version needs to be downloaded on the client machine.", requesterID);
                        await Updater.DownloadLatestRCVersion(hubConnection, requesterID);
                    }
                    await hubConnection.InvokeAsync("DisplayConsoleMessage", $"Starting remote control...", requesterID);
                    if (OSUtils.IsWindows)
                    {
                        var doxmClient = System.Reflection.Assembly.GetExecutingAssembly().Location.Replace(".dll", ".exe");
                        var procInfo = new ADVAPI32.PROCESS_INFORMATION();
                        Win32Interop.OpenInteractiveProcess(doxmClient + $" -mode remotecontrol -requester {requesterID} -serviceid {serviceID}", $"default", true, out procInfo);
                    }
                    else if (OSUtils.IsLinux)
                    {
                        var users = OSUtils.StartProcessWithResults("users", "");
                        var username = users?.Split()?.FirstOrDefault()?.Trim();

                        Process.Start("sudo", $"-u {username} {rcBinaryPath} -mode unattended -requester {requesterID} -serviceid {serviceID} -desktop default -hostname {Utilities.GetConnectionInfo().Host.Split("//").Last()}");
                    }
                }
                catch
                {
                    await hubConnection.InvokeAsync("DisplayConsoleMessage", "Remote control failed to download or start on target machine.", requesterID);
                    throw;
                }
            });
            hubConnection.On("CtrlAltDel", () =>
            {
                User32.SendSAS(false);
            });
          
            hubConnection.On("ServerVerificationToken", (string verificationToken) =>
            {
                if (verificationToken == Utilities.GetConnectionInfo().ServerVerificationToken)
                {
                    IsServerVerified = true;
                    Updater.CheckForCoreUpdates();
                }
                else
                {
                    Logger.Write($"Server sent an incorrect verification token.  Token Sent: {verificationToken}.");
                    Uninstaller.UninstallClient();
                    return;
                }
            });
        }

        private static async Task ExecuteCommand(string mode, string command, string commandID, string senderConnectionID)
        {
            if (!IsServerVerified)
            {
                Logger.Write($"Command attempted before server was verified.  Mode: {mode}.  Command: {command}.  Sender: {senderConnectionID}");
                Uninstaller.UninstallClient();
                return;
            }
            try
            {
                switch (mode.ToLower())
                {
                    case "pscore":
                        {
                            var psCoreResult = PSCore.GetCurrent(senderConnectionID).WriteInput(command, commandID);
                            var serializedResult = JsonConvert.SerializeObject(psCoreResult);
                            if (Encoding.UTF8.GetBytes(serializedResult).Length > 400000)
                            {
                                SendResultsViaAjax("PSCore", psCoreResult);
                                await HubConnection.InvokeAsync("PSCoreResultViaAjax", commandID);
                            }
                            else
                            {
                                await HubConnection.InvokeAsync("PSCoreResult", psCoreResult);
                            }
                            break;
                        }

                    case "winps":
                        if (OSUtils.IsWindows)
                        {
                            var result = WindowsPS.GetCurrent(senderConnectionID).WriteInput(command, commandID);
                            var serializedResult = JsonConvert.SerializeObject(result);
                            if (Encoding.UTF8.GetBytes(serializedResult).Length > 400000)
                            {
                                SendResultsViaAjax("WinPS", result);
                                await HubConnection.InvokeAsync("WinPSResultViaAjax", commandID);
                            }
                            else
                            {
                                await HubConnection.InvokeAsync("CommandResult", result);
                            }
                        }
                        break;
                    case "cmd":
                        if (OSUtils.IsWindows)
                        {
                            var result = CMD.GetCurrent(senderConnectionID).WriteInput(command, commandID);
                            var serializedResult = JsonConvert.SerializeObject(result);
                            if (Encoding.UTF8.GetBytes(serializedResult).Length > 400000)
                            {
                                SendResultsViaAjax("CMD", result);
                                await HubConnection.InvokeAsync("CMDResultViaAjax", commandID);
                            }
                            else
                            {
                                await HubConnection.InvokeAsync("CommandResult", result);
                            }
                        }
                        break;
                    case "bash":
                        if (OSUtils.IsLinux)
                        {
                            var result = Bash.GetCurrent(senderConnectionID).WriteInput(command, commandID);
                            var serializedResult = JsonConvert.SerializeObject(result);
                            if (Encoding.UTF8.GetBytes(serializedResult).Length > 400000)
                            {
                                SendResultsViaAjax("Bash", result);
                            }
                            else
                            {
                                await HubConnection.InvokeAsync("CommandResult", result);
                            }
                        }
                        break;
                    default:
                        break;
                }
            }
            catch (Exception ex)
            {
                Logger.Write(ex);
                await HubConnection.InvokeAsync("DisplayConsoleMessage", $"There was an error executing the command.  It has been logged on the client machine.", senderConnectionID);
            }
        }

        private static void SendResultsViaAjax(string resultType, object result)
        {
            var targetURL = Utilities.GetConnectionInfo().Host + $"/API/Commands/{resultType}";
            var webRequest = WebRequest.CreateHttp(targetURL);
            webRequest.Method = "POST";

            using (var sw = new StreamWriter(webRequest.GetRequestStream()))
            {
                sw.Write(JsonConvert.SerializeObject(result));
            }
            webRequest.GetResponse();
        }

        private static void HeartbeatTimer_Elapsed(object sender, ElapsedEventArgs e)
        {
            SendHeartbeat();
        }

        public static void SendHeartbeat()
        {
            var currentInfo = Machine.Create(ConnectionInfo);
            HubConnection.InvokeAsync("MachineHeartbeat", currentInfo);
        }
        private static HubConnection HubConnection { get; set; }

        private static ConnectionInfo ConnectionInfo { get; set; }
        public static Timer HeartbeatTimer { get; private set; }

        private class RetryPolicy : IRetryPolicy
        {
            public TimeSpan? NextRetryDelay(RetryContext retryContext)
            {
                return TimeSpan.FromSeconds(5);
            }
        }
    }
}
