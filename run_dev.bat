@echo off

echo Starting JAPM API in development mode (Windows)...

:: Script para iniciar la aplicación NestJS en modo desarrollo con watch (Windows)
:: Script to start the NestJS application in development mode with watch (Windows)

echo "Starting the application in development mode (with pnpm)..."
REM Consider adding error check immediately after critical commands if needed
REM For now, pnpm itself usually shows good error messages.
pnpm run start:dev

:: Check if there was an error
IF %ERRORLEVEL% NEQ 0 (
    echo "Error starting the application."
    echo.
    echo An error occurred. Please check the output above.
    pause
    exit /b %ERRORLEVEL%
)

echo "Application finished." 