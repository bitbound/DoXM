using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using DoXM_Server.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting.Internal;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.FileProviders;

// For more information on enabling Web API for empty projects, visit https://go.microsoft.com/fwlink/?LinkID=397860

namespace DoXM_Server.API
{
    [Route("api/[controller]")]
    public class ClientDownloadsController : Controller
    {
        public ClientDownloadsController(HostingEnvironment hostEnv, DataService dataService)
        {
            HostEnv = hostEnv;
            DataService = dataService;
        }
        private HostingEnvironment HostEnv { get; set; }
        private DataService DataService { get; set; }

        
        [Authorize]
        [HttpGet("{platformID}")]
        public ActionResult Get(string platformID)
        {
            var user = DataService.GetUserByName(User.Identity.Name);
            var fileContents = new List<string>();
            var fileName = "";
            switch (platformID)
            {
                case "Win10-x64":
                case "Win10-x86":
                    fileName = $"Install-{platformID}.ps1";

                    fileContents.AddRange(System.IO.File.ReadAllLines(Path.Combine(HostEnv.WebRootPath, "Downloads", $"{fileName}")));
                    
                    var hostIndex = fileContents.IndexOf("[string]$HostName = $null");
                    var orgIndex = fileContents.IndexOf("[string]$Organization = $null");

                    fileContents[hostIndex] = $"[string]$HostName = \"{Request.Scheme}://{Request.Host}\"";
                    fileContents[orgIndex] = $"[string]$Organization = \"{user.Organization.ID}\"";
                    break;
                default:
                    return BadRequest();
            }

            var fileBytes = System.Text.Encoding.UTF8.GetBytes(string.Join(Environment.NewLine, fileContents));

            return File(fileBytes, "application/octet-stream", $"{fileName}");
        }
    }
}
