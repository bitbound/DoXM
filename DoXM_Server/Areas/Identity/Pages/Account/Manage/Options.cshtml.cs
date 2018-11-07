using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using DoXM_Library.Models;
using DoXM_Server.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace DoXM_Server.Areas.Identity.Pages.Account.Manage
{
    public class OptionsModel : PageModel
    {
        public OptionsModel(DataService dataService)
        {
            this.DataService = dataService;
        }
        private DataService DataService { get; set; }

        [TempData]
        public string Message { get; set; }

        public DoXMUserOptions Options { get; set; }

        public void OnGet()
        {
            Options = DataService.GetUserOptions(User.Identity.Name);
        }

        public IActionResult OnPost(DoXMUserOptions options)
        {
            if (!ModelState.IsValid)
            {
                return Page();
            }
            DataService.UpdateUserOptions(User.Identity.Name, options);
            Message = "Saved successfully.";
            return RedirectToPage();
        }
    }
}