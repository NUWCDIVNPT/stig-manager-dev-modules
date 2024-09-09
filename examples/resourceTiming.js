import {auth, resourceTiming} from '../index.js'

const apiBase = 'http://localhost:64001/api'
const username = 'stigmanadmin'
const url = `${apiBase}/collections/30?projection=labels`

const token = await auth.getAccessToken({username})

const timing = await resourceTiming.getResourceTiming({url, token})
console.log(`${timing.name}: ${timing.responseStart - timing.requestStart}`)
