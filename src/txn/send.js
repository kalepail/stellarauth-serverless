import _ from 'lodash'
import { headers, StellarSdk, parseError, getAuth } from '../js/utils'
import Pool from '../js/pg'
import pusher from '../js/pusher'

export default async (event, context) => {
  try {
    const b_xdr = _.get(JSON.parse(event.body), 'xdr')
    const h_auth = getAuth(event)

    const txn = new StellarSdk.Transaction(b_xdr)
    const appKeypair = StellarSdk.Keypair.fromSecret(h_auth)

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

    await Pool.query(`
      insert into txns (_master, _app, _user, _key, _txn, status, xdr)
      values ('${pgKey._master}', '${pgKey._app}', '${pgKey._user}', '${pgKey._key}', '${txn.hash().toString('hex')}', 'sent', '${b_xdr}')
    `)

    if (pgKey) {
      pusher.trigger(pgKey._user, 'txnSend', {})

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