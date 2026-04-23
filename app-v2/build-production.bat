@echo off
echo ===================================
echo BUILD DE PRODUCAO - APP V2
echo ===================================

echo.
echo [1/5] Limpando build anterior...
if exist dist rmdir /s /q dist

echo.
echo [2/5] Instalando dependencias (se necessario)...
call npm install

echo.
echo [3/5] Executando build de producao...
call npm run build

echo.
echo [4/5] Verificando resultado...
if not exist dist\index.html (
  echo ERRO: Build falhou! Arquivo index.html nao encontrado.
  pause
  exit /b 1
)

echo.
echo [5/5] Build concluido com sucesso!
echo.
echo Proximos passos:
echo 1. Faca backup do public_html atual no cPanel
echo 2. Acesse File Manager no cPanel
echo 3. Selecione todo o conteudo de public_html (EXCETO /api/) e DELETE
echo 4. Faca upload de TODO o conteudo da pasta dist\
echo 5. Certifique-se de que a pasta /api/ esta presente
echo 6. Acesse seu dominio e teste!
echo.
pause
