import { headers, StellarSdk, parseError, masterKeypair, getAuth, getMasterUserKeypair } from '../js/utils'
import Pool from '../js/pg'
import sjcl from 'sjcl'
import _ from 'lodash'

export default async (event, context) => {
  try {
    const q_key = _.get(event.queryStringParameters, 'key')
    const h_auth = getAuth(event)

    const pgKey = await Pool.query(`
      select * from keys
      where _key='${q_key}'
    `).then((data) => _.get(data, 'rows[0]'))

    const { masterUserKeypair } = getMasterUserKeypair(h_auth)

    const keyKeypair = StellarSdk.Keypair.fromSecret(
      sjcl.decrypt(
        masterUserKeypair.sec,
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