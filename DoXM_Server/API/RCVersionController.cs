using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;
using System.IO;
using System.Reflection;

namespace DoXM_Server.API
{
    [Route("api/[controller]")]
    public class RCVersionController : Controller
    {
        public RCVersionController(IWebHostEnvironment hostingEnv)
        {
            HostingEnv = hostingEnv;
        }

        public IWebHostEnvironment HostingEnv { get; }

        // GET: api/<controller>
        [HttpGet("{platform}")]
        public string Get(string platform)
        {
            string ext = "";

            switch (platform)
            {
                case "Windows":
                    ext = "exe";
                    break;
                case "Linux":
                    ext = "appimage";
                    break;
                default:
                    break;
            }
            var version = FileVersionInfo.GetVersionInfo(Path.Combine(HostingEnv.WebRootPath, "Downloads", $"DoXM_Remote_Control.{ext}"));
            if (!string.IsNullOrEmpty(version?.FileVersion))
            {
                return version.FileVersion;
            }

            return FileVersionInfo.GetVersionInfo("DoXM_Server.dll")?.FileVersion;
        }
    }
}
