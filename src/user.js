import { headers } from './js/utils'
import sjcl from 'sjcl'

// const get = async (event, context) => {
//   return {
//     statusCode: 200,
//     headers,
//     body: JSON.stringify({ message: 'Hello' })
//   }
// }

const post = async (event, context) => {
  const pair = sjcl.ecc.elGamal.generateKeys(256)
  let pub = pair.pub.get()
  let sec = pair.sec.get()

  pub = sjcl.codec.base64.fromBits(pub.x.concat(pub.y))
  sec = sjcl.codec.base64.fromBits(sec)

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      user: {
        pub,
        sec
      }
    })
  }
}

export default (event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false

  switch (event.httpMethod) {
    // case 'GET':
    // return get(event, context)

    case 'POST':
    return post(event, context)

    default:
      callback(null, {
        statusCode: 500,
        headers,
        body: JSON.stringify({ message: 'Method not supported' })
      })
    break
  }
}