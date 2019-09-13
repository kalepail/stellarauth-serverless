import { headers, parseError, getAuth, stellarNetwork, StellarSdk } from '../js/utils'
import Pool from '../js/pg'
import _ from 'lodash'
import moment from 'moment'

export default async (event, context) => {
  try {
    const h_auth = getAuth(event)
    const q_user = _.get(event.queryStringParameters, 'user')

    const txn = new StellarSdk.Transaction(h_auth, stellarNetwork) 

    if (moment(txn.timeBounds.maxTime, 'X').isBefore()) throw {
      status: 401,
      message: 'Authorization header token has expired'
    }

    if (!StellarSdk.Utils.verifyTxSignedBy(txn, q_user))
      throw `Authorization header missing ${q_user.substring(0, 5)}…${q_user.substring(q_user.length - 5)} signature`

    const pgKeys = await Pool.query(`
      select * from keys
      where _user='${q_user}'
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