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
        public CoreVersionController(IHostingEnvironment hostingEnv)
        {
            this.HostingEnv = hostingEnv;
        }

        public IHostingEnvironment HostingEnv { get; }

        // GET: api/<controller>
        [HttpGet("{platform}")]
        public string Get(string platform)
        {
            string fileName = "";
            switch (platform)
            {
                case "Windows":
                    fileName = "DoXM-win10-x64.zip";
                    break;
                case "Linux":
                    fileName = "DoXM-Linux.zip";
                    break;
                default:
                    return "";
            }
            using (var fs = new FileStream(Path.Combine(HostingEnv.WebRootPath, "Downloads", fileName), FileMode.Open))
            {
                var zipArchive = new ZipArchive(fs);
                var tempFile = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
                zipArchive.GetEntry("DoXM_Client.dll").ExtractToFile(tempFile, true);
                var version = FileVersionInfo.GetVersionInfo(tempFile);
                return version.FileVersion.ToString();
            }
        }
    }
}
