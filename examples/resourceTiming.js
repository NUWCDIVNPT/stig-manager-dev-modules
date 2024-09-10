import { auth, resourceTiming, OAS } from '../index.js'

// common for all examples
// OAS class lets us create URLs from OAS operationIds and parameters
const apiBase = 'http://localhost:64001/api'
const apiSpecPath = '/home/csmig/dev/stig-manager-csmig/api/source/specification/stig-manager.yaml'
const oas = new OAS({ apiSpecPath, apiBase })

// A. Get timings for one request using a pre-fetched token
{
  const url = oas.getUrl('getCollection', {
    collectionId: 1,
    projection: ['labels'],
    elevate: true
  })
  const username = 'stigmanadmin'
  const token = await auth.getAccessToken({ username })
  const timing = await resourceTiming.getResourceTiming({ url, token })
  console.log(`A: ${timing.name}: ${timing.responseStart - timing.requestStart} (${username})`)
}

// B. Get timings for one request with username provided instead of token (token fetched dynamically)
{
  const url = oas.getUrl('getAsset', {
    assetId: 1,
    projection: ['stigs']
  })
  const username = 'stigmanadmin'
  const timing = await resourceTiming.getResourceTiming({ url, username })
  console.log(`B: ${timing.name}: ${timing.responseStart - timing.requestStart} (${username})`)
}

// C. Get timings for multiple requests with different users
{
  const url = `${apiBase}/assets/1?projection=stigs`
  const requests = [
    { url, username: 'admin' },
    { url, username: 'user01' },
    { url, username: 'user02' },
    { url, username: 'stigmanadmin' }
  ]

  const timings = await resourceTiming.getResourceTimings(requests)

  let index = 0
  for (const time of timings) {
    console.log(`C: ${time.name}: ${time.responseStart - time.requestStart} (${requests[index].username})`)
    index++
  }
}

// D. Get timings for an operationId, with each projection and all of them
{
  const username = 'admin'
  const urls = oas.getProjectedUrls('getCollection', { collectionId: 1, elevate: true })
  const requests = urls.map(url => ({ username, url }))

  const timings = await resourceTiming.getResourceTimings(requests)

  let index = 0
  for (const time of timings) {
    console.log(`D: ${time.name}: ${time.responseStart - time.requestStart} (${requests[index].username})`)
    index++
  }
}
