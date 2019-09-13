import { headers, getAuth, parseError, StellarSdk } from '../js/utils'
import Pool from '../js/pg'
import _ from 'lodash'

// TODO:
// This call is too open. 
// Allows anyone with user's public key to view all user's transactions 
// or even just a key's public key to view all that key's transactions
// Apps should only be allowed to view a singular key's transactions
// Users should be limited to viewing only their own transactions

export default async (event, context) => {
  try {
    let pgTxns
    
    const q_user = _.get(event.queryStringParameters, 'user')
    const q_key = _.get(event.queryStringParameters, 'key')

    if (q_user) pgTxns = await Pool.query(`
      select * from txns
      where _user='${q_user}'
    `).then((data) => _
      .chain(data)
      .get('rows')
      .map((txn) => ({
        _txn: txn._txn,
        _key: txn._key,
        requestedat: txn.requestedat,
        reviewedat: txn.reviewedat,
        status: txn.status,
        xdr: txn.xdr
      }))
      .value()
    )

    else if (q_key) pgTxns = await Pool.query(`
      select * from txns
      where _key='${q_key}'
    `).then((data) => _
      .chain(data)
      .get('rows')
      .map((txn) => ({
        _txn: txn._txn,
        requestedat: txn.requestedat,
        reviewedat: txn.reviewedat,
        status: txn.status,
        xdr: txn.xdr
      }))
      .value()
    )

    else
      throw 'Include either a `user` or `key` parameter'

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ txns: pgTxns })
    }
  }

  catch(err) {
    return parseError(err)
  }
}