param location string = resourceGroup().location
param aadTenantId string
param webClientId string
param apiAudience string = 'api://sundries-api'
@secure()
param sqlAdminPassword string
param deploymentPrincipalObjectId string

var sqlAdminLogin = 'sundriesadmin'
var sqlServerName = toLower('sundriessql${uniqueString(resourceGroup().id, 'sql')}')
var databaseName = 'sundriesdb'
var lawName = toLower('sundries-law-${uniqueString(resourceGroup().id, 'law')}')
var aiName = toLower('sundries-ai-${uniqueString(resourceGroup().id, 'ai')}')
var keyVaultName = toLower('sundries-kv-${uniqueString(resourceGroup().id, 'kv')}')
var appPlanName = 'sundries-plan-prod'
var webAppName = 'sundries-web-prod'
var apiAppName = 'sundries-api-prod'
var sqlServerHostnameSuffix = environment().suffixes.sqlServerHostname
var databaseConnectionString = 'Server=tcp:${sqlServerName}.${sqlServerHostnameSuffix},1433;Initial Catalog=${databaseName};Persist Security Info=False;Encrypt=True;TrustServerCertificate=False;MultipleActiveResultSets=False;User ID=${sqlAdminLogin};Password=${sqlAdminPassword};'

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: lawName
  location: location
  properties: {
    retentionInDays: 30
  }
  sku: {
    name: 'PerGB2018'
  }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: aiName
  location: location
  properties: {
    Application_Type: 'web'
    Flow_Type: 'Bluefield'
    WorkspaceResourceId: logAnalytics.id
  }
}

resource sqlServer 'Microsoft.Sql/servers@2022-08-01-preview' = {
  name: sqlServerName
  location: location
  properties: {
    administratorLogin: sqlAdminLogin
    administratorLoginPassword: sqlAdminPassword
    version: '12.0'
    minimalTlsVersion: '1.2'
    publicNetworkAccess: 'Enabled'
  }
}

resource sqlDatabase 'Microsoft.Sql/servers/databases@2022-08-01-preview' = {
  parent: sqlServer
  name: databaseName
  location: location
  properties: {
    readScale: 'Disabled'
  }
  sku: {
    name: 'S0'
    tier: 'Standard'
  }
}

resource allowAzureServices 'Microsoft.Sql/servers/firewallRules@2022-08-01-preview' = {
  parent: sqlServer
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

resource keyVault 'Microsoft.KeyVault/vaults@2023-12-01' = {
  name: keyVaultName
  location: location
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: tenant().tenantId
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
    enablePurgeProtection: false
    accessPolicies: [
      {
        tenantId: tenant().tenantId
        objectId: deploymentPrincipalObjectId
        permissions: {
          secrets: [
            'get'
            'list'
            'set'
          ]
        }
      }
    ]
  }
}

resource databaseSecret 'Microsoft.KeyVault/vaults/secrets@2023-12-01' = {
  parent: keyVault
  name: 'DatabaseConnectionString'
  properties: {
    value: databaseConnectionString
  }
}

resource appPlan 'Microsoft.Web/serverfarms@2024-03-01' = {
  name: appPlanName
  location: location
  kind: 'linux'
  sku: {
    name: 'S1'
    tier: 'Standard'
    capacity: 1
  }
  properties: {
    reserved: true
  }
}

var apiBaseUri = 'https://${apiAppName}.azurewebsites.net'
var aiConnectionString = appInsights.listKeys('2020-02-02').connectionString

resource apiApp 'Microsoft.Web/sites@2024-03-01' = {
  name: apiAppName
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  kind: 'app,linux'
  properties: {
    serverFarmId: appPlan.id
    siteConfig: {
      linuxFxVersion: 'NODE|18-lts'
      appSettings: [
        {
          name: 'WEBSITE_RUN_FROM_PACKAGE'
          value: '1'
        }
        {
          name: 'APPINSIGHTS_CONNECTION_STRING'
          value: aiConnectionString
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: aiConnectionString
        }
        {
          name: 'KEYVAULT_NAME'
          value: keyVault.name
        }
        {
          name: 'DATABASE_URL'
          value: format('@Microsoft.KeyVault(SecretUri={0})', databaseSecret.properties.secretUriWithVersion)
        }
        {
          name: 'TENANT_ID'
          value: aadTenantId
        }
        {
          name: 'API_AUDIENCE'
          value: apiAudience
        }
        {
          name: 'LOG_LEVEL'
          value: 'Information'
        }
      ]
    }
  }
}

resource webApp 'Microsoft.Web/sites@2024-03-01' = {
  name: webAppName
  location: location
  kind: 'app,linux'
  properties: {
    serverFarmId: appPlan.id
    siteConfig: {
      linuxFxVersion: 'NODE|18-lts'
      appSettings: [
        {
          name: 'WEBSITE_RUN_FROM_PACKAGE'
          value: '1'
        }
        {
          name: 'APPINSIGHTS_CONNECTION_STRING'
          value: aiConnectionString
        }
        {
          name: 'VITE_API_BASE_URL'
          value: apiBaseUri
        }
        {
          name: 'VITE_AAD_CLIENT_ID'
          value: webClientId
        }
        {
          name: 'VITE_AAD_TENANT_ID'
          value: aadTenantId
        }
        {
          name: 'VITE_API_AUDIENCE'
          value: apiAudience
        }
        {
          name: 'KEYVAULT_NAME'
          value: keyVault.name
        }
      ]
    }
  }
}

resource keyVaultApiPolicy 'Microsoft.KeyVault/vaults/accessPolicies@2023-12-01' = {
  parent: keyVault
  name: 'add-api-policy'
  properties: {
    accessPolicies: [
      {
        tenantId: tenant().tenantId
        objectId: apiApp.identity.principalId
        permissions: {
          secrets: [
            'get'
            'list'
          ]
        }
      }
    ]
  }
}

output keyVaultName string = keyVault.name





