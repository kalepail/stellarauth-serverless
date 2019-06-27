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
  let shared = pair.sec.dh(pair.pub)

  pub = sjcl.codec.base64.fromBits(pub.x.concat(pub.y))
  sec = sjcl.codec.base64.fromBits(sec)
  shared = sjcl.codec.base64.fromBits(shared)

  console.log(
    pub,
    sec,
    shared
  )

  pub = new sjcl.ecc.elGamal.publicKey(
    sjcl.ecc.curves.c256, 
    sjcl.codec.base64.toBits(pub)
  )
  // sec = new sjcl.ecc.elGamal.secretKey(
  //   sjcl.ecc.curves.c256,
  //   sjcl.ecc.curves.c256.field.fromBits(sjcl.codec.base64.toBits(sec))
  // )

  shared = new sjcl.ecc.elGamal.secretKey(
    sjcl.ecc.curves.c256,
    sjcl.ecc.curves.c256.field.fromBits(sjcl.codec.base64.toBits(sec))
  )

  var ct = sjcl.encrypt(pub, 'Hello World!')
  var pt = sjcl.decrypt(shared, ct)

  console.log(pt)

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      user: sec
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