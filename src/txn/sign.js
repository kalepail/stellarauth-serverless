import _ from 'lodash'
import { server, headers, StellarSdk, parseError, getAuth, stellarNetwork, getMasterUserKeypair } from '../js/utils'
import Pool from '../js/pg'
import sjcl from 'sjcl'
import pusher from '../js/pusher'

export default async (event, context) => {
  try {
    const b_txn = _.get(JSON.parse(event.body), 'txn')
    const h_auth = getAuth(event)

    const pgTxn = await Pool.query(`
      select * from txns
      where _txn='${b_txn}'
      and status='sent'
    `).then((data) => _.get(data, 'rows[0]'))

    const pgKey = await Pool.query(`
      select * from keys
      where _key='${pgTxn._key}'
    `).then((data) => _.get(data, 'rows[0]'))

    const { masterUserKeypair } = getMasterUserKeypair(h_auth)

    const keyKeypair = StellarSdk.Keypair.fromSecret(
      sjcl.decrypt(
        masterUserKeypair.sec,
        Buffer.from(pgKey.cipher, 'base64').toString()
      )
    )

    const txn = new StellarSdk.Transaction(pgTxn.xdr, stellarNetwork)
        
    txn.sign(keyKeypair)

    await Pool.query(`
      update txns set
      status='signed',
      xdr='${txn.toXDR()}'
      where _txn='${b_txn}'
    `)

    pusher.trigger(pgKey._user, 'txnSign', {})

    const result = await server
    .submitTransaction(txn)
    .then(async (data) => {
      await Pool.query(`
        update txns set
        status='submitted',
        xdr='${txn.toXDR()}'
        where _txn='${b_txn}'
      `)

      return data
    })

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