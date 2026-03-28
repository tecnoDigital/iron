@echo off
setlocal

echo [IronPay] Installing/updating dependencies...
call npm install
if errorlevel 1 (
  echo [IronPay] npm install failed.
  exit /b 1
)

echo [IronPay] Starting dev server...
call npm run dev
