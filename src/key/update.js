import { headers, getAuth, parseError, StellarSdk } from '../js/utils'
import Pool from '../js/pg'
import _ from 'lodash'
import pusher from '../js/pusher'

export default async (event, context) => {
  try {
    const h_auth = getAuth(event)
    const b_key = _.get(JSON.parse(event.body), 'key')
    const b_nickname = _.get(JSON.parse(event.body), 'nickname')

    const appKeypair = StellarSdk.Keypair.fromSecret(h_auth)

    const pgKey = await Pool.query(`
      select * from keys
      where _key='${b_key}'
    `).then((data) => _.get(data, 'rows[0]'))

    await Pool.query(`
      update keys set
      nickname='${b_nickname}'
      where _key='${b_key}'
      and _user='${pgKey._user}'
      and _app='${appKeypair.publicKey()}'
    `)

    pusher.trigger(pgKey._user, 'keyUpdate', {})

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