import * as _StellarSdk from 'stellar-sdk'
import _ from 'lodash'

export const isDev = process.env.NODE_ENV !== 'production'
export const isTestnet = process.env.STELLAR_NETWORK === 'TESTNET'

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = isDev ? 0 : 1

export const server = new _StellarSdk.Server(process.env.HORIZON_URL)
export const masterKeypair = _StellarSdk.Keypair.fromSecret(process.env.MASTER_SECRET)
export const stellarNetwork = _StellarSdk.Networks[process.env.STELLAR_NETWORK]
export const StellarSdk = _StellarSdk

export const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Credentials': true
}

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
  // console.error(err)

  return {
    statusCode: error.status || err.status || 400,
    headers,
    body: JSON.stringify(error)
  }
}