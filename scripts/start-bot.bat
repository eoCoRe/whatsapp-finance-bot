@echo off
cd /d "C:\Users\lucas\Downloads\projeto ia"
echo ---- Iniciando %date% %time% ---- >> bot.log
call npm run dev >> bot.log 2>&1
