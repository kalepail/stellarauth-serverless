import { headers, parseError } from './js/utils'
import qrcode from 'qrcode'
import _ from 'lodash'

export default async (event, context) => {
  try {
    context.callbackWaitsForEmptyEventLoop = false

    const p_token = _.get(event, 'pathParameters.token') 
    const data = JSON.parse(
      Buffer.from(
        _.get(
          JSON.parse(
            Buffer.from(
              p_token, 
              'base64'
            ).toString()
          ), 
          'adata'
        ), 
        'base64'
      ).toString()
    )

    if (!(data.master && data.app && data.key))
      throw 'Invalid token'
  
    let qr = await qrcode.toDataURL(p_token)
        qr = qr.replace(/^data:image\/png;base64,/, '')

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'image/png'
      },
      body: qr,
      isBase64Encoded: true
    }
  }

  catch(err) {
    return parseError(err)
  }
}