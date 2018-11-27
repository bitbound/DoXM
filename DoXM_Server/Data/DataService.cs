using DoXM_Library.Models;
using DoXM_Library.ViewModels;
using DoXM_Server.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

namespace DoXM_Server.Data
{
    public class DataService
    {
        public DataService(
                ApplicationDbContext context,
                ApplicationConfig appConfig,
                UserManager<DoXMUser> userManager
            )
        {
            DoXMContext = context;
            AppConfig = appConfig;
            UserManager = userManager;
        }

        internal DoXMUserOptions GetUserOptions(string userName)
        {
            return DoXMContext.Users
                    .FirstOrDefault(x => x.UserName == userName)
                    .UserOptions;
        }

        internal bool JoinViaInvitation(string userName, string inviteID)
        {
            var invite = DoXMContext.InviteLinks
                .Include(x => x.Organization)
                .ThenInclude(x => x.DoXMUsers)
                .FirstOrDefault(x =>
                    x.InvitedUser.ToLower() == userName.ToLower() &&
                    x.ID == inviteID);

            if (invite == null)
            {
                return false;
            }

            var user = DoXMContext.Users
                .Include(x => x.Organization)
                .FirstOrDefault(x => x.UserName == userName);

            user.Organization = invite.Organization;
            user.OrganizationID = invite.Organization.ID;
            user.IsAdministrator = invite.IsAdmin;
            user.PermissionGroups.Clear();
            invite.Organization.DoXMUsers.Add(user);

            DoXMContext.SaveChanges();

            DoXMContext.InviteLinks.Remove(invite);
            DoXMContext.SaveChanges();
            return true;
        }

        internal bool DoesGroupExist(string userID, string groupName)
        {
            var user = DoXMContext.Users
                        .Include(x => x.Organization)
                        .ThenInclude(x => x.PermissionGroups)
                        .FirstOrDefault(x => x.Id == userID);
            return user.Organization.PermissionGroups.Exists(x => x.Name.ToLower() == groupName.ToLower());
        }

        internal void RemovePermissionFromMachines(string userID, string[] machineIDs, string groupName)
        {
            var user = DoXMContext.Users
                      .Include(x => x.Organization)
                      .ThenInclude(x => x.Machines)
                      .FirstOrDefault(x => x.Id == userID);

            var group = user.Organization.PermissionGroups.FirstOrDefault(x => x.Name.ToLower() == groupName.ToLower());
            foreach (var machineID in machineIDs)
            {
                if (user.Organization.Machines.Exists(x => x.ID == machineID))
                {
                    var machine = DoXMContext.Machines
                                .Include(x => x.PermissionGroups)
                                .FirstOrDefault(x => x.ID == machineID);
                    machine.PermissionGroups.RemoveAll(x => x.ID == group.ID);
                    DoXMContext.Entry(machine).State = EntityState.Modified;
                }
            }
            DoXMContext.SaveChanges();
        }

        internal void AddPermissionToMachines(string userID, string[] machineIDs, string groupName)
        {
            var user = DoXMContext.Users
                       .Include(x => x.Organization)
                       .Include(x => x.Organization)
                       .ThenInclude(x => x.Machines)
                       .FirstOrDefault(x => x.Id == userID);

            var group = user.Organization.PermissionGroups.FirstOrDefault(x => x.Name.ToLower() == groupName.ToLower());
            foreach (var machineID in machineIDs)
            {
                if (user.Organization.Machines.Exists(x => x.ID == machineID))
                {
                    var machine = DoXMContext.Machines
                                .Include(x => x.PermissionGroups)
                                .FirstOrDefault(x => x.ID == machineID);
                    if (!machine.PermissionGroups.Exists(x => x.ID == group.ID))
                    {
                        machine.PermissionGroups.Add(group);
                        DoXMContext.Entry(machine).State = EntityState.Modified;
                    }
                }
            }
            DoXMContext.SaveChanges();
        }

        internal void UpdateUserOptions(string userName, DoXMUserOptions options)
        {
            DoXMContext.Users.FirstOrDefault(x => x.UserName == userName).UserOptions = options;
            DoXMContext.SaveChanges();
        }

        private ApplicationConfig AppConfig { get; set; }
        private ApplicationDbContext DoXMContext { get; set; }
        private UserManager<DoXMUser> UserManager { get; set; }
        public void AddOrUpdateCommandContext(CommandContext commandContext)
        {
            var existingContext = DoXMContext.CommandContexts.Find(commandContext.ID);
            if (existingContext != null)
            {
                var entry = DoXMContext.Entry(existingContext);
                entry.CurrentValues.SetValues(commandContext);
                entry.State = EntityState.Modified;
            }
            else
            {
                DoXMContext.CommandContexts.Add(commandContext);
            }
            DoXMContext.SaveChanges();
        }

        internal void CleanupOldRecords()
        {
            if (AppConfig.DataRetentionInDays > 0)
            {
                DoXMContext.EventLogs
                    .Where(x => DateTime.Now - x.TimeStamp > TimeSpan.FromDays(AppConfig.DataRetentionInDays))
                    .ForEachAsync(x =>
                    {
                        DoXMContext.Remove(x);
                    });

                DoXMContext.CommandContexts
                    .Where(x => DateTime.Now - x.TimeStamp > TimeSpan.FromDays(AppConfig.DataRetentionInDays))
                    .ForEachAsync(x =>
                    {
                        DoXMContext.Remove(x);
                    });

                DoXMContext.Machines
                    .Where(x => DateTime.Now - x.LastOnline > TimeSpan.FromDays(AppConfig.DataRetentionInDays))
                    .ForEachAsync(x =>
                    {
                        DoXMContext.Remove(x);
                    });
            }
        }

        internal void SetServerVerificationToken(string machineID, string verificationToken)
        {
            var machine = DoXMContext.Machines.Find(machineID);
            if (machine != null)
            {
                machine.ServerVerificationToken = verificationToken;
                DoXMContext.SaveChanges();
            }
        }

        public bool AddOrUpdateMachine(Machine machine)
        {
            var existingMachine = DoXMContext.Machines.Find(machine.ID);
            if (existingMachine != null)
            {
                machine.ServerVerificationToken = existingMachine.ServerVerificationToken;
                DoXMContext.Entry(existingMachine).CurrentValues.SetValues(machine);
            }
            else
            {
                if (!DoXMContext.Organizations.Any(x => x.ID == machine.OrganizationID))
                {
                    WriteEvent(new EventLog()
                    {
                        EventType = EventTypes.Info,
                        Message = $"Unable to add machine {machine.MachineName} because organization {machine.OrganizationID} does not exist.",
                        Source = "DataService.AddOrUpdateMachine"
                    });
                    return false;
                }
                DoXMContext.Machines.Add(machine);
            }
            DoXMContext.SaveChanges();
            return true;
        }

        public void CleanupEmptyOrganizations()
        {
            var emptyOrgs = DoXMContext.Organizations
                .Include(x => x.DoXMUsers)
                .Include(x => x.CommandContexts)
                .Include(x => x.InviteLinks)
                .Include(x => x.Machines)
                .Include(x => x.SharedFiles)
                .Include(x => x.PermissionGroups)
                .Where(x => x.DoXMUsers.Count == 0);

            foreach (var emptyOrg in emptyOrgs)
            {
                DoXMContext.Remove(emptyOrg);
            }
            DoXMContext.SaveChanges();
        }

        public bool DoesUserExist(string userName)
        {
            if (userName == null)
            {
                return false;
            }
            return DoXMContext.Users.Any(x => x.UserName == userName);
        }

        public bool DoesUserHaveAccessToMachine(string machineID, DoXMUser doxmUser)
        {
            return DoXMContext.Machines.Any(x =>
                x.OrganizationID == doxmUser.OrganizationID &&
                    (
                        x.PermissionGroups.Count == 0 ||
                        x.PermissionGroups.Any(y => doxmUser.PermissionGroups.Any(z => z.ID == y.ID))
                    ) &&
                x.ID == machineID);
        }

        public string[] FilterMachineIDsByUserPermission(string[] machineIDs, DoXMUser doxmUser)
        {
            return DoXMContext.Machines.Where(x =>
                    x.OrganizationID == doxmUser.OrganizationID &&
                    (
                        x.PermissionGroups.Count == 0 ||
                        x.PermissionGroups.Any(y => doxmUser.PermissionGroups.Any(z => z.ID == y.ID))
                    ) &&
                    machineIDs.Contains(x.ID))
                .Select(x => x.ID)
                .ToArray();
        }

        public IEnumerable<CommandContext> GetAllCommandContexts(string userName)
        {
            var orgID = GetUserByName(userName).OrganizationID;
            return DoXMContext.CommandContexts.Where(x => x.OrganizationID == orgID);
        }

        public IEnumerable<Machine> GetAllMachines(string userID)
        {
            var orgID = GetUserByID(userID).OrganizationID;

            var machines = DoXMContext.Machines
                .Include(x => x.Drives)
                .Where(x => x.OrganizationID == orgID);

            return machines;
        }

        public IEnumerable<PermissionGroup> GetAllPermissions(string userName)
        {
            return DoXMContext.Users
                    .Include(x => x.Organization)
                    .ThenInclude(x => x.PermissionGroups)
                    .FirstOrDefault(x => x.UserName == userName)
                    .Organization.PermissionGroups;
        }

        public CommandContext GetCommandContext(string commandContextID, string userName)
        {
            var orgID = GetUserByName(userName).OrganizationID;
            return DoXMContext.CommandContexts
                .FirstOrDefault(x => x.OrganizationID == orgID && x.ID == commandContextID);
        }

        public CommandContext GetCommandContext(string commandContextID)
        {
            return DoXMContext.CommandContexts.Find(commandContextID);
        }

        public string GetDefaultPrompt(string userName)
        {
            var userPrompt = DoXMContext.Users.FirstOrDefault(x => x.UserName == userName)?.UserOptions?.ConsolePrompt;
            return userPrompt ?? AppConfig.DefaultPrompt;
        }

        public string GetDefaultPrompt()
        {
            return AppConfig.DefaultPrompt;
        }

        public DoXMUser GetUserByID(string userID)
        {
            if (userID == null)
            {
                return null;
            }
            return DoXMContext.Users
                .Include(x => x.Organization)
                .FirstOrDefault(x => x.Id == userID);
        }

        public DoXMUser GetUserByName(string userName)
        {
            if (userName == null)
            {
                return null;
            }
            return DoXMContext.Users
                .Include(x => x.Organization)
                .FirstOrDefault(x => x.UserName == userName);
        }

        public void MachineDisconnected(string machineID)
        {
            var machine = DoXMContext.Machines.Find(machineID);
            if (machine != null)
            {
                machine.LastOnline = DateTime.Now;
                machine.IsOnline = false;
                DoXMContext.SaveChanges();
            }
        }

        public void RemoveMachines(string[] machineIDs)
        {
            var machines = DoXMContext.Machines
                .Include(x => x.Drives)
                .Where(x => machineIDs.Contains(x.ID));
            foreach (var machine in machines)
            {

                if (machine?.Drives?.Count > 0)
                {
                    DoXMContext.Drives.RemoveRange(machine.Drives);
                }
                DoXMContext.Machines.Remove(machine);
            }
            DoXMContext.SaveChanges();
        }

        public void SetAllMachinesNotOnline()
        {
            DoXMContext.Machines.ForEachAsync(x =>
            {
                x.IsOnline = false;
            });
            DoXMContext.SaveChanges();
        }

        public void WriteEvent(EventLog eventLog)
        {
            DoXMContext.EventLogs.Add(eventLog);
            DoXMContext.SaveChanges();
        }
        public void WriteEvent(Exception ex)
        {
            var error = ex;
            while (error != null)
            {
                DoXMContext.EventLogs.Add(new EventLog()
                {
                    EventType = EventTypes.Error,
                    Message = error.Message,
                    Source = error.Source,
                    StackTrace = error.StackTrace,
                    TimeStamp = DateTime.Now
                });
                error = ex.InnerException;
            }
            DoXMContext.SaveChanges();
        }

        internal InviteLink AddInvite(string requesterUserName, Invite invite, string requestOrigin)
        {
            invite.InvitedUser = invite.InvitedUser.ToLower();

            var requester = DoXMContext.Users
                .Include(x => x.Organization)
                .ThenInclude(x => x.InviteLinks)
                .Include(x => x.Organization)
                .ThenInclude(x => x.DoXMUsers)
                .FirstOrDefault(x => x.UserName == requesterUserName);

            var newInvite = new InviteLink()
            {
                DateSent = DateTime.Now,
                InvitedUser = invite.InvitedUser,
                IsAdmin = invite.IsAdmin,
                Organization = requester.Organization
            };
            requester.Organization.InviteLinks.Add(newInvite);
            DoXMContext.SaveChanges();
            return newInvite;
        }

        internal Tuple<bool, string> AddPermission(string userName, Permission permission)
        {
            var organization = DoXMContext.Users
                .Include(x => x.Organization)
                .ThenInclude(x => x.PermissionGroups)
                .FirstOrDefault(x => x.UserName == userName)
                .Organization;
            if (organization.PermissionGroups.Exists(x => x.Name.ToLower() == permission.Name.ToLower()))
            {
                return Tuple.Create(false, "Permission group already exists.");
            }
            var newPermission = new PermissionGroup()
            {
                Name = permission.Name,
                Organization = organization
            };
            organization.PermissionGroups.Add(newPermission);
            DoXMContext.SaveChanges();
            return Tuple.Create(true, newPermission.ID);
        }

        internal Tuple<bool, string> AddPermissionToUser(string requesterUserName, string targetUserID, string permissionID)
        {
            var requester = DoXMContext.Users
                .Include(x => x.Organization)
                .FirstOrDefault(x => x.UserName == requesterUserName);

            var user = DoXMContext.Users
                        .FirstOrDefault(x => x.OrganizationID == requester.OrganizationID && x.Id == targetUserID);

            if (user.PermissionGroups.Exists(x => x.ID == permissionID))
            {
                return Tuple.Create(false, "User is already in the permission group.");
            }

            var permissions = DoXMContext.PermissionGroups
                .Include(x => x.Organization)
                .Where(x => x.Organization.ID == requester.Organization.ID);
            user.PermissionGroups.Add(permissions.FirstOrDefault(x => x.ID == permissionID));
            DoXMContext.Entry(user).State = EntityState.Modified;
            DoXMContext.SaveChanges();
            return Tuple.Create(true, "");
        }

        internal string AddSharedFile(IFormFile file)
        {
            var expiredFiles = DoXMContext.SharedFiles.Where(x => DateTime.Now - x.Timestamp > TimeSpan.FromDays(7));
            foreach (var expiredFile in expiredFiles)
            {
                DoXMContext.Remove(expiredFile);
            }
            byte[] fileContents;
            using (var stream = file.OpenReadStream())
            {
                using (var ms = new MemoryStream())
                {
                    stream.CopyTo(ms);
                    fileContents = ms.ToArray();
                }
            }
            var newEntity = DoXMContext.Add(new SharedFile()
            {
                FileContents = fileContents,
                FileName = file.FileName,
                ContentType = file.ContentType
            });
            DoXMContext.SaveChanges();
            return newEntity.Entity.ID;
        }

        internal void ChangeUserIsAdmin(string requesterUserName, string targetUserID, bool isAdmin)
        {
            var requester = DoXMContext.Users
                .Include(x => x.Organization)
                .ThenInclude(x => x.DoXMUsers)
                .FirstOrDefault(x => x.UserName == requesterUserName);

            requester.Organization.DoXMUsers.Find(x => x.Id == targetUserID).IsAdministrator = isAdmin;
            DoXMContext.SaveChanges();
        }

        internal void DeleteInvite(string requesterUserName, string inviteID)
        {
            var requester = DoXMContext.Users
               .Include(x => x.Organization)
               .ThenInclude(x => x.InviteLinks)
               .FirstOrDefault(x => x.UserName == requesterUserName);
            var invite = requester.Organization.InviteLinks.Find(x => x.ID == inviteID);
            DoXMContext.Remove(invite);
            DoXMContext.SaveChanges();
        }

        internal void DeletePermission(string userName, string permissionID)
        {
            var organization = DoXMContext.Users
                .Include(x => x.Organization)
                .ThenInclude(x => x.PermissionGroups)
                .FirstOrDefault(x => x.UserName == userName)
                .Organization;

            var permissionGroup = organization.PermissionGroups.FirstOrDefault(x => x.ID == permissionID);
            DoXMContext.PermissionGroups.Remove(permissionGroup);
            DoXMContext.SaveChanges();
        }

        internal List<InviteLink> GetAllInviteLinks(string userName)
        {
            return DoXMContext.Users
                   .Include(x => x.Organization)
                   .ThenInclude(x => x.InviteLinks)
                   .FirstOrDefault(x => x.UserName == userName)
                   .Organization
                   .InviteLinks;
        }

        internal IEnumerable<DoXMUser> GetAllUsers(string userName)
        {
            return DoXMContext.Users
                    .Include(x => x.Organization)
                    .ThenInclude(x => x.DoXMUsers)
                    .FirstOrDefault(x => x.UserName == userName)
                    .Organization
                    .DoXMUsers;
        }

        internal string GetOrganizationName(string userName)
        {
            return DoXMContext.Users
                   .Include(x => x.Organization)
                   .FirstOrDefault(x => x.UserName == userName)
                   .Organization
                   .OrganizationName;
        }

        internal SharedFile GetSharedFiled(string id)
        {
            return DoXMContext.SharedFiles.Find(id);
        }

        internal IEnumerable<PermissionGroup> GetUserPermissions(string requesterUserName, string targetID)
        {
            var targetUser = DoXMContext.Users
                    .Include(x => x.Organization)
                    .ThenInclude(x => x.DoXMUsers)
                    .FirstOrDefault(x => x.UserName == requesterUserName)
                    .Organization
                    .DoXMUsers
                    .FirstOrDefault(x => x.Id == targetID);

            return targetUser.PermissionGroups;
        }

        internal void RemoveFromOrganization(string requesterUserName, string targetUserID)
        {
            var requester = DoXMContext.Users
                .Include(x => x.Organization)
                .ThenInclude(x => x.DoXMUsers)
                .FirstOrDefault(x => x.UserName == requesterUserName);
            var target = requester.Organization.DoXMUsers.FirstOrDefault(x => x.Id == targetUserID);

            var newOrganization = new Organization();
            target.Organization = newOrganization;
            DoXMContext.Organizations.Add(newOrganization);
            DoXMContext.SaveChanges();
        }

        internal void RemovePermissionFromUser(string requesterUserName, string targetUserID, string permissionID)
        {
            var requester = DoXMContext.Users
              .Include(x => x.Organization)
              .ThenInclude(x => x.DoXMUsers)
              .FirstOrDefault(x => x.UserName == requesterUserName);

            var target = requester.Organization.DoXMUsers.FirstOrDefault(x => x.Id == targetUserID);
            target.PermissionGroups.RemoveAll(x => x.ID == permissionID);
            DoXMContext.Entry(target).State = EntityState.Modified;
            DoXMContext.SaveChanges();
        }

        internal void UpdateOrganizationName(string userName, string organizationName)
        {
            DoXMContext.Users
                .Include(x => x.Organization)
                .FirstOrDefault(x => x.UserName == userName)
                .Organization
                .OrganizationName = organizationName;
            DoXMContext.SaveChanges();
        }
        internal void UpdateTags(string machineID, string tag)
        {
            DoXMContext.Machines.Find(machineID).Tags = tag;
            DoXMContext.SaveChanges();
        }
    }
}
