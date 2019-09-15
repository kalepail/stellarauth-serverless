import { headers, parseError } from './js/utils'
import qrcode from 'qrcode'
import _ from 'lodash'
import jwt from 'jsonwebtoken'

export default async (event, context) => {
  try {
    context.callbackWaitsForEmptyEventLoop = false

    const q_cipher = _.get(event.queryStringParameters, 'cipher')

    if (
      !jwt.decode(q_cipher)
      && !_.isObject(JSON.parse(Buffer.from(q_cipher, 'base64').toString()))
    ) throw 'Invalid cipher'
  
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