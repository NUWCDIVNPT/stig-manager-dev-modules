import {auth, resourceTiming} from '../index.js'

// common for all examples
const apiBase = 'http://localhost:64001/api'


// A. Get timings for one request with pre-fetched token 
const url = `${apiBase}/collections/30?projection=labels`
const token = await auth.getAccessToken({username: 'stigmanadmin'})
const t1 = await resourceTiming.getResourceTiming({url, token})
console.log(`A: ${t1.name}: ${t1.responseStart - t1.requestStart}`)
console.log()

// B. Get timings for one request with username provided (token fetched dynamically)
const t2 = await resourceTiming.getResourceTiming({url, username: 'stigmanadmin'})
console.log(`B: ${t2.name}: ${t2.responseStart - t2.requestStart}`)
console.log()

// C. Get timings for multiple requests, some with usernames and one with pre-fetched token
const requests = [
  {
    url: `${apiBase}/collections/30?projection=labels`,
    token
  },
  {
    url: `${apiBase}/collections/30?projection=labels`,
    username: 'admin'
  },
  {
    url: `${apiBase}/assets/30?projection=stigs`,
    username: 'user01'
  },
  {
    url: `${apiBase}/assets/30?projection=stigs`,
    username: 'user02'
  }
]

const timings = await resourceTiming.getResourceTimings(requests)
for (const time of timings) {
  console.log(`C: ${time.name}: ${time.responseStart - time.requestStart}`)
}