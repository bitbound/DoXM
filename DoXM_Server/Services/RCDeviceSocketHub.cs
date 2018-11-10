using DoXM_Library.Models;
using DoXM_Library.Services;
using DoXM_Server.Data;
using Microsoft.AspNetCore.SignalR;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace DoXM_Server.Services
{
    public class RCDeviceSocketHub : Hub
    {
        public static ConcurrentDictionary<string, AttendedSessionInfo> AttendedSessionList { get; set; } = new ConcurrentDictionary<string, AttendedSessionInfo>();
        public RCDeviceSocketHub(DataService dataService, 
            IHubContext<BrowserSocketHub> browserHub, 
            IHubContext<RCBrowserSocketHub> rcBrowserHub, 
            IHubContext<DeviceSocketHub> deviceSocketHub,
            ApplicationConfig appConfig,
            RandomGenerator rng)
        {
            DataService = dataService;
            BrowserHub = browserHub;
            RCBrowserHub = rcBrowserHub;
            AppConfig = appConfig;
            DeviceHub = deviceSocketHub;
            RNG = rng;
        }
        private ApplicationConfig AppConfig { get; set; }
        private IHubContext<DeviceSocketHub> DeviceHub { get; }
        private DataService DataService { get; }
        private IHubContext<BrowserSocketHub> BrowserHub { get; }
        private IHubContext<RCBrowserSocketHub> RCBrowserHub { get; }
        
        private RandomGenerator RNG { get; }

        public override Task OnConnectedAsync()
        {
            return base.OnConnectedAsync();
        }
        public override async Task OnDisconnectedAsync(Exception exception)
        {
            await base.OnDisconnectedAsync(exception);
            if (AttendedSessionList.ContainsKey(Context.Items["SessionID"].ToString())) 
            {
                while (!AttendedSessionList.TryRemove(Context.Items["SessionID"].ToString(), out var value))
                {
                    await Task.Delay(1000);
                }
            }
        }

        public async Task SendScreenCountToBrowser(int primaryScreenIndex, int screenCount, string browserHubConnectionID)
        {
            await RCBrowserHub.Clients.Client(browserHubConnectionID).SendAsync("ScreenCount", primaryScreenIndex, screenCount);
        }
        public async Task SendRTCSessionToBrowser(object offer, string browserHubConnectionID)
        {
            await RCBrowserHub.Clients.Client(browserHubConnectionID).SendAsync("RTCSession", offer);
        }
        public async Task SendIceCandidateToBrowser(object candidate, string browserHubConnectionID)
        {
            await RCBrowserHub.Clients.Client(browserHubConnectionID).SendAsync("IceCandidate", candidate);
        }
        public async Task SendConnectionFailedToBrowser(string browserHubConnectionID)
        {
            await RCBrowserHub.Clients.Client(browserHubConnectionID).SendAsync("ConnectionFailed");
        }

        public async Task NotifyConsoleRequesterUnattendedReady(string browserHubConnectionID)
        {
            await BrowserHub.Clients.Client(browserHubConnectionID).SendAsync("UnattendedRTCReady", Context.ConnectionId);
        }

        public async Task NotifyViewerDesktopSwitching(string viewerID)
        {
            await RCBrowserHub.Clients.Client(viewerID).SendAsync("DesktopSwitching");
        }
        public async Task LaunchRCInNewDesktop(string serviceID, string[] viewerIDs, string desktop)
        {
            await DeviceHub.Clients.Client(serviceID).SendAsync("LaunchRCInNewDesktop", viewerIDs, serviceID, desktop);
        }
        public async Task NotifyRequesterDesktopSwitchCompleted(string rcBrowserConnectionID)
        {
            await RCBrowserHub.Clients.Client(rcBrowserConnectionID).SendAsync("SwitchedDesktop", Context.ConnectionId);
        }
        public async Task DesktopSwitchFailed(string rcBrowserConnectionID)
        {
            await RCBrowserHub.Clients.Client(rcBrowserConnectionID).SendAsync("DesktopSwitchFailed");
        }
        public async Task GetIceConfiguration()
        {
            await Clients.Caller.SendAsync("IceConfiguration", AppConfig.IceConfiguration);
        }
        public async Task GetSessionID()
        {
            var random = new Random();
            var sessionID = "";
            for (var i = 0; i < 3; i++)
            {
                sessionID += random.Next(0, 999).ToString().PadLeft(3, '0');
            }
            Context.Items["SessionID"] = sessionID;
            Context.Items["Password"] = RNG.GenerateString(6);

            var attendedSessionInfo = new AttendedSessionInfo()
            {
                SignalRConnectionID = Context.ConnectionId,
                Password = Context.Items["Password"].ToString()
            };

            while (!AttendedSessionList.TryAdd(sessionID, attendedSessionInfo))
            {
                await Task.Delay(1000);
            }

            await Clients.Caller.SendAsync("SessionID", sessionID, Context.Items["Password"]);
        }
    }
}
