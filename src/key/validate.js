import { headers, StellarSdk, parseError, masterKeypair, getAuth } from '../js/utils'
import { Pool } from '../js/pg'
import sjcl from 'sjcl'
import _ from 'lodash'
import shajs from 'sha.js'

export default async (event, context) => {
  try {
    const b_key = _.get(JSON.parse(event.body), 'key')
    const h_auth = getAuth(event)

    const pgKey = await Pool.query(`
      select * from keys
      where _key='${b_key}'
    `).then((data) => _.get(data, 'rows[0]'))

    const userSecretKey = new sjcl.ecc.elGamal.secretKey(
      sjcl.ecc.curves.c256,
      sjcl.ecc.curves.c256.field.fromBits(sjcl.codec.base64.toBits(h_auth))
    )

    const keyKeypair = StellarSdk.Keypair.fromSecret(
      sjcl.decrypt(
        userSecretKey,
        Buffer.from(pgKey.token, 'base64').toString()
      )
    )

    const encrypted = Buffer.from(
      sjcl.encrypt(
        shajs('sha256').update(masterKeypair.secret() + userSecretKey).digest('hex'), 
        keyKeypair.secret()
      )
    ).toString('base64')

    await Pool.query(`
      update keys set
      token='${encrypted}'
      where _key='${keyKeypair.publicKey()}'
    `)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: 200
      })
    }
  }

  catch(err) {
    return parseError(err)
  }
}