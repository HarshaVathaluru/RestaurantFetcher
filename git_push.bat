@echo off
setlocal
set GIT="C:\Program Files\Git\cmd\git.exe"

echo Pushing to GitHub...
%GIT% push -u origin main --force

echo.
echo Done!
endlocal
