import { headers, StellarSdk, parseError } from './js/utils'
import { Pool } from './js/pg'
import sjcl from 'sjcl'
import _ from 'lodash'

// TODO: use multisig to pass the key from the app to the user?

const create = (event, context) => {
  try {
    let h_auth = _.get(event, 'headers.Authorization', _.get(event, 'headers.authorization'))

    if (
      h_auth
      && h_auth.substring(0, 7) === 'Bearer '
    ) h_auth = h_auth.replace('Bearer ', '')

    else
      throw 'Authorization header malformed'

    const appKeypair = StellarSdk.Keypair.fromSecret(h_auth)
    const keyKeypair = StellarSdk.Keypair.random()

    const encrypted = Buffer.from(
      sjcl.encrypt(
        process.env.CRYPT_KEY,
        keyKeypair.secret(),
        {adata: JSON.stringify({
          app: appKeypair.publicKey(),
          key: keyKeypair.publicKey()
        })}
      )
    ).toString('base64')

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        app: appKeypair.publicKey(),
        key: keyKeypair.publicKey(),
        token: encrypted
      })
    }
  }

  catch(err) {
    return parseError(err)
  }
}

const claim = async (event, context) => {
  try {
    const b_token = _.get(JSON.parse(event.body), 'token')
    let h_auth = _.get(event, 'headers.Authorization', _.get(event, 'headers.authorization'))

    if (
      h_auth
      && h_auth.substring(0, 7) === 'Bearer '
    ) h_auth = h_auth.replace('Bearer ', '')

    else
      throw 'Authorization header malformed'

    const keySecret = sjcl.decrypt(
      process.env.CRYPT_KEY,
      Buffer.from(b_token, 'base64').toString()
    )

    const keyKeypair = StellarSdk.Keypair.fromSecret(keySecret)
    const userKeypair = StellarSdk.Keypair.fromSecret(h_auth)

    const data = JSON.parse(
      Buffer.from(
        _.get(
          JSON.parse(
            Buffer.from(
              b_token, 
              'base64'
            ).toString()
          ), 
          'adata'
        ), 
        'base64'
      ).toString()
    )

    const encrypted = Buffer.from(
      sjcl.encrypt(
        userKeypair.secret(),
        keyKeypair.secret(),
        {adata: JSON.stringify({
          app: data.app,
          user: userKeypair.publicKey(),
          key: data.key
        })}
      )
    ).toString('base64')

    data.user = userKeypair.publicKey()

    const result = await Pool.query(`
      insert into keys (_app, _user, _key, token)
      values ('${data.app}', '${data.user}', '${data.key}', '${encrypted}')
    `)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data)
    }
  }

  catch(err) {
    return parseError(err)
  }
}

// const get = async (event, context) => {
//   return {
//     statusCode: 200,
//     headers,
//     body: JSON.stringify({ message: 'Hello' })
//   }
// }

const post = async (event, context) => {
  switch (event.path) {
    case '/key/create':
    return create(event, context)

    case '/key/claim':
    return claim(event, context)

    default:
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: 'Route not supported' })
    }
  }
}

export default (event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false

  switch (event.httpMethod) {
    // case 'GET':
    // return get(event, context)

    case 'POST':
    return post(event, context)

    default:
      callback(null, {
        statusCode: 500,
        headers,
        body: JSON.stringify({ message: 'Method not supported' })
      })
    break
  }
}