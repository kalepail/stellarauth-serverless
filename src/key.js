import { headers, StellarSdk, parseError, masterKeypair } from './js/utils'
import { Pool } from './js/pg'
import sjcl from 'sjcl'
import _ from 'lodash'
import shajs from 'sha.js'

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
        shajs('sha256').update(masterKeypair.secret() + appKeypair.secret()).digest('hex'),
        keyKeypair.secret(),
        {adata: JSON.stringify({
          master: masterKeypair.publicKey(),
          app: appKeypair.publicKey(),
          key: keyKeypair.publicKey()
        })}
      )
    ).toString('base64')

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        master: masterKeypair.publicKey(),
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

    data.user = h_auth

    const result = await Pool.query(`
      insert into keys (_master, _app, _user, _key, token)
      values ('${data.master}', '${data.app}', '${data.user}', '${data.key}', '${b_token}')
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

const verify = async (event, context) => {
  try {
    const b_token = _.get(JSON.parse(event.body), 'token')
    let h_auth = _.get(event, 'headers.Authorization', _.get(event, 'headers.authorization'))

    if (
      h_auth
      && h_auth.substring(0, 7) === 'Bearer '
    ) h_auth = h_auth.replace('Bearer ', '')

    else
      throw 'Authorization header malformed'

    const appKeypair = StellarSdk.Keypair.fromSecret(h_auth)
    const keyKeypair = StellarSdk.Keypair.fromSecret(
      sjcl.decrypt(
        shajs('sha256').update(masterKeypair.secret() + appKeypair.secret()).digest('hex'),
        Buffer.from(b_token, 'base64').toString()
      )
    )

    const result = await Pool.query(`
      select * from keys
      where _key='${keyKeypair.publicKey()}'
    `)

    const userPublicKey = new sjcl.ecc.elGamal.publicKey(
      sjcl.ecc.curves.c256, 
      sjcl.codec.base64.toBits(_.get(result, 'rows[0]._user'))
    )

    const encrypted = Buffer.from(
      sjcl.encrypt(userPublicKey, keyKeypair.secret())
    ).toString('base64')

    await Pool.query(`
      update keys set
      token='${encrypted}'
      where _key='${keyKeypair.publicKey()}'
    `)

    return {
      statusCode: 200,
      headers
    }
  }

  catch(err) {
    return parseError(err)
  }
}

const get = async (event, context) => {
  try {
    const q_key = _.get(event.queryStringParameters, 'key')
    let h_auth = _.get(event, 'headers.Authorization', _.get(event, 'headers.authorization'))

    if (
      h_auth
      && h_auth.substring(0, 7) === 'Bearer '
    ) h_auth = h_auth.replace('Bearer ', '')

    else
      throw 'Authorization header malformed'

    const result = await Pool.query(`
      select * from keys
      where _key='${q_key}'
    `)
    const token = _.get(result, 'rows[0].token')

    const userSecretKey = new sjcl.ecc.elGamal.secretKey(
      sjcl.ecc.curves.c256,
      sjcl.ecc.curves.c256.field.fromBits(sjcl.codec.base64.toBits(h_auth))
    )

    const keyKeypair = StellarSdk.Keypair.fromSecret(
      sjcl.decrypt(
        userSecretKey,
        Buffer.from(token, 'base64').toString()
      )
    )

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        publicKey: keyKeypair.publicKey(),
        secret: keyKeypair.secret()
      })
    }
  }

  catch(err) {
    return parseError(err)
  }
}

const post = async (event, context) => {
  switch (event.path) {
    case '/key/create':
    return create(event, context)

    case '/key/claim':
    return claim(event, context)

    case '/key/verify':
    return verify(event, context)

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
    case 'GET':
    return get(event, context)

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