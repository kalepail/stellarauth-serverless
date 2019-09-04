import _ from 'lodash'
import { headers, StellarSdk, parseError, getAuth } from '../js/utils'
import Pool from '../js/pg'
import pusher from '../js/pusher'
import moment from 'moment'

export default async (event, context) => {
  try {
    const b_txn = _.get(JSON.parse(event.body), 'txn')
    const h_auth = getAuth(event)

    const pgTxn = await Pool.query(`
      select * from txns
      where _txn='${b_txn}'
        and status='sent'
    `).then((data) => _.get(data, 'rows[0]'))

    if (!pgTxn)
      throw 'Transaction doesn\'t exist or has already been rejected'

    StellarSdk.Keypair.fromSecret(h_auth)

    await Pool.query(`
      update txns set
        status='rejected', 
        reviewedat='${moment().format('x')}'
      where _txn='${b_txn}'
        and _user='${pgTxn._user}'
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