import { headers, getAuth, parseError, StellarSdk } from '../js/utils'
import Pool from '../js/pg'
import _ from 'lodash'
import pusher from '../js/pusher'
import validUrl from 'valid-url'

export default async (event, context) => {
  try {
    const h_auth = getAuth(event)
    const b_key = _.get(JSON.parse(event.body), 'key')
    const b_name = _.get(JSON.parse(event.body), 'name')
    const b_image = _.get(JSON.parse(event.body), 'image')
    const b_link = _.get(JSON.parse(event.body), 'link')

    if (b_name && /[^A-Z\ ]/gi.test(b_name))
      throw 'Name contains invalid characters'

    if (b_image && !validUrl.isWebUri(b_image))
      throw 'Image contains invalid characters'

    if (b_link && !validUrl.isWebUri(b_link))
      throw 'Link contains invalid characters'

    const appKeypair = StellarSdk.Keypair.fromSecret(h_auth)

    const pgKey = await Pool.query(`
      select * from keys
      where _key='${b_key}'
    `).then((data) => _.get(data, 'rows[0]'))

    let query = ''

    if (b_name) 
      query += `, name='${b_name}'`

    if (b_image) 
      query += `, image='${b_image}'`

    if (b_link) 
      query += `, link='${b_link}'`

    await Pool.query(`
      update keys set
        ${query.substring(1)}
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