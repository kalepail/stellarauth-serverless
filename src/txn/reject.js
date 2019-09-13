import _ from 'lodash'
import { headers, parseError } from '../js/utils'
import Pool from '../js/pg'
import pusher from '../js/pusher'
import moment from 'moment'

// TODO: Only the transaction owner should be able to reject transactions

export default async (event, context) => {
  try {
    const b_txn = _.get(JSON.parse(event.body), 'txn')

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