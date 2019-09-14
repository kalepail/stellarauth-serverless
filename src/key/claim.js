import { headers, parseError, getAuth, StellarSdk, masterKeypair, stellarNetwork } from '../js/utils'
import _ from 'lodash'
import Pool from '../js/pg'
import pusher from '../js/pusher'
import moment from 'moment'

export default async (event, context) => {
  try {
    const h_auth = getAuth(event)
    const b_key = JSON.parse(event.body)

    if (!['passkey', 'app', 'cipher', 'key'].every((key) => key in b_key))
      throw 'Malformed request body'

    const txn = new StellarSdk.Transaction(h_auth, stellarNetwork)

    if (moment(txn.timeBounds.maxTime, 'X').isBefore()) throw {
      status: 401,
      message: 'Authorization header token has expired'
    }

    if (!StellarSdk.Utils.verifyTxSignedBy(txn, txn.source))
      throw `Authorization header missing ${txn.source.substring(0, 5)}…${txn.source.substring(txn.source.length - 5)} signature`

    let line1 = 'insert into keys (_master, _app, _user, _key, passkey, cipher'
    let line2 = `values ('${masterKeypair.publicKey()}', '${b_key.app}', '${txn.source}', '${b_key.key}', '${b_key.passkey}', '${b_key.cipher}'`

    if (b_key.name) {
      line1 += ', name'
      line2 += `, '${b_key.name}'`
    }

    if (b_key.image) {
      line1 += ', image'
      line2 += `, '${b_key.image}'`
    }

    if (b_key.link) {
      line1 += ', link'
      line2 += `, '${b_key.link}'`
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