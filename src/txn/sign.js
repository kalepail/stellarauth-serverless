import _ from 'lodash'
import { server, headers, StellarSdk, parseError, getAuth, masterKeypair } from '../js/utils'
import { Pool } from '../js/pg'
import sjcl from 'sjcl'
import shajs from 'sha.js'

export default async (event, context) => {
  try {
    const b_xdr = _.get(JSON.parse(event.body), 'xdr')
    const h_auth = getAuth(event)

    const pgTxn = await Pool.query(`
      select * from txns
      where xdr='${b_xdr}'
    `).then((data) => _.get(data, 'rows[0]'))

    const pgKey = await Pool.query(`
      select * from keys
      where _key='${pgTxn._key}'
    `).then((data) => _.get(data, 'rows[0]'))

    const userSecretKey = new sjcl.ecc.elGamal.secretKey(
      sjcl.ecc.curves.c256,
      sjcl.ecc.curves.c256.field.fromBits(sjcl.codec.base64.toBits(h_auth))
    )

    const keyKeypair = StellarSdk.Keypair.fromSecret(
      sjcl.decrypt(
        shajs('sha256').update(masterKeypair.secret() + userSecretKey).digest('hex'),
        Buffer.from(pgKey.token, 'base64').toString()
      )
    )

    let txn = new StellarSdk.Transaction(b_xdr)
        
    txn.sign(keyKeypair)

    const result = await server.submitTransaction(txn)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    }
  }

  catch(err) {
    return parseError(err)
  }
}