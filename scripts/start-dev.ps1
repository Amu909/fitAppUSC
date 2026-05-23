$ErrorActionPreference = "Stop"

$workspace = Split-Path -Parent $PSScriptRoot
$backendHost = "127.0.0.1"
$backendPort = 8000
$healthUrl = "http://${backendHost}:${backendPort}/health"
$envFile = Join-Path $workspace ".env"
$backendArgs = @(
  "-m",
  "uvicorn",
  "app.backend.app:app",
  "--host",
  $backendHost,
  "--port",
  "$backendPort"
)

function Get-EnvValue {
  param(
    [string]$FilePath,
    [string]$Key
  )

  if (-not (Test-Path $FilePath)) {
    return $null
  }

  $line = Get-Content $FilePath | Where-Object { $_ -match "^\s*$Key\s*=" } | Select-Object -First 1
  if (-not $line) {
    return $null
  }

  $value = $line -replace "^\s*$Key\s*=\s*", ""
  return $value.Trim().Trim('"').Trim("'")
}

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
  $explicitApiBaseUrl = Get-EnvValue -FilePath $envFile -Key "EXPO_PUBLIC_API_BASE_URL"

  if ($explicitApiBaseUrl -and $explicitApiBaseUrl -match "^https?://") {
    try {
      $explicitHost = ([Uri]$explicitApiBaseUrl).Host
      if ($explicitHost -and $explicitHost -notin @("127.0.0.1", "localhost", "10.0.2.2")) {
        Write-Host "Backend remoto detectado en $explicitApiBaseUrl. No se iniciara backend local."
        return
      }
    } catch {
      Write-Host "No se pudo interpretar EXPO_PUBLIC_API_BASE_URL. Se intentara backend local."
    }
  }

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
