using Microsoft.AspNetCore.Identity;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Threading.Tasks;

namespace DoXM_Library.Models
{
    public class DoXMUser : IdentityUser
    {
        public DoXMUser()
        {
            UserOptions = new DoXMUserOptions();
            Organization = new Organization();
        }
        public DoXMUserOptions UserOptions { get; set; }

        public Organization Organization { get; set; }
        public string OrganizationID { get; set; }

        public List<PermissionGroup> PermissionGroups { get; set; } = new List<PermissionGroup>();

        public bool IsAdministrator { get; set; } = true;
    }
}
