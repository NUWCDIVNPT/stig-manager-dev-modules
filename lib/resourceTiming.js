import { performance, PerformanceResourceTiming } from 'node:perf_hooks'

/**
 * Fetches a resource, optionally multiple times concurrently, and returns the resource timing information for each fetch.
 *
 * @async
 * @function getResourceTiming
 * @param {Object} options - The options for fetching the resource.
 * @param {string} options.url - The URL of the resource to be fetched.
 * @param {string} [options.method='get'] - The HTTP method of the fetch.
 * @param {string} [options.body=''] - The HTTP body of the fetch.
 * @param {string} options.token - The bearer token for authorization.
 * @param {number} [options.concurrent=1] - The number of concurrent fetch operations to perform.
 * @returns {Promise<PerformanceResourceTiming | PerformanceResourceTiming[]>} A `PerformanceResourceTiming` object if `concurrent` is 1, otherwise an array of `PerformanceResourceTiming` objects.
 * @throws {Error} If the `concurrent` value is less than 1.
 */

export async function getResourceTiming ({
  url,
  method,
  body,
  token,
  concurrent = 1
}) {
  if (concurrent < 1) throw new Error('concurrent value < 0')
  const fetchOptions = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }
  if (method === 'post' || method === 'put') fetchOptions.body = body
  const parallel = []
  for (let i=concurrent; i--;) {
    parallel.push(fetch(url, fetchOptions))
  }
  const responses = await Promise.all(parallel)
  await Promise.all(responses.map(r => r.text()))
  await new Promise(resolve => setTimeout(resolve,0))
  const performances = []
  for (const entry of performance.getEntriesByType('resource')) {
    if (entry.name === url) {
      performances.push(entry.toJSON())
    }
  }
  performance.clearResourceTimings(url)
  return concurrent === 1 ? performances[0] : performances
}