import { OpenApiOps } from '../index.js'

// Fetch the OAS definition from a running STIG Manager
const definition = await(await fetch(`http://localhost:54000/api/op/definition`)).json()

// Create an instance of the OpenApiOps class. The instance's URL generators 
// will use server[0].url as a base. Optionally, the apiBase can be provided
// to the constructor
const oas = new OpenApiOps({ definition })

/** 
 * Get operationIds by method, partial path, param, or projection
 */
{
  const filters = [
    {method: 'get', projection: 'labels'},
    {path: '{ruleId}'}, // or {param: 'ruleId', paramIn: 'path'}
    {param: 'ruleId', paramIn: 'query'},
    {param: null},      // matches operations without params
    {projection: null}, //matches operations without projections
  ]
  for (const filter of filters) {
    const operationIds = oas.getOperationIds(filter)
    const title = `getOperationsIds => ${JSON.stringify(filter)}`
    console.log(`${title}\nOUTPUT: ${JSON.stringify(operationIds)}\n`)
  }
}

/**
 * Generate a URL from an operationId and parameters.
 * The parameters are either inserted in the path or appended as query params.
 */ 
{
  // Common parameters, any that are not applicable to an operation are ignored
  const params = {
    collectionId: 1,
    assetId: 2,
    name: 'mydomain\\pc',
    benchmarkId: 'VPN_SRG',
    labelName: 'labelA'
  }

  const operationIds = [
    'getCollection',
    'getCollections',
    'getAsset',
    'getAssetsByStig'
  ]
  for (const operationId of operationIds) {
    const url = oas.getUrl(operationId, params)
    const title = `getUrl => ${operationId}, ${JSON.stringify(params)}`
    console.log(`${title}\nOUTPUT: ${url}\n`)
  }
}

/**
 * Generate a URL from an operationId and parameters with an array
 */
{
  const params = {
    collectionId: 1,
    labelName: ['label A', 'label B', 'label C']
  }

  const operationId = 'getAssets'
  const url = oas.getUrl(operationId, params)
  const title = `getUrl => ${operationId}, ${JSON.stringify(params)}`
  console.log(`${title}\nOUTPUT: ${url}\n`)
}

/**
 * Generate a set of URLs for an operationId having projections.
 * Creates one URL for each projection and one for all projections.
 */
{
  const params = {
    collectionId: 1
  }
  const operationId = 'getCollection'
  const urls = oas.getProjectedUrls(operationId, params)
  const title = `getProjectedUrls => ${operationId}, ${JSON.stringify(params)}`
  console.log(`${title}\nOUTPUT: ${JSON.stringify(urls, null, 2)}\n`)
}