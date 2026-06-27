@echo off
cd "c:\users\daniel\Downloads\mybestproject-main (9)\mybestproject-main"
start /B node server.cjs
start /B node serve-public.cjs
start /B npx localtunnel --port 3000 --subdomain socionet-daniel-app
