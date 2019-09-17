import _ from 'lodash'
import { StellarSdk, stellarNetwork, headers, parseError, getAuth } from '../js/utils'
import Pool from '../js/pg'
import pusher from '../js/pusher'
import moment from 'moment'

export default async (event, context) => {
  try {
    const h_auth = getAuth(event)
    const b_txn = _.get(JSON.parse(event.body), 'txn')

    const txn = new StellarSdk.Transaction(h_auth, stellarNetwork)

    if (moment(txn.timeBounds.maxTime, 'X').isBefore()) throw {
      status: 401,
      message: 'Authorization header token has expired'
    }

    if (!StellarSdk.Utils.verifyTxSignedBy(txn, txn.source))
      throw `Authorization header missing ${txn.source.substring(0, 5)}…${txn.source.substring(txn.source.length - 5)} signature`

    const pgTxn = await Pool.query(`
      select * from txns
      where _txn='${b_txn}'
        and status='sent'
    `).then((data) => _.get(data, 'rows[0]'))

    if (!pgTxn)
      throw 'Transaction doesn\'t exist or has already been rejected'

    await Pool.query(`
      update txns set
        status='rejected', 
        reviewedat='${moment().format('x')}'
      where _txn='${b_txn}'
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