import { headers } from './js/utils'

import send from './txn/send'
import sign from './txn/sign'
import list from './txn/list'

const get = async (event, context) => {
  switch (event.path) {
    case '/txn/list':
    return list(event, context)

    default:
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: 'Route not supported' })
    }
  }
}

const post = async (event, context) => {
  switch (event.path) {
    case '/txn/send':
    return send(event, context)

    case '/txn/sign':
    return sign(event, context)

    default:
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: 'Route not supported' })
    }
  }
}

export default (event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false

  switch (event.httpMethod) {
    case 'GET':
    return get(event, context)

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