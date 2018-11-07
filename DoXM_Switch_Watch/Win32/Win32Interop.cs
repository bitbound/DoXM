using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text;
using static DoXM_Switch_Watch.Win32.ADVAPI32;
using static DoXM_Switch_Watch.Win32.User32;

namespace DoXM_Switch_Watch.Win32
{
    public class Win32Interop
    {

        public static IntPtr OpenInputDesktop()
        {
            return User32.OpenInputDesktop(0, false, ACCESS_MASK.GENERIC_ALL);
        }
        public static string GetCurrentDesktop()
        {
            var inputDesktop = OpenInputDesktop();
            byte[] deskBytes = new byte[256];
            uint lenNeeded;
            var success = GetUserObjectInformationW(inputDesktop, UOI_NAME, deskBytes, 256, out lenNeeded);
            if (!success)
            {
                return "default";
            }
            string deskName;
            deskName = Encoding.Unicode.GetString(deskBytes.Take((int)lenNeeded).ToArray()).Replace("\0", "");
            CloseDesktop(inputDesktop);
            return deskName;
        }
    }
}
