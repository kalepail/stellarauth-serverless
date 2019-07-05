import { headers, parseError, getAuth, getMasterUserKeypair } from '../js/utils'
import Pool from '../js/pg'
import _ from 'lodash'

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

    if (data.nickname) await Pool.query(`
      insert into keys (_master, _app, _user, _key, nickname, mupub, cipher)
      values ('${data.master}', '${data.app}', '${userKeypair.publicKey()}', '${data.key}', '${data.nickname}', '${masterUserPublic}', '${b_token}')
    `)
    else await Pool.query(`
      insert into keys (_master, _app, _user, _key, mupub, cipher)
      values ('${data.master}', '${data.app}', '${userKeypair.publicKey()}', '${data.key}', '${masterUserPublic}', '${b_token}')
    `)

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