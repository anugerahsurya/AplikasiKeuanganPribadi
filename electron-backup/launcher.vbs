Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "d:\BPS\98. LOMBA\Ituang"
WshShell.Run Chr(34) & "d:\BPS\98. LOMBA\Ituang\node_modules\.bin\electron.cmd" & Chr(34) & " .", 0, False
