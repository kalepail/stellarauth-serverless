import { headers, parseError, getAuth, getMasterUserKeypair } from '../js/utils'
import _ from 'lodash'
import Pool from '../js/pg'
import pusher from '../js/pusher'

export default async (event, context) => {
  try {
    const b_token = _.get(JSON.parse(event.body), 'token')
    const h_auth = getAuth(event)

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

    const { masterUserPublic, userKeypair } = getMasterUserKeypair(h_auth)

    let line1 = 'insert into keys (_master, _app, _user, _key, mupub, cipher, addedat'
    let line2 = `values ('${data.master}', '${data.app}', '${userKeypair.publicKey()}', '${data.key}', '${masterUserPublic}', '${b_token}', ${data.addedat}`

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

    pusher.trigger(userKeypair.publicKey(), 'keyClaim', {})

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