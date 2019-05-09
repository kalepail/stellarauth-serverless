import _ from 'lodash'
import StellarSdk from 'stellar-sdk'
import axios from 'axios'
import moment from 'moment'
import crypto from 'crypto'

const server = new StellarSdk.Server(process.env.HORIZON_URL)
const source = StellarSdk.Keypair.fromSecret(process.env.AUTH_SECRET)

StellarSdk.Network.useTestNetwork()

export const auth = async (event, context) => {
  const q_account = _.get(event, 'queryStringParameters.account')
  const q_hash = _.get(event, 'queryStringParameters.hash')
  const q_timeout = parseInt(
    _.get(event, 'queryStringParameters.timeout', 300),
    10
  )

  try {
    if (q_account) {
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
            StellarSdk.MemoText, 
            `StellarAuth:${
              crypto.randomBytes(32).toString('hex')
            }`.substring(0, 28)
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
        body: JSON.stringify({
          account: q_account,
          hash: transaction.hash().toString('hex'),
          transaction: xdr,
          link: `https://www.stellar.org/laboratory/#txsigner?xdr=${encodeURIComponent(xdr)}&network=${process.env.STELLAR_NETWORK}`
        })
      }
    }

    else if (q_hash) {
      const transaction = await axios
      .get(`https://horizon-testnet.stellar.org/transactions/${q_hash}`)
      .then(({data}) => {
        if (moment().isBefore(data.valid_before))
          return data

        throw {
          status: 401,
          message: 'Login transaction has expired'
        }
      })

      return {
        statusCode: 200,
        body: JSON.stringify(transaction)
      }
    }

    else
      throw 'Include an `account` or `hash` query string parameter'
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
      body: JSON.stringify(error)
    }
  }
}