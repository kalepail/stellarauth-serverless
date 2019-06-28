import _ from 'lodash'
import { headers, StellarSdk, parseError, getAuth } from '../js/utils'
import { Pool } from '../js/pg'

export default async (event, context) => {
  try {
    const b_xdr = _.get(JSON.parse(event.body), 'xdr')
    const h_auth = getAuth(event)

    const txn = new StellarSdk.Transaction(b_xdr)
    const appKeypair = StellarSdk.Keypair.fromSecret(h_auth)

    const pgKey = await Pool.query(`
      select * from keys
      where _key='${txn.source}'
      and _app='${appKeypair.publicKey()}'
    `).then((data) => _.get(data, 'rows[0]'))

    await Pool.query(`
      insert into txns (_master, _app, _user, _key, status, xdr)
      values ('${pgKey._master}', '${pgKey._app}', '${pgKey._user}', '${pgKey._key}', 'sent', '${b_xdr}')
    `)

    if (pgKey)
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 200
        })
      }

    throw {
      status: 404
    }
  }

  catch(err) {
    return parseError(err)
  }
}