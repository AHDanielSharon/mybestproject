Set objShell = CreateObject("WScript.Shell")
objShell.CurrentDirectory = "c:\users\daniel\Downloads\mybestproject-main (9)\mybestproject-main"
objShell.Run "cmd /c node server.cjs > server.log 2>&1", 0, False
objShell.Run "cmd /c node serve-public.cjs > proxy.log 2>&1", 0, False
objShell.Run "cmd /c cloudflared tunnel --url http://localhost:3000 > cloudflared.log 2>&1", 0, False
