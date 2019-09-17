import { headers, parseError, getAuth, StellarSdk, masterKeypair, stellarNetwork } from '../js/utils'
import _ from 'lodash'
import Pool from '../js/pg'
import pusher from '../js/pusher'
import moment from 'moment'
import jwt from 'jsonwebtoken'

export default async (event, context) => {
  try {
    const h_auth = getAuth(event)
    const body = JSON.parse(event.body)

    if (!['jwt', 'cipher', 'key'].every((key) => key in body))
      throw 'Malformed request body'

    const txn = new StellarSdk.Transaction(h_auth, stellarNetwork)

    if (moment(txn.timeBounds.maxTime, 'X').isBefore()) throw {
      status: 401,
      message: 'Authorization header token has expired'
    }

    if (!StellarSdk.Utils.verifyTxSignedBy(txn, txn.source))
      throw `Authorization header missing ${txn.source.substring(0, 5)}…${txn.source.substring(txn.source.length - 5)} signature`

    const {data: key} = jwt.verify(body.jwt, masterKeypair.rawSecretKey())

    let line1 = 'insert into keys (_master, _app, _user, _key, passkey, cipher'
    let line2 = `values ('${masterKeypair.publicKey()}', '${key.app}', '${txn.source}', '${body.key}', '${key.passkey}', '${body.cipher}'`

    if (key.name) {
      line1 += ', name'
      line2 += `, '${key.name}'`
    }

    if (key.image) {
      line1 += ', image'
      line2 += `, '${key.image}'`
    }

    if (key.link) {
      line1 += ', link'
      line2 += `, '${key.link}'`
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