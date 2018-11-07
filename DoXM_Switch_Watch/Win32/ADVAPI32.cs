using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Security;

namespace DoXM_Switch_Watch.Win32
{
    public static class ADVAPI32
    {
        public const int UOI_NAME = 2;

        [DllImport("user32.dll", SetLastError = true)]
        public static extern bool GetUserObjectInformationW(IntPtr hObj, int nIndex,
            [Out] byte[] pvInfo, uint nLength, out uint lpnLengthNeeded);
    }
}
