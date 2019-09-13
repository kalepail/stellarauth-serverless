import _ from 'lodash'
import { headers, StellarSdk, parseError, getAuth, stellarNetwork } from '../js/utils'
import Pool from '../js/pg'
import pusher from '../js/pusher'
import firebase from '../js/firebase'

export default async (event, context) => {
  try {
    const b_xdr = _.get(JSON.parse(event.body), 'xdr')
    const h_auth = getAuth(event)

    const appKeypair = StellarSdk.Keypair.fromSecret(h_auth)

    let txn = new StellarSdk.Transaction(b_xdr, stellarNetwork)

    const setOptions = _.filter(txn.operations, {type: 'setOptions'})
    
    _.each(setOptions, (options) => {
      if (
        options.masterWeight !== undefined
        || options.lowThreshold !== undefined
        || options.medThreshold !== undefined
        || options.highThreshold !== undefined
      ) throw 'The setOptions[masterWeight,lowThreshold,medThreshold,highThreshold] operations are not supported'

      if (options.setFlags >= 4)
        throw 'Any setOptions.setFlags values must be less than 4'
    })

    if (_.map(txn.operations, 'type').indexOf('accountMerge') !== -1)
      throw 'The accountMerge operation is not supported'

    const pgKey = await Pool.query(`
      select * from keys
      where _key='${txn.source}'
        and _app='${appKeypair.publicKey()}'
    `).then((data) => _.get(data, 'rows[0]'))

    const hash = txn.hash().toString('hex')

    await Pool.query(`
      insert into txns (_master, _app, _user, _key, _txn, status, xdr)
      values ('${pgKey._master}', '${pgKey._app}', '${pgKey._user}', '${pgKey._key}', '${hash}', 'sent', '${b_xdr}')
    `)

    if (pgKey) {
      txn = Object.assign({}, {
        memo: txn.memo._value ? txn.memo._value.toString() : '',
        timeBounds: {}
      }, txn)

      pusher.trigger(pgKey._user, 'txnSend', {})

      await firebase.messaging().send({
        notification: {
          title: pgKey.name,
          body: txn.memo
        },
        data: {},
        android: {
          priority: 'high'
        },
        apns: {
          headers: {
            'apns-priority': '10'
          }
        },
        topic: pgKey._user
      })
      .catch((err) => console.error(err))

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 200
        })
      }
    }

    throw {
      status: 404
    }
  }

  catch(err) {
    return parseError(err)
  }
}