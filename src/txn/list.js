import { headers, getAuth, parseError, StellarSdk } from '../js/utils'
import Pool from '../js/pg'
import _ from 'lodash'

export default async (event, context) => {
  try {
    let pgTxns
    
    const h_auth = getAuth(event)
    const q_key = _.get(event.queryStringParameters, 'key')

    const someKeypair = StellarSdk.Keypair.fromSecret(h_auth)

    if (q_key) {
      pgTxns = await Pool.query(`
        select * from txns
        where _app='${someKeypair.publicKey()}'
          and _key='${q_key}'
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
    }

    else pgTxns = await Pool.query(`
      select * from txns
      where _user='${someKeypair.publicKey()}'
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