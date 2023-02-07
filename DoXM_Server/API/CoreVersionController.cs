using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;

namespace DoXM_Server.API
{
    [Route("api/[controller]")]
    public class CoreVersionController : Controller
    {
        public CoreVersionController(IWebHostEnvironment hostingEnv)
        {
            HostingEnv = hostingEnv;
        }

        public IWebHostEnvironment HostingEnv { get; }

        // GET: api/<controller>
        [HttpGet("{platform}")]
        public string Get(string platform)
        {
            var fileName = "";
            switch (platform)
            {
                case "Windows":
                    fileName = "DoXM-Win10-x64.zip";
                    break;
                case "Linux":
                    fileName = "DoXM-Linux.zip";
                    break;
                default:
                    return "";
            }
            using var fs = new FileStream(Path.Combine(HostingEnv.WebRootPath, "Downloads", fileName), FileMode.Open);
            var zipArchive = new ZipArchive(fs);
            var tempFile = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
            zipArchive.GetEntry("DoXM_Client.dll").ExtractToFile(tempFile, true);
            var version = FileVersionInfo.GetVersionInfo(tempFile);
            if (!string.IsNullOrWhiteSpace(version?.FileVersion))
            {
                return version.FileVersion;
            }

            return FileVersionInfo.GetVersionInfo("DoXM_Server.dll")?.FileVersion;
        }
    }
}
