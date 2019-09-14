import { headers, parseError } from './js/utils'
import qrcode from 'qrcode'
import _ from 'lodash'

export default async (event, context) => {
  try {
    context.callbackWaitsForEmptyEventLoop = false

    const q_cipher = _.get(event.queryStringParameters, 'cipher')

    const decoded = JSON.parse(
      Buffer.from(q_cipher, 'base64').toString()
    )

    if (!_.isObject(decoded)) 
      throw 'Invalid cipher'
  
    let qr = await qrcode.toDataURL(q_cipher)
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