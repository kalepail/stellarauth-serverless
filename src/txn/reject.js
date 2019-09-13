import _ from 'lodash'
import { StellarSdk, stellarNetwork, headers, parseError } from '../js/utils'
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

    if (!pgTxn)
      throw 'Transaction doesn\'t exist or has already been rejected'

    if (!StellarSdk.Utils.verifyTxSignedBy(txn, pgTxn._key))
      throw `Transaction missing ${pgTxn._key.substring(0, 5)}…${pgTxn._key.substring(pgTxn._key.length - 5)} signature`

    await Pool.query(`
      update txns set
        status='rejected', 
        reviewedat='${moment().format('x')}'
      where _txn='${hash}'
    `)

    pusher.trigger(pgTxn._user, 'txnReject', {})

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