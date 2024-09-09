/**
 * Fetches the OpenID configuration from a well-known URL for the given authority.
 *
 * @async
 * @function getOpenIdConfiguration
 * @param {string} authority - The URL of the identity provider (issuer).
 * @returns {Promise<Object>} The OpenID configuration object.
 * @throws {Error} If the fetch request fails or times out.
 */
async function getOpenIdConfiguration(authority) {
  const wellKnownUrl = `${authority}/.well-known/openid-configuration`
  const response = await fetch(wellKnownUrl, { signal: AbortSignal.timeout(5000) })
  return response.json()
}

/**
 * @typedef {Object} OpenIdTokenResponse
 * @property {string} access_token - The access token issued by the authorization server.
 * @property {string} token_type - The type of the token issued. Typically "Bearer".
 * @property {number} expires_in - The lifetime in seconds of the access token.
 * @property {string} [refresh_token] - The token that can be used to refresh the access token.
 * @property {string} [id_token] - A JWT that contains identity information about the user.
 * @property {string} [scope] - The scope of the access token as granted by the authorization server.
 */

/**
 * Retrieves a token response from the token_endpoint of the specified authority.
 *
 * @async
 * @function getOpenIdTokens
 * @param {Object} options - The options for retrieving the tokens.
 * @param {string} [options.authority='http://localhost:8080/realms/stigman'] - The URL of the identity provider (issuer).
 * @param {string} [options.client_id='stig-manager'] - The client identifier.
 * @param {string} [options.grant_type='password'] - The grant type for authentication. Only 'password' is currently supported.
 * @param {string} [options.username='admin'] - The username for authentication.
 * @param {string} [options.password='password'] - The password for authentication.
 * @param {string} [options.scope='stig-manager'] - The scope of the access request.
 * @returns {Promise<OpenIdTokenResponse>} The token response object.
 * @throws {Error} If an unsupported grant type is provided; required parameters are missing; any fetch request fails or times out.
 */
async function getOpenIdTokens({
  authority = 'http://localhost:8080/realms/stigman',
  client_id = 'stig-manager',
  grant_type = 'password',
  username = 'admin',
  password = 'password',
  scope = 'stig-manager'
}) {
  if (grant_type !== 'password')
    throw new Error(`grantType '${grant_type}' not implemented`)
  if (!authority)
    throw new Error('missing authority')
  const tokenEndpoint = (await getOpenIdConfiguration(authority)).token_endpoint
  const response = await fetch(tokenEndpoint, {
    method: 'post',
    headers: {
      'Authorization': `Basic ${Buffer.from(client_id + ':').toString('base64')}`
    },
    body: new URLSearchParams({
      grant_type,
      username,
      password,
      scope
    }),
    signal: AbortSignal.timeout(5000)
  })
  return response.json()
}

/**
 * Convenience function to return only the access token from getOpenIdTokens().
 *
 * @async
 * @function getAccessToken
 * @see getOpenIdTokens for parameter details.
 * @param {Object} options - See {@link getOpenIdTokens} for the structure of options.
 * @returns {Promise<string>} The access token.
 */
async function getAccessToken(options) {
  return (await getOpenIdTokens(options)).access_token
}

export {
  getOpenIdConfiguration,
  getOpenIdTokens,
  getAccessToken
}
