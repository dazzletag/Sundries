param(
  [string]$location = "uksouth",
  [string]$sqlPassword = $env:SQL_ADMIN_PASSWORD,
  [string]$aadTenantId = $env:AAD_TENANT_ID,
  [string]$webClientId = $env:AAD_CLIENT_ID,
  [string]$apiAudience = $env:API_AUDIENCE ?? "api://sundries-api"
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

Write-Host "Ensuring account is initialized..."
az account show > $null

$principalId = $null
if ($env:AZURE_CLIENT_ID) {
  $principalId = az ad sp show --id $env:AZURE_CLIENT_ID --query objectId -o tsv
} else {
  $principalId = az ad signed-in-user show --query objectId -o tsv
}

if (-not $principalId) {
  throw "Unable to resolve the deployment principal objectId."
}

Write-Host "Creating resource group BCHSystems in $location..."
az group create -n BCHSystems -l $location | Out-Null

$parameters = @{
  sqlAdminPassword              = $sqlPassword
  aadTenantId                   = $aadTenantId
  webClientId                   = $webClientId
  apiAudience                   = $apiAudience
  deploymentPrincipalObjectId   = $principalId
}

Write-Host "Deploying infrastructure..."
az deployment group create \
  --resource-group BCHSystems \
  --template-file "$PSScriptRoot\main.bicep" \
  --parameters $parameters




