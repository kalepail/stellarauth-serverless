import _ from 'lodash'
import StellarSdk from 'stellar-sdk'
import axios from 'axios'
import moment from 'moment'
import shajs from 'sha.js'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import bluebird from 'bluebird'

const isDev = process.env.NODE_ENV !== 'production'
const server = new StellarSdk.Server(process.env.HORIZON_URL)
const source = StellarSdk.Keypair.fromSecret(process.env.AUTH_SECRET)
const headers = {
  'Access-Control-Allow-Origin': '*'
}

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = isDev ? 0 : 1

StellarSdk.Network.useTestNetwork()

export const auth = async (event, context) => {
  let h_auth = _.get(event, 'headers.Authorization', _.get(event, 'headers.authorization'))
  const q_account = _.get(event, 'queryStringParameters.account')
  const q_timeout = parseInt(
    _.get(event, 'queryStringParameters.timeout', 3600),
    10
  )

  try {
    if (q_timeout < 60)
      throw 'Timeout must be at least 60 seconds'

    if (h_auth) {
      if (
        h_auth
        && h_auth.substring(0, 7) === 'Bearer '
      ) h_auth = h_auth.replace('Bearer ', '')
  
      else
        throw 'Authorization header malformed'

      const hash_token = await jwt.verify(h_auth, process.env.JWT_SECRET)
      const transaction = await axios
      .get(`https://horizon-testnet.stellar.org/transactions/${hash_token.hash}`)
      .catch((err) => {
        err.response.data.resource = 'transaction'
        throw err
      })
      .then(({data}) => {
        if (
          _.filter(data.operations, (operation) => operation.source && operation.source === source.publicKey()).length
        ) throw 'Transaction contains unauthorized operations' 

        if (
          !data.memo
          || Buffer.compare(
            shajs('sha256').update(hash_token.token).digest(), 
            Buffer.from(data.memo, 'base64')
          ) !== 0
        ) throw 'Transaction memo hash and token don\'t match'

        if (moment().isAfter(data.valid_before)) throw {
          status: 401,
          message: 'Login transaction has expired'
        }
          
        return data
      })

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(transaction)
      }
    }

    else if (q_account) {
      await server
      .transactions()
      .forAccount(q_account)
      .order('desc')
      .limit(60 / 5) // Max ledgers per minute
      .call()
      .then(async (page) => new bluebird((resolve, reject) => {
        let rejected

        _.each(page.records, (record) => {
          if (rejected)
            return false

          const envelope = new StellarSdk.Transaction(record.envelope_xdr)

          _.each(envelope.operations, (operation) => {
            if (rejected)
              return false

            console.log( moment().format() )
            console.log( moment(record.created_at).add(5, 'minutes').format() )

            if (
              !rejected
              && operation.source === source.publicKey()
              && moment(record.created_at).add(1, 'minute').isAfter()
            ) {
              rejected = true
              reject({
                status: 429,
                message: 'Too many auth requests, please slow down'
              })
            }
          })
        })

        if (!rejected)
          resolve()
      }))

      const date = moment().subtract(5, 'seconds')
      const token = crypto.randomBytes(64).toString('hex')
      const memo = shajs('sha256').update(token).digest()

      // Otherwise generate a new one
      const transaction = await server
      .accounts()
      .accountId(q_account)
      .call()
      .catch((err) => {
        err.response.resource = 'account'
        throw err
      })
      .then(({sequence}) => {
        const transaction = new StellarSdk.TransactionBuilder(
          new StellarSdk.Account(q_account, sequence),
          { 
            fee: '100',
            timebounds: {
              minTime: date.format('X'),
              maxTime: date.add(q_timeout, 'seconds').format('X')
            },
            memo: new StellarSdk.Memo(
              StellarSdk.MemoHash, 
              memo
            )
          }
        )
        .addOperation(StellarSdk.Operation.payment({
          destination: q_account,
          asset: StellarSdk.Asset.native(),
          amount: '0.0000100',
          source: source.publicKey()
        }))
        .build()

        transaction.sign(StellarSdk.Keypair.fromSecret(source.secret()))
        
        return transaction
      })

      const xdr = transaction.toXDR()
      const auth = jwt.sign({
        exp: parseInt(
          date.add(q_timeout, 'seconds').format('X'), 
          10
        ),
        hash: transaction.hash().toString('hex'),
        token, 
      }, process.env.JWT_SECRET)

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          account: q_account,
          transaction: xdr,
          auth
        })
      }
    }

    else
      throw 'Include `account` query string parameter or `Authorization` header token'
  }

  catch(err) {
    const error = 
    typeof err === 'string' 
    ? { message: err } 
    : err.response && err.response.data 
    ? err.response.data 
    : err.response 
    ? err.response
    : err.message 
    ? { message: err.message }
    : err

    console.error(error)
    // console.error(err)

    return {
      statusCode: error.status || err.status || 400,
      headers,
      body: JSON.stringify(error)
    }
  }
}