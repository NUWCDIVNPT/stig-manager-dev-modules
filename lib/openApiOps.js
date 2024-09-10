import { dereferenceSync } from '@trojs/openapi-dereference'
import { readFileSync } from 'node:fs'
import { load } from 'js-yaml'

class OpenApiOps {
  /**
   * A Class for working with an OAS definition by operationId.
   * 
   * @param {Object} options - the options for the instance.
   * @property {string} options.apiSpecPath - path to an OAS definition in YAML format.
   * @property {string} options.apiBase - the URL prefix for the URL generators
   */
  constructor({ apiSpecPath, apiBase }) {
    Object.assign(this, { apiSpecPath, apiBase })
    /**
     * @type {Object} the OAS document in JSON format
     */
    this.oasJson = load(readFileSync(apiSpecPath, 'utf8'))

    /** @type {Map<string,{path, method, params}>} */
    this.operationMap = this.#buildOperationIdMap(this.oasJson)
  }
  /**
   * Creates and populates an operationMap from an OAS definition
   * 
   * @param {Object} oasJson parsed JSON of the OAS definition
   * @returns {Map<string,{path, method, params}>}
   */
  #buildOperationIdMap(oasJson) {
    // buggy module requires double de-referencing to reach our depths
    const oasDeref = dereferenceSync(dereferenceSync(oasJson))
    const operationMap = new Map()
    const operations = ['get', 'post', 'patch', 'put', 'delete']
    const paths = oasDeref.paths
    for (const [pathKey, pathValue] of Object.entries(paths)) {
      const commonParams = {}
      for (const [key, value] of Object.entries(pathValue)) {
        // handle the parameters defined for all operations under the path
        if (key === 'parameters') {
          value.reduce((a, v) => { a[v.name] = v; return a }, commonParams)
        }
        // handle an operation key
        if (operations.includes(key)) {
          // clone the common parameters
          const opParams = { ...commonParams }
          // add the operation defined parameters, if any
          value.parameters?.reduce((a, v) => { a[v.name] = v; return a }, opParams)
          operationMap.set(value.operationId, {
            path: pathKey,
            method: key,
            params: opParams,
          })
        }
      }
    }
    return operationMap
  }

  /**
   * For a given operationId and parameters, generate the URL
   * 
   * @param {string} operationId 
   * @param {Object} params
   * @returns {string}
   */
  getUrl(operationId, inParams = {}) {
    // clone the params argument so we don't mutate it
    const params = { ...inParams }

    const op = this.operationMap.get(operationId)
    // throw if the operationId is not defined
    if (!op) {
      throw new Error('unknown operationId')
    }

    // throw if any of the params are not defined for the operationId
    for (const param in params) {
      if (!op.params[param]) {
        throw new Error(`parameter ${param} not defined for ${operationId}`)
      }
    }

    // substitute the path params, deleting from params, throwing if one is missing
    const path = op.path.replace(/{(\w+)}/g, (template, key) => {
      if (params[key] === undefined) {
        throw new Error(`path requires parameter ${template}`)
      }
      delete params[key]
      return inParams[key]
    })

    // append remaining params as query params
    const urlObj = new URL(`${this.apiBase}${path}`)
    for (const [key, value] of Object.entries(params)) {
      if (Array.isArray(value)) {
        // Use form/explode style for array query params
        for (const item of value) {
          urlObj.searchParams.append(key, item)
        }
      }
      else {
        urlObj.searchParams.append(key, value)
      }
    }
    return urlObj.toString()
  }

  /**
   * For a given operationId, generates a list of URLs with each possible projection and all of them.
   *
   * @method getProjectedUrls
   * @param {string} operationId - The identifier for the operation to retrieve projections.
   * @param {Object} inParams - The input parameters to be used for generating URLs.
   * @param {string} [inParams.projection] - The projection parameter (not allowed in this method).
   * @throws {Error} If the `projection` parameter is provided in `inParams`.
   * @throws {Error} If no projections are available for the given `operationId`.
   * @returns {string[]} An array of URLs with different projections for the given operation.
   */
  getProjectedUrls(operationId, inParams) {
    // iteration: maybe handle this silently?
    if (inParams.projection) throw new Error('projection parameter not allowed')
    // clone the params argument so we don't mutate it
    const params = { ...inParams }
    const projections = this.operationMap.get(operationId)?.params.projection?.schema?.items?.enum
    // iterate: maybe allow and just output a single url without projections?
    if (!projections) throw new Error(`no projections for operationId ${operationId}`)

    const urls = []
    // a url for each projection
    for (const projection of projections) {
      params.projection = projection
      urls.push(this.getUrl(operationId, params))
    }
    // a url with all the projections
    params.projection = projections
    urls.push(this.getUrl(operationId, params))
    return urls
  }
}

export { OpenApiOps }