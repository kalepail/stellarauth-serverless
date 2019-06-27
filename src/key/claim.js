import { headers, parseError, getAuth } from '../js/utils'
import { Pool } from '../js/pg'
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

    data.user = h_auth

    await Pool.query(`
      insert into keys (_master, _app, _user, _key, token)
      values ('${data.master}', '${data.app}', '${data.user}', '${data.key}', '${b_token}')
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