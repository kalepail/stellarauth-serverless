import { headers, StellarSdk, parseError, masterKeypair, getAuth } from '../js/utils'
import { Pool } from '../js/pg'
import sjcl from 'sjcl'
import _ from 'lodash'
import shajs from 'sha.js'

export default async (event, context) => {
  try {
    const q_key = _.get(event.queryStringParameters, 'key')
    const h_auth = getAuth(event)

    const pgKey = await Pool.query(`
      select * from keys
      where _key='${q_key}'
    `).then((data) => _.get(data, 'rows[0]'))

    const userKeypair = StellarSdk.Keypair.fromSecret(h_auth)

    const masterUserSecret = sjcl.codec.base64.toBits(shajs('sha256').update(masterKeypair.secret() + userKeypair.secret()).digest('base64'))
    const masterUserKeyPair = sjcl.ecc.elGamal.generateKeys(256, 6, masterUserSecret)

    const keyKeypair = StellarSdk.Keypair.fromSecret(
      sjcl.decrypt(
        masterUserKeyPair.sec,
        Buffer.from(pgKey.cipher, 'base64').toString()
      )
    )

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