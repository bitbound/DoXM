using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.HttpsPolicy;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using DoXM_Server.Data;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using System.IO;
using DoXM_Server.Services;
using Microsoft.Extensions.FileProviders;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.AspNetCore.SignalR;
using DoXM_Library.Models;
using Microsoft.AspNetCore.Http.Connections;
using DoXM_Library.Services;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.Extensions.Hosting;
using Microsoft.AspNetCore.Identity.UI.Services;
using System.Net;
using System.Text.Json;

namespace DoXM_Server
{
    public class Startup
    {
        public Startup(IConfiguration configuration, IWebHostEnvironment env)
        {
            Configuration = configuration;
            IsDev = env.IsDevelopment();
        }

        public IConfiguration Configuration { get; }
        private bool IsDev { get; set; }
        // This method gets called by the runtime. Use this method to add services to the container.
        public void ConfigureServices(IServiceCollection services)
        {
            services.Configure<CookiePolicyOptions>(options =>
            {
                // This lambda determines whether user consent for non-essential cookies is needed for a given request.
                options.CheckConsentNeeded = context => true;
                options.MinimumSameSitePolicy = SameSiteMode.None;
            });

            var dbProvider = Configuration["ApplicationOptions:DBProvider"].ToLower();
            if (dbProvider == "sqlite")
            {
                services.AddDbContext<ApplicationDbContext>(options =>
                    options.UseSqlite(
                        Configuration.GetConnectionString("SQLite")));
            }
            else if (dbProvider == "sqlserver")
            {
                services.AddDbContext<ApplicationDbContext>(options =>
                    options.UseSqlServer(
                        Configuration.GetConnectionString("SQLServer")));
            }
            else if (dbProvider == "postgresql")
            {
                services.AddDbContext<ApplicationDbContext>(options =>
                options.UseNpgsql(
                    Configuration.GetConnectionString("PostgreSQL")));
            }

            services.AddIdentity<DoXMUser, IdentityRole>(options => options.Stores.MaxLengthForKeys = 128)
                .AddEntityFrameworkStores<ApplicationDbContext>()
                .AddDefaultUI()
                .AddDefaultTokenProviders();

            services.Configure<ForwardedHeadersOptions>(options =>
            {
                options.ForwardedHeaders = ForwardedHeaders.All;
                options.ForwardLimit = null;

                // Default Docker host. We want to allow forwarded headers from this address.
                options.KnownProxies.Add(IPAddress.Parse("172.17.0.1"));
            });

            services.AddRazorPages();
            services.AddControllers()
                .AddJsonOptions(options =>
                {
                    options.JsonSerializerOptions.PropertyNamingPolicy = null;
                });

            services.AddSignalR(options =>
                {
                    options.EnableDetailedErrors = IsDev;
                    options.MaximumReceiveMessageSize = null;
                })
                .AddJsonProtocol(options =>
                {
                    options.PayloadSerializerOptions.PropertyNameCaseInsensitive = true;
                    // For PascalCasing.
                    options.PayloadSerializerOptions.PropertyNamingPolicy = null;
                });

            services.AddLogging();
            services.AddScoped<IEmailSender, EmailSender>();
            services.AddScoped<EmailSender>();
            services.AddScoped<DataService>();
            services.AddSingleton<ApplicationConfig>();
            services.AddSingleton<RandomGenerator>();
        }

        // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
        public void Configure(IApplicationBuilder app, IWebHostEnvironment env, DataService dataService)
        {
            app.UseForwardedHeaders();

            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
            }
            else
            {
                app.UseExceptionHandler("/Error");
                app.UseHsts();
                app.UseHttpsRedirection();
            }

            ConfigureStaticFiles(app);
            
            app.UseCookiePolicy();

            app.UseRouting();

            app.UseAuthentication();
            app.UseAuthorization();

            app.UseEndpoints(endpoints =>
            {
                endpoints.MapHub<BrowserSocketHub>("/BrowserHub");
                endpoints.MapHub<DeviceSocketHub>("/DeviceHub");
                endpoints.MapHub<RCDeviceSocketHub>("/RCDeviceHub");
                endpoints.MapHub<RCBrowserSocketHub>("/RCBrowserHub");

                endpoints.MapControllers();
                endpoints.MapRazorPages();
            });
            dataService.SetAllMachinesNotOnline();
            dataService.CleanupEmptyOrganizations();
            dataService.CleanupOldRecords();
        }


        private void ConfigureStaticFiles(IApplicationBuilder app)
        {
            Newtonsoft.Json.JsonConvert.DefaultSettings = () =>
            {
                var settings = new Newtonsoft.Json.JsonSerializerSettings();
                settings.ReferenceLoopHandling = Newtonsoft.Json.ReferenceLoopHandling.Ignore;
                settings.PreserveReferencesHandling = Newtonsoft.Json.PreserveReferencesHandling.None;
                return settings;
            };
            var provider = new FileExtensionContentTypeProvider();
            // Add new mappings
            provider.Mappings[".ps1"] = "application/octet-stream";
            provider.Mappings[".exe"] = "application/octet-stream";
            provider.Mappings[".appimage"] = "application/octet-stream";
            provider.Mappings[".zip"] = "application/octet-stream";
            app.UseStaticFiles();
            app.UseStaticFiles(new StaticFileOptions()
            {
                FileProvider = new PhysicalFileProvider(Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "Downloads")),
                RequestPath = new PathString("/Downloads"),
                ContentTypeProvider = provider,
                DefaultContentType = "application/octet-stream"
            });
            // Needed for Let's Encrypt.
            if (Directory.Exists(Path.Combine(Directory.GetCurrentDirectory(), ".well-known")))
            {
                app.UseStaticFiles(new StaticFileOptions
                {
                    FileProvider = new PhysicalFileProvider(Path.Combine(Directory.GetCurrentDirectory(), @".well-known")),
                    RequestPath = new PathString("/.well-known"),
                    ServeUnknownFileTypes = true
                });
            }
        }
    }
}
