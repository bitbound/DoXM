using DoXM_Library.Models;
using DoXM_Server.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Hosting;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.Collections;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Management.Automation;
using System.Threading.Tasks;

namespace DoXM_Server.Services
{
    public class DeviceSocketHub : Hub
    {
        private readonly DataService _dataService;
        private readonly IHubContext<BrowserSocketHub> _browserHub;

        private readonly IWebHostEnvironment _hostEnv;

        public DeviceSocketHub(
            DataService dataService,
            IHubContext<BrowserSocketHub> browserHub,
            IWebHostEnvironment hostEnv)
        {
            _dataService = dataService;
            _browserHub = browserHub;
            _hostEnv = hostEnv;
        }


        public static ConcurrentDictionary<string, Machine> ServiceConnections { get; set; } = new ConcurrentDictionary<string, Machine>();

        public override async Task OnDisconnectedAsync(Exception exception)
        {
            if (Machine != null)
            {
                _dataService.MachineDisconnected(Machine.ID);
                await this.Groups.RemoveFromGroupAsync(this.Context.ConnectionId, Machine.OrganizationID);
                Machine.IsOnline = false;
                await _browserHub.Clients.Group(Machine.OrganizationID).SendAsync("MachineWentOffline", Machine);
                while (!ServiceConnections.TryRemove(Context.ConnectionId, out var machine))
                {
                    await Task.Delay(1000);
                }
            }
            
            await base.OnDisconnectedAsync(exception);
        }
        public async Task MachineCameOnline(Machine machine)
        {
            if (ServiceConnections.Any(x=>x.Value.ID == machine.ID))
            {
                _dataService.WriteEvent(new EventLog()
                {
                    EventType = EventTypes.Info,
                    OrganizationID = Machine.OrganizationID,
                    Message = $"Machine connection for {machine.MachineName} was denied because it is already connected."
                });
                Context.Abort();
                return;
            }

            if (string.IsNullOrWhiteSpace(machine.OrganizationID) && _hostEnv.IsDevelopment())
            {
                var firstOrg = _dataService.GetFirstOrganization();
                if (firstOrg is not null)
                {
                    machine.Organization = firstOrg;
                    machine.OrganizationID = firstOrg.ID;
                }
            }
            machine.IsOnline = true;
            machine.LastOnline = DateTime.Now;
            Machine = machine;
            if (_dataService.AddOrUpdateMachine(machine))
            {
                var failCount = 0;
                while (!ServiceConnections.TryAdd(Context.ConnectionId, machine))
                {
                    if (failCount > 3)
                    {
                        Context.Abort();
                        return;
                    }
                    failCount++;
                    await Task.Delay(1000);
                }
                await this.Groups.AddToGroupAsync(this.Context.ConnectionId, machine.OrganizationID);
                await _browserHub.Clients.Group(Machine.OrganizationID).SendAsync("MachineCameOnline", Machine);
            }
            else
            {
                // Organization wasn't found.
                await Clients.Caller.SendAsync("UninstallClient");
            }
        }
        
        public async Task MachineHeartbeat(Machine machine)
        {
            machine.IsOnline = true;
            machine.LastOnline = DateTime.Now;
            Machine = machine;
            _dataService.AddOrUpdateMachine(machine);
            await _browserHub.Clients.Group(Machine.OrganizationID).SendAsync("MachineHeartbeat", Machine);
        }
        public async Task PSCoreResult(PSCoreCommandResult result)
        {
            result.MachineID = Machine.ID;
            var commandContext = _dataService.GetCommandContext(result.CommandContextID);
            commandContext.PSCoreResults.Add(result);
            _dataService.AddOrUpdateCommandContext(commandContext);
            await _browserHub.Clients.Client(commandContext.SenderConnectionID).SendAsync("PSCoreResult", result);
        }
        public async Task CommandResult(GenericCommandResult result)
        {
            result.MachineID = Machine.ID;
            var commandContext = _dataService.GetCommandContext(result.CommandContextID);
            commandContext.CommandResults.Add(result);
            _dataService.AddOrUpdateCommandContext(commandContext);
            await _browserHub.Clients.Client(commandContext.SenderConnectionID).SendAsync("CommandResult", result);
        }
        public async Task DisplayConsoleMessage(string message, string requesterID)
        {
            await _browserHub.Clients.Client(requesterID).SendAsync("DisplayConsoleMessage", message);
        }
       
        public async Task SendServerVerificationToken()
        {
            await Clients.Caller.SendAsync("ServerVerificationToken", Machine.ServerVerificationToken);
        }
        public void SetServerVerificationToken(string verificationToken)
        {
            Machine.ServerVerificationToken = verificationToken;
            _dataService.SetServerVerificationToken(Machine.ID, verificationToken);
        }

        public async void TransferCompleted(string transferID, string requesterID)
        {
            await _browserHub.Clients.Client(requesterID).SendAsync("TransferCompleted", transferID);
        }
        public async void PSCoreResultViaAjax(string commandID)
        {
            var commandContext = _dataService.GetCommandContext(commandID);
            await _browserHub.Clients.Client(commandContext.SenderConnectionID).SendAsync("PSCoreResultViaAjax", commandID, Machine.ID);
        }
        public async void CMDResultViaAjax(string commandID)
        {
            var commandContext = _dataService.GetCommandContext(commandID);
            await _browserHub.Clients.Client(commandContext.SenderConnectionID).SendAsync("CMDResultViaAjax", commandID, Machine.ID);
        }
        public async void WinPSResultViaAjax(string commandID)
        {
            var commandContext = _dataService.GetCommandContext(commandID);
            await _browserHub.Clients.Client(commandContext.SenderConnectionID).SendAsync("WinPSResultViaAjax", commandID, Machine.ID);
        }
        public async void BashResultViaAjax(string commandID)
        {
            var commandContext = _dataService.GetCommandContext(commandID);
            await _browserHub.Clients.Client(commandContext.SenderConnectionID).SendAsync("BashResultViaAjax", commandID, Machine.ID);
        }
        private Machine Machine
        {
            get
            {
                return this.Context.Items["Machine"] as Machine;
            }
            set
            {
                this.Context.Items["Machine"] = value;
            }
        }

      
    }
}
