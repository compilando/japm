@echo off

:: Script para iniciar la aplicación NestJS en modo desarrollo con watch (Windows)

echo "Iniciando la aplicacion en modo desarrollo (con pnpm)..."
pnpm run start:dev

:: Comprobar si hubo un error
IF %ERRORLEVEL% NEQ 0 (
    echo "Error al iniciar la aplicacion."
    exit /b %ERRORLEVEL%
)

echo "Aplicacion finalizada." 