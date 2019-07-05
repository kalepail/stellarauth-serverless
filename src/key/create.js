import { headers, StellarSdk, parseError, masterKeypair, getAuth } from '../js/utils'
import sjcl from 'sjcl'
import shajs from 'sha.js'
import _ from 'lodash'

const create = async (event, context) => {
  try {
    const b_nickname = _.get(JSON.parse(event.body), 'nickname')
    const h_auth = getAuth(event)

    const appKeypair = StellarSdk.Keypair.fromSecret(h_auth)
    const keyKeypair = StellarSdk.Keypair.random()

    const encrypted = Buffer.from(
      sjcl.encrypt(
        shajs('sha256').update(masterKeypair.secret() + appKeypair.secret()).digest('hex'),
        keyKeypair.secret(),
        {adata: JSON.stringify({
          master: masterKeypair.publicKey(),
          app: appKeypair.publicKey(),
          key: keyKeypair.publicKey(),
          nickname: b_nickname
        })}
      )
    ).toString('base64')

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        nickname: b_nickname,
        key: keyKeypair.publicKey(),
        token: encrypted
      })
    }
  }

  catch(err) {
    return parseError(err)
  }
}

export default create