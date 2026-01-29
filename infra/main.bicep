param location string = resourceGroup().location
param aadTenantId string
param apiAudience string = 'api://sundries-api'
@secure()
param sqlAdminPassword string
param deploymentPrincipalObjectId string

var sqlAdminLogin = 'sundriesadmin'
var sqlServerName = toLower('sundriessql${uniqueString(resourceGroup().id, 'sql')}')
var databaseName = 'sundriesdb'
var lawName = toLower('sundries-law-${uniqueString(resourceGroup().id, 'law')}')
var aiName = toLower('sundries-ai-${uniqueString(resourceGroup().id, 'ai')}')
var keyVaultSuffix = replace(uniqueString(resourceGroup().id, 'kv'), '-', '')
var keyVaultName = toLower('sundrieskv${substring(keyVaultSuffix, 0, min(11, length(keyVaultSuffix)))}')
var appPlanName = 'sundries-plan-prod'
var apiAppName = 'sundries-api-prod'
var sqlServerHostnameSuffix = environment().suffixes.sqlServerHostname
var databaseConnectionString = 'Server=tcp:${sqlServerName}${sqlServerHostnameSuffix},1433;Initial Catalog=${databaseName};Persist Security Info=False;Encrypt=True;TrustServerCertificate=False;MultipleActiveResultSets=False;User ID=${sqlAdminLogin};Password=${sqlAdminPassword};'

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
  kind: 'web'
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

resource keyVault 'Microsoft.KeyVault/vaults@2024-11-01' = {
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

resource databaseSecret 'Microsoft.KeyVault/vaults/secrets@2024-11-01' = {
  parent: keyVault
  name: 'DatabaseConnectionString'
  properties: {
    value: databaseConnectionString
  }
}

resource appPlan 'Microsoft.Web/serverfarms@2024-11-01' = {
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

var aiConnectionString = appInsights.properties.ConnectionString

resource apiApp 'Microsoft.Web/sites@2024-11-01' = {
  name: apiAppName
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  kind: 'app,linux'
  properties: {
    serverFarmId: appPlan.id
    siteConfig: {
      linuxFxVersion: 'NODE|20-lts'
      appCommandLine: 'node dist/index.js'
      appSettings: [
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
          name: 'CAREHQ_ACCOUNT_ID'
          value: format('@Microsoft.KeyVault(SecretUri={0})', reference(resourceId('Microsoft.KeyVault/vaults/secrets', keyVault.name, 'CAREHQ_ACCOUNT_ID'), '2024-11-01').secretUriWithVersion)
        }
        {
          name: 'CAREHQ_API_KEY'
          value: format('@Microsoft.KeyVault(SecretUri={0})', reference(resourceId('Microsoft.KeyVault/vaults/secrets', keyVault.name, 'CAREHQ_API_KEY'), '2024-11-01').secretUriWithVersion)
        }
        {
          name: 'CAREHQ_API_SECRET'
          value: format('@Microsoft.KeyVault(SecretUri={0})', reference(resourceId('Microsoft.KeyVault/vaults/secrets', keyVault.name, 'CAREHQ_API_SECRET'), '2024-11-01').secretUriWithVersion)
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
          value: 'info'
        }
        {
          name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
          value: 'false'
        }
        {
          name: 'ENABLE_ORYX_BUILD'
          value: 'false'
        }
      ]
    }
  }
}

resource keyVaultApiPolicy 'Microsoft.KeyVault/vaults/accessPolicies@2024-11-01' = {
  parent: keyVault
  name: 'add'
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

output apiBaseUri string = 'https://${apiAppName}.azurewebsites.net'
output keyVaultName string = keyVault.name







