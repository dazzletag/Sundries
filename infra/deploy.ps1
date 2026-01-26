param(
  [string]$location = "uksouth",
  [string]$sqlPassword = $env:SQL_ADMIN_PASSWORD,
  [string]$aadTenantId = $env:AAD_TENANT_ID,
  [string]$webClientId = $env:AAD_CLIENT_ID,
  [string]$apiAudience = $env:API_AUDIENCE,
  [string]$deploymentPrincipalObjectId = $env:AZURE_CLIENT_OBJECT_ID
)

Set-StrictMode -Version Latest

if (-not $sqlPassword) {
  throw "Set SQL_ADMIN_PASSWORD before running this script."
}

if (-not $aadTenantId) {
  throw "Set AAD_TENANT_ID for your directory."
}

if (-not $webClientId) {
  throw "Set AAD_CLIENT_ID (web client) before running this script."
}

if (-not $apiAudience) {
  $apiAudience = "api://sundries-api"
}

Write-Host "Ensuring account is initialized..."
az account show > $null

$principalId = $deploymentPrincipalObjectId

if (-not $principalId) {
  if ($env:AZURE_CLIENT_ID) {
    $principalId = az ad sp show --id $env:AZURE_CLIENT_ID --query objectId -o tsv
  } else {
    $principalId = az ad signed-in-user show --query id -o tsv
  }
}

if (-not $principalId) {
  throw "Unable to resolve the deployment principal objectId."
}

Write-Host "Creating resource group BCHSystems in $location..."
az group create -n BCHSystems -l $location | Out-Null

$parameters = @{
  sqlAdminPassword            = $sqlPassword
  aadTenantId                 = $aadTenantId
  webClientId                 = $webClientId
  apiAudience                 = $apiAudience
  deploymentPrincipalObjectId = $principalId
}

Write-Host "Deploying infrastructure..."
$parameterFile = Join-Path $env:TEMP ("sundries-deploy-parameters-{0}.json" -f [guid]::NewGuid())
$parameterTemplate = @{
  '$schema'        = 'https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#'
  contentVersion   = '1.0.0.0'
  parameters       = @{}
}

foreach ($key in $parameters.Keys) {
  $parameterTemplate.parameters[$key] = @{
    value = $parameters[$key]
  }
}

$parameterTemplate | ConvertTo-Json -Depth 10 | Set-Content -Path $parameterFile -Encoding utf8

try {
  az deployment group create --resource-group BCHSystems --template-file "$PSScriptRoot\main.bicep" --parameters "@$parameterFile"
}
finally {
  Remove-Item -Path $parameterFile -ErrorAction SilentlyContinue
}
