import { headers, getAuth } from './js/utils'
import { Pool } from './js/pg'
import _ from 'lodash'

import send from './txn/send'
import sign from './txn/sign'

const get = async (event, context) => {
  try {
    const h_auth = getAuth(event)

    const pgTxns = await Pool.query(`
        select * from txns
        where _user='${h_auth}'
      `).then((data) => _
        .chain(data)
        .get('rows')
        .map('xdr')
        .value()
      )

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ txns: pgTxns })
    }
  }

  catch(err) {
    return parseError(err)
  }
}

const post = (event, context) => {
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