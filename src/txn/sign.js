import _ from 'lodash'
import { server, headers, StellarSdk, parseError, stellarNetwork } from '../js/utils'
import Pool from '../js/pg'
import pusher from '../js/pusher'
import moment from 'moment'

export default async (event, context) => {
  try {
    const b_xdr = _.get(JSON.parse(event.body), 'xdr')

    const txn = new StellarSdk.Transaction(b_xdr, stellarNetwork)
    const hash = txn.hash().toString('hex')

    const pgTxn = await Pool.query(`
      select * from txns
      where _txn='${hash}'
        and status='sent'
    `).then((data) => _.get(data, 'rows[0]'))

    if (!StellarSdk.Utils.verifyTxSignedBy(txn, pgTxn._key))
      throw `Transaction missing ${pgTxn._key.substring(0, 5)}…${pgTxn._key.substring(pgTxn._key.length - 5)} signature`

    const pgKey = await Pool.query(`
      select * from keys
      where _key='${pgTxn._key}'
    `).then((data) => _.get(data, 'rows[0]'))

    await Pool.query(`
      update txns set
        status='signed', 
        xdr='${b_xdr}',
        reviewedat='${moment().format('x')}'
      where _txn='${hash}'
    `)

    pusher.trigger(pgKey._user, 'txnSign', {})

    const result = await server
    .submitTransaction(txn)
    .then(async (data) => {
      await Pool.query(`
        update txns set
          status='submitted',
          reviewedat='${moment().format('x')}'
        where _txn='${hash}'
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