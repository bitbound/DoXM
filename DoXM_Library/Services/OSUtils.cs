using System;
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
        public static string BinaryFileExt
        {
            get
            {
                string fileExt = "";
                if (IsWindows)
                {
                    fileExt = "exe";
                }
                else if (IsLinux)
                {
                    fileExt = "appimage";
                }
                return fileExt;
            }
        }
        public static string RemoteControlBinaryFileName
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
                        return "DoXM-win10-x64.zip";
                    }
                    else
                    {
                        return "DoXM-win10-x86.zip";
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
    }
}
