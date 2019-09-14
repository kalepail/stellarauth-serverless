import { headers, parseError, getAuth, StellarSdk } from '../js/utils'
import Pool from '../js/pg'
import _ from 'lodash'
import pusher from '../js/pusher'
import moment from 'moment'

export default async (event, context) => {
  try {
    const b_passkey = _.get(JSON.parse(event.body), 'passkey')
    const b_key = _.get(JSON.parse(event.body), 'key')
    const h_auth = getAuth(event)

    const appKeypair = StellarSdk.Keypair.fromSecret(h_auth)

    const pgKey = await Pool.query(`
      select * from keys
      where passkey='${b_passkey}'
        or _key='${b_key}'
        and _app='${appKeypair.publicKey()}'
    `).then((data) => _.get(data, 'rows[0]'))

    await Pool.query(`
      update keys set
        verifiedat='${moment().format('x')}'
      where _key='${pgKey._key}'
        and _app='${appKeypair.publicKey()}'
        and verifiedat=NULL
    `)

    pusher.trigger(pgKey._user, 'keyVerify', {})

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        key: pgKey._key,
        passkey: pgKey.passkey
      })
    }
  }

  catch(err) {
    return parseError(err)
  }
}