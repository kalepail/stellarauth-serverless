import { headers, parseError, getAuth, masterKeypair, StellarSdk } from '../js/utils'
import { Pool } from '../js/pg'
import _ from 'lodash'
import sjcl from 'sjcl'
import shajs from 'sha.js'

export default async (event, context) => {
  try {
    const b_token = _.get(JSON.parse(event.body), 'token')
    const h_auth = getAuth(event)

    const data = JSON.parse(
      Buffer.from(
        _.get(
          JSON.parse(
            Buffer.from(
              b_token, 
              'base64'
            ).toString()
          ), 
          'adata'
        ), 
        'base64'
      ).toString()
    )

    const userKeypair = StellarSdk.Keypair.fromSecret(h_auth)

    const masterUserSecret = sjcl.codec.base64.toBits(shajs('sha256').update(masterKeypair.secret() + userKeypair.secret()).digest('base64'))
    const masterUserKeyPair = sjcl.ecc.elGamal.generateKeys(256, 6, masterUserSecret)

    let masterUserPublic = masterUserKeyPair.pub.get()
        masterUserPublic = sjcl.codec.base64.fromBits(masterUserPublic.x.concat(masterUserPublic.y))

    await Pool.query(`
      insert into keys (_master, _app, _user, upkey, _key, cipher)
      values ('${data.master}', '${data.app}', '${userKeypair.publicKey()}', '${masterUserPublic}', '${data.key}', '${b_token}')
    `)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: 200
      })
    }
  }

  catch(err) {
    return parseError(err)
  }
}