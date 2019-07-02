import { headers, StellarSdk, parseError, masterKeypair, getAuth } from '../js/utils'
import sjcl from 'sjcl'
import shajs from 'sha.js'

const create = async (event, context) => {
  try {
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
          key: keyKeypair.publicKey()
        })}
      )
    ).toString('base64')

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        master: masterKeypair.publicKey(),
        app: appKeypair.publicKey(),
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