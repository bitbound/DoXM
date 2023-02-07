using DoXM_Client.Client;
using DoXM_Library.Services;
using Microsoft.AspNetCore.SignalR.Client;
using System;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Management.Automation;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;

namespace DoXM_Client.Services
{
    public class Updater
    {
        internal static async Task<string> GetLatestRCVersion()
        {
            var platform = "";
            if (OSUtils.IsWindows)
            {
                platform = "Windows";
            }
            else if (OSUtils.IsLinux)
            {
                platform = "Linux";
            }
            else
            {
                throw new Exception("Unsupported operating system.");
            }
            var response = await new HttpClient().GetAsync(Utilities.GetConnectionInfo().Host + $"/API/RCVersion/{platform}");
            return await response.Content.ReadAsStringAsync();
        }


        internal static void CheckForCoreUpdates()
        {
            try
            {
                if (Utilities.GetConnectionInfo().Host.Contains("localhost"))
                {
                    return;
                }

                if (OSUtils.IsLinux)
                {
                    return;
                }

                var platform = "";
                if (OSUtils.IsWindows)
                {
                    platform = "Windows";
                }
                else
                {
                    throw new Exception("Unsupported operating system.");
                }

                var wc = new WebClient();
                var latestVersion = wc.DownloadString(Utilities.GetConnectionInfo().Host + $"/API/CoreVersion/{platform}");
                var thisVersion = FileVersionInfo.GetVersionInfo("DoXM_Client.dll").FileVersion.ToString();
                if (thisVersion != latestVersion)
                {
                    Logger.Write($"Service Updater: Downloading update.  Current Version: {thisVersion}.  Latest Version: {latestVersion}.");
                    var fileName = OSUtils.CoreZipFileName;
                    var tempFile = Path.Combine(Path.GetTempPath(), fileName);
                    if (File.Exists(tempFile))
                    {
                        File.Delete(tempFile);
                    }
                    wc.DownloadFile(new Uri(Utilities.GetConnectionInfo().Host + $"/Downloads/{fileName}"), tempFile);
                    Logger.Write($"Service Updater: Extracting files.");
                   
                    
                    if (OSUtils.IsWindows)
                    {
                        var updateDir = Path.Combine(Path.GetTempPath(), "DoXM_Update");
                        ZipFile.ExtractToDirectory(tempFile, Path.Combine(Path.GetTempPath(), "DoXM_Update"), true);
                        var psi = new ProcessStartInfo()
                        {
                            FileName = Path.Combine(Path.GetTempPath(), "DoXM_Update", OSUtils.ClientExecutableFileName),
                            Arguments = "-update true",
                            Verb = "RunAs"
                        };

                        Logger.Write($"Service Updater: Launching new process.");
                        Process.Start(psi);
                    }
                    Environment.Exit(0);
                }
            }
            catch (Exception ex)
            {
                Logger.Write(ex);
            }
        }
        internal static void CoreUpdate()
        {
            try
            {
                if (OSUtils.IsLinux)
                {
                    return;
                }

                Logger.Write("Service Updater: Starting update.");
                var ps = PowerShell.Create();
                if (OSUtils.IsWindows)
                {
                    ps.AddScript(@"Get-Service | Where-Object {$_.Name -like ""DoXM_Service""} | Stop-Service -Force");
                    ps.Invoke();
                    ps.Commands.Clear();
                }

                ps.AddScript(@"
                    Get-Process | Where-Object {
                        $_.Name -like ""DoXM_Client"" -and 
                        $_.Id -ne [System.Diagnostics.Process]::GetCurrentProcess().Id
                    } | Stop-Process -Force");
                ps.Invoke();
                ps.Commands.Clear();

                Logger.Write("Service Updater: Gathering files.");
                var targetDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "DoXM");
 
                var itemList = Directory.GetFileSystemEntries(Path.Combine(Path.GetTempPath(), "DoXM_Update"));
                Logger.Write("Service Updater: Copying new files.");
                foreach (var item in itemList)
                {
                    try
                    {
                        var targetPath = Path.Combine(targetDir, Path.GetFileName(item));
                        if (File.Exists(targetPath))
                        {
                            File.Delete(targetPath);
                        }
                        else if (Directory.Exists(targetPath))
                        {
                            Directory.Delete(targetPath, true);
                        }
                        Directory.Move(item, targetPath);
                    }
                    catch (Exception ex)
                    {
                        Logger.Write(ex);
                    }
                }
                Logger.Write("Service Updater: Update completed.");

                var rcBinaryPath = Path.Combine(Utilities.AppDataDir, "remote_control", OSUtils.RemoteControlExecutableFileName);
                if (File.Exists(rcBinaryPath))
                {
                    Logger.Write("Removing remote control binary.");
                    File.Delete(rcBinaryPath);
                }
            }
            catch (Exception ex)
            {
                Logger.Write(ex);               
            }
            finally
            {
                Logger.Write("Service Updater: Starting service.");
                if (OSUtils.IsWindows)
                {
                    var ps = PowerShell.Create();
                    ps.AddScript("Start-Service -Name \"DoXM_Service\"");
                    ps.Invoke();
                }
                Environment.Exit(0);
            }
        }
        internal static async Task DownloadLatestRCVersion(HubConnection hubConnection, string requesterID)
        {
            var fileName = OSUtils.RemoteControlZipFileName;
            var wc = new WebClient();
            var progress = 0;
            wc.DownloadProgressChanged += async (sender, args) =>
            {
                if (args.ProgressPercentage - progress > 5)
                {
                    progress = args.ProgressPercentage;
                    await hubConnection.InvokeAsync("DisplayConsoleMessage", $"Download progress: {args.ProgressPercentage}%", requesterID);
                }
            };
            var done = false;
            wc.DownloadFileCompleted += async (sender, args) =>
            {
                await hubConnection.InvokeAsync("DisplayConsoleMessage", $"Download completed.", requesterID);
                done = true;
            };
            var rcDir = Directory.CreateDirectory(Path.Combine(Utilities.AppDataDir, "remote_control")).FullName;
            var downloadFilePath = Path.Combine(rcDir, fileName);
            if (File.Exists(downloadFilePath))
            {
                File.Delete(downloadFilePath);
            }
            wc.DownloadFileAsync(new Uri(Utilities.GetConnectionInfo().Host + $"/Downloads/{fileName}"), downloadFilePath);
            while (!done)
            {
                await Task.Delay(100);
            }
            await hubConnection.InvokeAsync("DisplayConsoleMessage", "Extracting files...", requesterID);
            if (OSUtils.IsWindows)
            {
                ZipFile.ExtractToDirectory(downloadFilePath, Path.Combine(Utilities.AppDataDir, "remote_control"), true);
            }
            if (OSUtils.IsLinux)
            {
                // ZipFile doesn't extract nested directories properly on Linux, so...
                Directory.SetCurrentDirectory(rcDir);
                Process.Start("apt-get", "install unzip").WaitForExit();
                Process.Start("unzip", $"-o {fileName}").WaitForExit();
                Process.Start("chmod", "755 " + Path.Combine(Utilities.AppDataDir, "remote_control", "doxm_remote_control")).WaitForExit();
            }
        }
    }
}
