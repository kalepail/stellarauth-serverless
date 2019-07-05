import { headers } from './js/utils'

import create from './key/create'
import update from './key/update'
import claim from './key/claim'
import verify from './key/verify'
import check from './key/check'
import list from './key/list'

const get = async (event, context) => {
  switch (event.path) {
    case '/key/check':
    return check(event, context)

    case '/key/list':
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
    case '/key/create':
    return create(event, context)

    case '/key/claim':
    return claim(event, context)

    case '/key/verify':
    return verify(event, context)

    default:
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: 'Route not supported' })
    }
  }
}

const put = async (event, context) => {
  switch (event.path) {
    case '/key/update':
    return update(event, context)

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

    case 'PUT':
    return put(event, context)

    default:
      callback(null, {
        statusCode: 500,
        headers,
        body: JSON.stringify({ message: 'Method not supported' })
      })
    break
  }
}