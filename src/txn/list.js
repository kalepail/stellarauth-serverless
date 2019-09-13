import { headers, parseError, stellarNetwork, StellarSdk, getAuth } from '../js/utils'
import Pool from '../js/pg'
import _ from 'lodash'
import moment from 'moment'

export default async (event, context) => {
  try {
    let pgTxns

    const h_auth = getAuth(event)
    const q_user = _.get(event.queryStringParameters, 'user')
    const q_key = _.get(event.queryStringParameters, 'key')

    if (q_user) {
      const txn = new StellarSdk.Transaction(h_auth, stellarNetwork)

      if (moment(txn.timeBounds.maxTime, 'X').isBefore()) throw {
        status: 401,
        message: 'Authorization header token has expired'
      }

      if (!StellarSdk.Utils.verifyTxSignedBy(txn, q_user))
        throw `Authorization header missing ${q_user.substring(0, 5)}…${q_user.substring(q_user.length - 5)} signature`

      pgTxns = await Pool.query(`
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
    }

    else if (q_key) {
      const appKeypair = StellarSdk.Keypair.fromSecret(h_auth)

      pgTxns = await Pool.query(`
        select * from txns
        where _key='${q_key}'
          and _app='${appKeypair.publicKey()}'
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