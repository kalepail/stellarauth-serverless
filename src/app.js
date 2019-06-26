import { headers, StellarSdk } from './js/utils'

// const get = async (event, context) => {
//   return {
//     statusCode: 200,
//     headers,
//     body: JSON.stringify({ message: 'Hello' })
//   }
// }

const post = async (event, context) => {
  const keypair = StellarSdk.Keypair.random()

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      app: keypair.secret()
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