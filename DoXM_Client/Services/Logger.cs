using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DoXM_Client.Client
{
    public static class Logger
    {
        private static string LogDir
        {
            get
            {
                if (OperatingSystem.IsWindows())
                {
                    return Directory.CreateDirectory(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "DoXM", "Logs")).FullName;
                }
                else
                {
                    return Directory.CreateDirectory("/var/log/doxm").FullName;
                }
            }
        }
        private static string LogPath => Path.Combine(LogDir, $"ClientLog_{DateTime.Now:yyyy-MM-dd}.log");

        public static void Write(string message)
        {
            Console.WriteLine(message);

            var jsoninfo = new
            {
                Type = "Info",
                Timestamp = DateTime.Now.ToString(),
                Message = message
            };
            if (File.Exists(LogPath))
            {
                var fi = new FileInfo(LogPath);
                while (fi.Length > 1000000)
                {
                    var content = File.ReadAllLines(LogPath);
                    File.WriteAllLines(LogPath, content.Skip(10));
                    fi = new FileInfo(LogPath);
                }
            }
            File.AppendAllText(LogPath, JsonConvert.SerializeObject(jsoninfo) + Environment.NewLine);
        }

        public static void Write(Exception ex)
        {
            Console.WriteLine($"Exception: {ex.Message}");
            var exception = ex;

            while (exception != null)
            {
                var jsonError = new
                {
                    Type = "Error",
                    Timestamp = DateTime.Now.ToString(),
                    Message = exception?.Message,
                    Source = exception?.Source,
                    StackTrace = exception?.StackTrace,
                };
                if (File.Exists(LogPath))
                {
                    var fi = new FileInfo(LogPath);
                    while (fi.Length > 1000000)
                    {
                        var content = File.ReadAllLines(LogPath);
                        File.WriteAllLines(LogPath, content.Skip(10));
                        fi = new FileInfo(LogPath);
                    }
                }
                File.AppendAllText(LogPath, JsonConvert.SerializeObject(jsonError) + Environment.NewLine);
                exception = exception.InnerException;
            }
        }
    }
}
