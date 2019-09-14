import { headers, parseError, getAuth, StellarSdk, stellarNetwork } from '../js/utils'
import _ from 'lodash'
import Pool from '../js/pg'
import pusher from '../js/pusher'
import moment from 'moment'

export default async (event, context) => {
  try {
    const h_auth = getAuth(event)
    const b_token = _.get(JSON.parse(event.body), 'token')
    const b_pubkey = _.get(JSON.parse(event.body), 'pubkey')

    const txn = new StellarSdk.Transaction(h_auth, stellarNetwork)

    if (moment(txn.timeBounds.maxTime, 'X').isBefore()) throw {
      status: 401,
      message: 'Authorization header token has expired'
    }

    if (!StellarSdk.Utils.verifyTxSignedBy(txn, txn.source))
      throw `Authorization header missing ${txn.source.substring(0, 5)}…${txn.source.substring(txn.source.length - 5)} signature`

    const data = JSON.parse(
      Buffer.from(
        _.get(
          JSON.parse(
            Buffer.from(
              b_token, 
              'base64'
            ).toString()
          ), 
          'adata'
        ), 
        'base64'
      ).toString()
    )

    let line1 = 'insert into keys (_master, _app, _user, _key, pubkey, cipher'
    let line2 = `values ('${data.master}', '${data.app}', '${txn.source}', '${data.key}', '${b_pubkey}', '${b_token}'`

    if (data.name) {
      line1 += ', name'
      line2 += `, '${data.name}'`
    }

    if (data.image) {
      line1 += ', image'
      line2 += `, '${data.image}'`
    }

    if (data.link) {
      line1 += ', link'
      line2 += `, '${data.link}'`
    }
    
    await Pool.query(`
      ${line1})
      ${line2})
    `)

    pusher.trigger(txn.source, 'keyClaim', {})

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