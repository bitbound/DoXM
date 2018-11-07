using System;
using System.Collections.Generic;
using System.Text;
using DoXM_Library.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;

namespace DoXM_Server.Data
{
    public class ApplicationDbContext : IdentityDbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
            this.Database.Migrate();
        }
        public DbSet<CommandContext> CommandContexts { get; set; }

        public DbSet<Drive> Drives { get; set; }

        public DbSet<Machine> Machines { get; set; }

        public DbSet<Organization> Organizations { get; set; }

        public new DbSet<DoXMUser> Users { get; set; }

        public DbSet<EventLog> EventLogs { get; set; }

        public DbSet<SharedFile> SharedFiles { get; set; }

        public DbSet<InviteLink> InviteLinks { get; set; }

        public DbSet<PermissionGroup> PermissionGroups { get; set; }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);
            
            builder.Entity<IdentityUser>().ToTable("DoXMUsers");
            builder.Entity<DoXMUser>().ToTable("DoXMUsers");

            builder.Entity<Organization>()
                .HasMany(x => x.Machines)
                .WithOne(x=>x.Organization);
            builder.Entity<Organization>()
                .HasMany(x => x.DoXMUsers)
                .WithOne(x=> x.Organization);
            builder.Entity<Organization>()
                .HasMany(x => x.CommandContexts)
                .WithOne(x => x.Organization);
            builder.Entity<Organization>()
                .HasMany(x => x.EventLogs)
                .WithOne(x => x.Organization);
            builder.Entity<Organization>()
                .HasMany(x => x.PermissionGroups)
                .WithOne(x => x.Organization);
            builder.Entity<Organization>()
              .HasMany(x => x.InviteLinks)
              .WithOne(x => x.Organization);
            builder.Entity<Organization>()
              .HasMany(x => x.SharedFiles)
              .WithOne(x => x.Organization);


            builder.Entity<CommandContext>()
                .Property(x=>x.TargetMachineIDs)
                .HasConversion(
                    x => JsonConvert.SerializeObject(x),
                    x => JsonConvert.DeserializeObject<string[]>(x));
            builder.Entity<CommandContext>()
               .Property(x => x.PSCoreResults)
               .HasConversion(
                   x => JsonConvert.SerializeObject(x),
                   x => JsonConvert.DeserializeObject<List<PSCoreCommandResult>>(x));
            builder.Entity<CommandContext>()
                .Property(x => x.CommandResults)
                .HasConversion(
                    x => JsonConvert.SerializeObject(x),
                    x => JsonConvert.DeserializeObject<List<GenericCommandResult>>(x));

            builder.Entity<DoXMUser>()
                .Property(x => x.UserOptions)
                .HasConversion(
                    x => JsonConvert.SerializeObject(x),
                    x => JsonConvert.DeserializeObject<DoXMUserOptions>(x));
            builder.Entity<DoXMUser>()
                .Property(x => x.PermissionGroups)
                .HasConversion(
                    x => JsonConvert.SerializeObject(x),
                    x => JsonConvert.DeserializeObject<List<PermissionGroup>>(x)
                );
            builder.Entity<DoXMUser>()
               .HasOne(x => x.Organization);

            builder.Entity<Machine>()
                .HasMany(x => x.Drives);
            builder.Entity<DoXMUser>()
               .Property(x => x.PermissionGroups)
               .HasConversion(
                   x => JsonConvert.SerializeObject(x),
                   x => JsonConvert.DeserializeObject<List<PermissionGroup>>(x)
               );
        }
    }
}
