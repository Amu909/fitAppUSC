$ErrorActionPreference = "Stop"

$workspace = Split-Path -Parent $PSScriptRoot
$backendHost = "127.0.0.1"
$backendPort = 8000
$healthUrl = "http://${backendHost}:${backendPort}/health"
$backendArgs = @(
  "-m",
  "uvicorn",
  "app.backend.app:app",
  "--host",
  $backendHost,
  "--port",
  "$backendPort"
)

function Test-BackendHealthy {
  param([string]$Url)

  try {
    $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2
    return $response.StatusCode -eq 200
  } catch {
    return $false
  }
}

function Start-BackendIfNeeded {
  if (Test-BackendHealthy -Url $healthUrl) {
    Write-Host "Backend ya estaba corriendo en $healthUrl"
    return
  }

  Write-Host "Iniciando backend local en $backendHost`:$backendPort ..."
  Start-Process `
    -FilePath "python" `
    -ArgumentList $backendArgs `
    -WorkingDirectory $workspace `
    -WindowStyle Hidden | Out-Null

  for ($i = 0; $i -lt 20; $i++) {
    Start-Sleep -Milliseconds 750
    if (Test-BackendHealthy -Url $healthUrl) {
      Write-Host "Backend listo en $healthUrl"
      return
    }
  }

  throw "El backend no respondio en $healthUrl."
}

Set-Location $workspace
Start-BackendIfNeeded

Write-Host "Abriendo Expo Web..."
npx expo start --web
