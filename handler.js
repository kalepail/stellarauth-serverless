import _ from 'lodash'
import StellarSdk from 'stellar-sdk'
import axios from 'axios'
import moment from 'moment'
import jwt from 'jsonwebtoken'
import bluebird from 'bluebird'

import { TransactionStellarUri } from '@stellarguard/stellar-uri'

const isDev = process.env.NODE_ENV !== 'production'
const isTestnet = process.env.STELLAR_NETWORK === 'TESTNET'

const server = new StellarSdk.Server(process.env.HORIZON_URL)
const source = StellarSdk.Keypair.fromSecret(process.env.AUTH_SECRET)
const headers = {
  'Access-Control-Allow-Origin': '*'
}

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = isDev ? 0 : 1

StellarSdk.Network.use(
  new StellarSdk.Network(StellarSdk.Networks[process.env.STELLAR_NETWORK])
)

export const auth = async (event, context) => {
  let h_auth = _.get(event, 'headers.Authorization', _.get(event, 'headers.authorization'))
  const q_account = _.get(event, 'queryStringParameters.account')
  const q_ttl = parseInt(
    _.get(event, 'queryStringParameters.ttl', 3600),
    10
  )

  try {
    if (q_ttl < 60)
      throw 'TTL (time to live) must be at least 60 seconds'

    if (h_auth) {
      if (
        h_auth
        && h_auth.substring(0, 7) === 'Bearer '
      ) h_auth = h_auth.replace('Bearer ', '')
  
      else
        throw 'Authorization header malformed'

      const {jti} = await jwt.verify(h_auth, process.env.JWT_SECRET)
      const transaction = await axios
      .get(`${process.env.HORIZON_URL}/transactions/${jti}`)
      .catch((err) => {
        err.response.data.resource = 'transaction'
        throw err
      })
      .then(({data}) => {
        if (
          _.filter(data.operations, (operation) => operation.source && operation.source === source.publicKey()).length
        ) throw 'Transaction contains unauthorized operations' 

        if (moment().isAfter(data.valid_before)) throw {
          status: 401,
          message: 'Login transaction has expired'
        }

        return _.omit(data, [
          '_links',
          'fee_meta_xdr',
          'memo_type',
          'result_meta_xdr',
          'result_xdr',
          'envelope_xdr',
          'operation_count',
          'max_fee',
          'fee_charged',
          'fee_paid',
          'source_account_sequence',
          'paging_token',
          'id',
        ])
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

      // Otherwise generate a new one
      const transaction = await server
      .accounts()
      .accountId(source.publicKey())
      .call()
      .catch((err) => {
        if (isTestnet)
          return axios.get(`https://friendbot.stellar.org?addr=${source.publicKey()}`)
        throw err
      })
      .then(() => server
        .accounts()
        .accountId(q_account)
        .call()
      )
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
              maxTime: date.add(q_ttl, 'seconds').format('X')
            },
            memo: new StellarSdk.Memo(
              StellarSdk.MemoText, 
              'StellarAuth transaction'
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
        iss: 'https://stellarauth.com',
        sub: q_account,
        iat: parseInt(
          date.format('X'), 
          10
        ),
        exp: parseInt(
          date.add(q_ttl, 'seconds').format('X'), 
          10
        ),
        jti: transaction.hash().toString('hex')
      }, process.env.JWT_SECRET)

      const uri = TransactionStellarUri.forTransaction(transaction)
      // uri.msg = 'StellarAuth transaction' // Add back once cosmic link supports it
      // uri.callback = 'https://stellarauth.com'
      // uri.pubkey = q_account
      uri.originDomain = 'stellarauth.com'
      uri.networkPassphrase = StellarSdk.Networks[process.env.STELLAR_NETWORK]
      uri.addSignature(source)

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          uri: uri.toString().replace(/\+/g, '%20'), // Remove replace once cosmic link supports `+` as a space separator
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
    console.error(err)

    return {
      statusCode: error.status || err.status || 400,
      headers,
      body: JSON.stringify(error)
    }
  }
}