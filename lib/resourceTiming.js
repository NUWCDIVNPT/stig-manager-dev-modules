import { performance, PerformanceResourceTiming } from 'node:perf_hooks'
import * as auth from './auth.js'

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
 * @param {string} options.username - If token is not provided, try to fetch token using this username.
 * @param {string} options.password - If token is not provided, try to fetch token using this password.
 * @param {number} [options.concurrent=1] - The number of concurrent fetch operations to perform.
 * @returns {Promise<PerformanceResourceTiming | PerformanceResourceTiming[]>} A `PerformanceResourceTiming` object if `concurrent` is 1, otherwise an array of `PerformanceResourceTiming` objects.
 * @throws {Error} If the `concurrent` value is less than 1.
 */

export async function getResourceTiming ({
  url,
  method,
  body,
  token,
  username,
  password = 'password',
  concurrent = 1
}) {
  if (concurrent < 1) throw new Error('concurrent value < 0')
  if (username) {
    token = await auth.getAccessToken({username, password})
  }
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

/**
 * Retrieves performance timings for a list of HTTP requests. The function executes multiple
 * fetch requests based on the provided parameters, waits for a short delay to allow resource 
 * timing entries to be populated, then collects and returns the relevant performance entries.
 * 
 * @async
 * @function
 * @param {Array<Object>} [requests=[]] - An array of request objects, each containing details for the HTTP request.
 * @param {string} [requests[].method='get'] - The HTTP method to use for the request (e.g., 'GET', 'POST').
 * @param {string} requests[].url - The URL to which the request is sent.
 * @param {string} [requests[].body=''] - The body of the request, used for methods like POST.
 * @param {string} [requests[].contentType='application/json'] - The Content-Type header for the request.
 * @param {string} [requests[].token] - An optional authorization token for the request.
 * @param {string} [requests[].username] - An optional username for authentication, used to fetch a token.
 * @param {string} [requests[].password='password'] - An optional password for authentication, defaults to 'password'.
 * 
 * @returns {Promise<PerformanceResourceTiming[]>} A promise that resolves to an array of performance entries 
 *   in JSON format for the requested URLs.
 * 
 * @throws {Error} If a fetch request fails or if there are issues retrieving the access token.
 * 
 * @example
 * const timings = await getResourceTimings([
 *   { method: 'get', url: 'https://example.com/api/data' },
 *   { method: 'post', url: 'https://example.com/api/upload', body: '{"key":"value"}' }
 * ])
 * console.log(timings)
 */
export async function getResourceTimings (requests = []) {
  const urlSet = new Set()
  for (const request of requests) {
    let {
      method = 'get', 
      url, 
      body = '', 
      contentType = 'application/json',
      token,
      username,
      password = 'password'
    } = request
    const headers = {}
    headers['Content-Type'] = contentType
    if (username) {
      token = await auth.getAccessToken({username, password}) 
    }
    if (token) headers.Authorization = `Bearer ${token}`

    urlSet.add(url)

    const fetchOptions = {method, headers}
    if (body) fetchOptions.body = body
    const response = await fetch(url, fetchOptions)
    await response.text()
  }
  await new Promise(resolve => setTimeout(resolve,0))
  const performances = []
  for (const entry of performance.getEntriesByType('resource')) {
    if (urlSet.has(entry.name)) {
      performances.push(entry.toJSON())
    }
  }
  performance.clearResourceTimings()
  return performances
}
