using System;
using System.Diagnostics;
using System.Runtime.InteropServices;

namespace DoXM_Library.Services
{
    public static class OSUtils
    {
        public static bool IsLinux
        {
            get
            {
                return RuntimeInformation.IsOSPlatform(OSPlatform.Linux);
            }
        }

        public static bool IsWindows
        {
            get
            {
                return RuntimeInformation.IsOSPlatform(OSPlatform.Windows);
            }
        }
        public static string ClientExecutableFileName
        {
            get
            {
                string fileExt = "";
                if (IsWindows)
                {
                    fileExt = "DoXM_Client.exe";
                }
                else if (IsLinux)
                {
                    fileExt = "DoXM_Client";
                }
                return fileExt;
            }
        }
        public static string RemoteControlExecutableFileName
        {
            get
            {
                if (IsWindows)
                {
                    return "DoXM Remote Control.exe";
                }
                else if (IsLinux)
                {
                    return "doxm_remote_control";
                }
                else
                {
                    throw new Exception("Unsupported operating system.");
                }
            }
        }

        public static string RemoteControlZipFileName
        {
            get
            {
                if (IsWindows)
                {
                    if (Environment.Is64BitOperatingSystem)
                    {
                        return "RC-Winx64.zip";
                    }
                    else
                    {
                        return "RC-Winx86.zip";
                    }

                }
                else if (OSUtils.IsLinux)
                {
                    return "RC-Linux.zip";
                }
                else
                {
                    throw new Exception("Unsupported operating system.");
                }
            }
        }
        public static string CoreZipFileName
        {
            get
            {
                if (IsWindows)
                {
                    if (Environment.Is64BitOperatingSystem)
                    {
                        return "DoXM-Win10-x64.zip";
                    }
                    else
                    {
                        return "DoXM-Win10-x86.zip";
                    }

                }
                else if (OSUtils.IsLinux)
                {
                    return "DoXM-linux.zip";
                }
                else
                {
                    throw new Exception("Unsupported operating system.");
                }
            }
        }
        public static OSPlatform GetPlatform()
        {
            if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
            {
                return OSPlatform.Windows;
            }
            else if (RuntimeInformation.IsOSPlatform(OSPlatform.Linux))
            {
                return OSPlatform.Linux;
            }
            else if (RuntimeInformation.IsOSPlatform(OSPlatform.OSX))
            {
                return OSPlatform.OSX;
            }
            else
            {
                return OSPlatform.Create("Unknown");
            }
        }

        public static string StartProcessWithResults(string command, string arguments)
        {
            var psi = new ProcessStartInfo(command, arguments);
            psi.WindowStyle = ProcessWindowStyle.Hidden;
            psi.Verb = "RunAs";
            psi.UseShellExecute = false;
            psi.RedirectStandardOutput = true;

            var proc = new Process();
            proc.StartInfo = psi;

            proc.Start();
            proc.WaitForExit();

            return proc.StandardOutput.ReadToEnd();
        }
    }
}
