import { headers, parseError, getAuth, stellarNetwork, StellarSdk } from '../js/utils'
import Pool from '../js/pg'
import _ from 'lodash'
import moment from 'moment'

export default async (event, context) => {
  try {
    const h_auth = getAuth(event)

    const txn = new StellarSdk.Transaction(h_auth, stellarNetwork) 

    if (moment(txn.timeBounds.maxTime, 'X').isBefore()) throw {
      status: 401,
      message: 'Authorization header token has expired'
    }

    if (!StellarSdk.Utils.verifyTxSignedBy(txn, txn.source))
      throw `Authorization header missing ${txn.source.substring(0, 5)}…${txn.source.substring(txn.source.length - 5)} signature`

    const pgKeys = await Pool.query(`
      select * from keys
      where _user='${txn.source}'
    `).then((data) => _
      .chain(data)
      .get('rows')
      .map((key) => ({
        _key: key._key,
        cipher: key.cipher,
        name: key.name,
        image: key.image,
        link: key.link,
        verified: key.verifiedat
      }))
      .value()
    )

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ keys: pgKeys })
    }
  }

  catch(err) {
    return parseError(err)
  }
}