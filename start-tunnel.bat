@echo off
:loop
echo Starting localtunnel...
call npx.cmd localtunnel --port 3000 --subdomain socionet-daniel-app
echo Localtunnel disconnected. Restarting in 5 seconds...
timeout /t 5 /nobreak
goto loop
