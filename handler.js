import _ from 'lodash'
import StellarSdk from 'stellar-sdk'
import axios from 'axios'
import moment from 'moment'
import shajs from 'sha.js'
import crypto from 'crypto'

const server = new StellarSdk.Server(process.env.HORIZON_URL)
const source = StellarSdk.Keypair.fromSecret(process.env.AUTH_SECRET)
const headers = {
  'Access-Control-Allow-Origin': '*'
}

StellarSdk.Network.useTestNetwork()

export const auth = async (event, context) => {
  const q_account = _.get(event, 'queryStringParameters.account')
  const q_hash = _.get(event, 'queryStringParameters.hash')
  const q_token = _.get(event, 'queryStringParameters.token')
  const q_timeout = parseInt(
    _.get(event, 'queryStringParameters.timeout', 300),
    10
  )

  try {
    if (
      q_hash 
      && q_token
    ) {
      const transaction = await axios
      .get(`https://horizon-testnet.stellar.org/transactions/${q_hash}`)
      .then(({data}) => {
        if (
          !data.memo
          || shajs('sha256').update(q_token).digest('hex') !== Buffer.from(data.memo, 'base64').toString('hex')
        ) throw 'Transaction memo hash and token don\'t match' 

        if (moment().isBefore(data.valid_before))
          return data

        throw {
          status: 401,
          message: 'Login transaction has expired'
        }
      })

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(transaction)
      }
    }

    else if (q_account) {
      const token = crypto.randomBytes(32).toString('hex')
      const memo = shajs('sha256').update(token).digest('hex')

      let transaction = await server
      .accounts()
      .accountId(q_account)
      .call()
      .then(({ sequence }) => {
        const transaction = new StellarSdk.TransactionBuilder(
          new StellarSdk.Account(q_account, sequence),
          { fee: '100' }
        )
        .addOperation(StellarSdk.Operation.payment({
          destination: q_account,
          asset: StellarSdk.Asset.native(),
          amount: '0.0000100',
          source: source.publicKey()
        }))
        .addMemo(
          new StellarSdk.Memo(
            StellarSdk.MemoHash, 
            memo
          )
        )
        .setTimeout(q_timeout)
        .build()

        transaction.sign(StellarSdk.Keypair.fromSecret(source.secret()))
        
        return transaction
      })

      const xdr = transaction.toXDR()

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          account: q_account,
          hash: transaction.hash().toString('hex'),
          token,
          transaction: xdr,
          link: `https://www.stellar.org/laboratory/#txsigner?xdr=${encodeURIComponent(xdr)}&network=${process.env.STELLAR_NETWORK}`
        })
      }
    }

    else
      throw 'Include `account` or `hash` and `token` query string parameter(s)'
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