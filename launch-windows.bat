@echo off
setlocal
cd /d "%~dp0"
where python3 >nul 2>&1
if %errorlevel%==0 (
  python3 server.py
  goto :eof
)
where py >nul 2>&1
if %errorlevel%==0 (
  py -3 server.py
  goto :eof
)
where python >nul 2>&1
if %errorlevel%==0 (
  python server.py
  goto :eof
)
echo Python 3 is required to launch Snowball Siege, but it was not found.
echo Install Python 3 from https://www.python.org/downloads/ and run this launcher again.
pause
exit /b 1
