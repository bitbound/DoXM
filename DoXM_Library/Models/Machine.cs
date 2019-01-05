using DoXM_Library.Services;
using Microsoft.Management.Infrastructure;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.IO;
using System.Linq;
using System.Management;
using System.Runtime.InteropServices;

namespace DoXM_Library.Models
{
    public class Machine
    {
        public List<Drive> Drives { get; set; }

        [Key]
        public string ID { get; set; }

        public bool Is64Bit { get; set; }

        public bool IsOnline { get; set; }

        public DateTime LastOnline { get; set; }

        public string MachineName { get; set; }

        public string OrganizationID { get; set; }
        public Organization Organization { get; set; }

        public Architecture OSArchitecture { get; set; }

        public string OSDescription { get; set; }

        public string Platform { get; set; }

        public int ProcessorCount { get; set; }
        public double TotalMemory { get; set; }

        public double FreeStorage { get; set; }

        public double TotalStorage { get; set; }

        public double FreeMemory { get; set; }

        public string CurrentUser { get; set; }
        public List<PermissionGroup> PermissionGroups { get; set; } = new List<PermissionGroup>();

        [StringLength(200)]
        public string Tags { get; set; } = "";
        public string ServerVerificationToken { get; set; }

        public static Machine Create(ConnectionInfo connectionInfo)
        {
            OSPlatform platform = OSUtils.GetPlatform();
            DriveInfo systemDrive;

            if (!string.IsNullOrWhiteSpace(Environment.SystemDirectory))
            {
                systemDrive = DriveInfo.GetDrives()
                    .Where(x=>x.IsReady)
                    .FirstOrDefault(x =>
                        x.RootDirectory.FullName.Contains(Path.GetPathRoot(Environment.SystemDirectory ?? Environment.CurrentDirectory))
                    );
            }
            else
            {
                systemDrive = DriveInfo.GetDrives().Where(x => x.IsReady).FirstOrDefault();
            }

            var machine = new Machine()
            {
                ID = connectionInfo.MachineID,
                MachineName = Environment.MachineName,
                Platform = platform.ToString(),
                ProcessorCount = Environment.ProcessorCount,
                OSArchitecture = RuntimeInformation.OSArchitecture,
                OSDescription = RuntimeInformation.OSDescription,
                Is64Bit = Environment.Is64BitOperatingSystem,
                Drives = DriveInfo.GetDrives().Where(x => x.IsReady).Select(x => new Drive()
                {
                    DriveFormat = x.DriveFormat,
                    DriveType = x.DriveType,
                    Name = x.Name,
                    RootDirectory = x.RootDirectory.FullName,
                    FreeSpace = x.TotalFreeSpace > 0 && x.TotalSize > 0 ? x.TotalFreeSpace / x.TotalSize : 0,
                    TotalSize = x.TotalSize > 0 ? Math.Round((double)(x.TotalSize / 1024 / 1024 / 1024), 2) : 0,
                    VolumeLabel = x.VolumeLabel
                }).ToList(),
                OrganizationID = connectionInfo.OrganizationID,
                CurrentUser = GetCurrentUser()
            };

            if (systemDrive != null && systemDrive.TotalSize > 0 && systemDrive.TotalFreeSpace > 0)
            {
                machine.TotalStorage = Math.Round((double)(systemDrive.TotalSize / 1024 / 1024 / 1024), 2);
                var freeStorage = Math.Round((double)(systemDrive.TotalFreeSpace / 1024 / 1024 / 1024), 2);
                machine.FreeStorage = freeStorage / machine.TotalStorage;
            }

            var totalMemory = GetMemoryInGB();
            machine.FreeMemory = totalMemory.Item1 / totalMemory.Item2;
            machine.TotalMemory = totalMemory.Item2;

            return machine;
        }

        private static string GetCurrentUser()
        {
            try
            {
                if (OSUtils.IsWindows)
                {
                    var session = CimSession.Create(null);
                    var computerSystem = session.EnumerateInstances("root\\cimv2", "CIM_ComputerSystem");
                    var username = computerSystem.FirstOrDefault().CimInstanceProperties["UserName"].Value ?? "";
                    return username as string;
                }
                else
                {
                    return Environment.UserDomainName + "\\" + Environment.UserName;
                }
            }
            catch
            {
                return "Error Retrieving";
            }
        }

        private static Tuple<double, double> GetMemoryInGB()
        {
            try
            {
                var session = CimSession.Create(null);
                var cimOS = session.EnumerateInstances("root\\cimv2", "CIM_OperatingSystem");
                var free = (ulong)(cimOS.FirstOrDefault()?.CimInstanceProperties["FreePhysicalMemory"]?.Value ?? 1);
                var freeGB = Math.Round(((double)free / 1024 / 1024), 2);
                var total = (ulong)(cimOS.FirstOrDefault()?.CimInstanceProperties["TotalVisibleMemorySize"]?.Value ?? 1);
                var totalGB = Math.Round(((double)total / 1024 / 1024), 2);

                return new Tuple<double, double>(freeGB, totalGB);
            }
            catch
            {
                return new Tuple<double, double>(1, 1);
            }
        }
    }
}