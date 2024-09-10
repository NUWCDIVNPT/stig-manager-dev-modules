import { dereferenceSync } from '@trojs/openapi-dereference'
import { readFileSync } from 'node:fs'
import { load } from 'js-yaml'

class OAS {
  /**
   * 
   * @param {Object} options - the options for the instance.
   * @property {string} options.apiSpecPath - path to a YAML OAS specification.
   * @property {string} options.apiBase - the URL prefix for the URL generators
   */
  constructor({apiSpecPath, apiBase}) {
    Object.assign(this, { apiSpecPath, apiBase })
    /** @type {Map<string,{path, method, params}>} */
    this.spec = this.#buildOperationIdMap(apiSpecPath)
  }
  /**
   * 
   * @param {string} file path to a YAML OAS specification
   * @returns {Map<string,{path, method, params}>}
   */
  #buildOperationIdMap(file) {
      const spec = readFileSync(file, 'utf8')
      const oasDoc = load(spec)
      const s1 = dereferenceSync(oasDoc)
      const s2 = dereferenceSync(s1)
    
      const operationIds = new Map()
      const operations = ['get', 'post', 'patch', 'put', 'delete']
      const paths = s2.paths
      for (const [pathKey, pathValue] of Object.entries(paths)) {
        const commonParams = {}
        for (const [opKey, opValue] of Object.entries(pathValue)) {
          if (opKey === 'parameters') {
            opValue.reduce((a, v) => { a[v.name] = v; return a }, commonParams)
          }
          if (operations.includes(opKey)) {
            const opParams = { ...commonParams }
            opValue.parameters?.reduce((a, v) => { a[v.name] = v; return a }, opParams)
    
            // console.log(`   ${opKey}:${opValue.operationId}:${JSON.stringify(opParams)}`)
            operationIds.set(opValue.operationId, {
              path: pathKey,
              method: opKey,
              params: opParams,
            })
          }
        }
      }
      return operationIds
  }

  /**
   * 
   * @param {string} operationId 
   * @param {Object} params
   * @returns {string}
   */
  getUrl(operationId, params = {}) {
      const subs = {...params}
      const op = this.spec.get(operationId)
      if (!op) throw new Error('unknown operationId')
      // substitute path params
      const path = op.path.replace(/{(\w+)}/g, (_, key) => {
        if (subs[key] !== undefined) {
          delete subs[key]
          return params[key]
        }
        throw new Error(`path requires parameter ${_}`)
      })
    
      // append remaining params as query params
      const urlObj = new URL(`${this.apiBase}${path}`)
      for (const [key, value] of Object.entries(subs)) {
        if (Array.isArray(value)) {
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
 * Generates a list of URLs with each possible projection and all of them for a given operation.
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
    if (inParams.projection) throw new Error('projection parameter not allowed')
    const params =  {...inParams} 
    const projections = this.spec.get(operationId)?.params.projection?.schema?.items?.enum
    if (!projections) throw new Error(`no projections for operationId ${operationId}`)
    const urls = []
    for (const projection of projections) {
      params.projection = projection
      urls.push(this.getUrl(operationId, params))
    }
    params.projection = projections
    urls.push(this.getUrl(operationId, params))
    return urls
  }
}

export {OAS}