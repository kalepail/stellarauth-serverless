import * as _StellarSdk from 'stellar-sdk'
import _ from 'lodash'

export const headers = {
  'Access-Control-Allow-Origin': '*'
}

export const isDev = process.env.NODE_ENV !== 'production'
export const isTestnet = process.env.STELLAR_NETWORK === 'TESTNET'

export const server = new _StellarSdk.Server(process.env.HORIZON_URL)
export const source = _StellarSdk.Keypair.fromSecret(process.env.AUTH_SECRET)

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = isDev ? 0 : 1

_StellarSdk.Network.use(
  new _StellarSdk.Network(_StellarSdk.Networks[process.env.STELLAR_NETWORK])
)

export const StellarSdk = _StellarSdk

export function parseError(err) {
  const error = 
  typeof err === 'string' 
  ? { message: err } 
  : err.response && err.response.data 
  ? err.response.data 
  : err.response 
  ? err.response
  : err.message 
  ? { message: err.message }
  : err

  console.error(error)
  console.error(err)

  return {
    statusCode: error.status || err.status || 400,
    headers,
    body: JSON.stringify(error)
  }
}

export const masterKeypair = StellarSdk.Keypair.fromSecret(process.env.CRYPT_KEY)

export function getAuth(event) {
  let h_auth = _.get(event, 'headers.Authorization', _.get(event, 'headers.authorization'))

  if (
    h_auth
    && h_auth.substring(0, 7) === 'Bearer '
  ) h_auth = h_auth.replace('Bearer ', '')

  else
    throw 'Authorization header malformed'

  return h_auth
}