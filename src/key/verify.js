import { headers, StellarSdk, parseError, masterKeypair, getAuth } from '../js/utils'
import Pool from '../js/pg'
import sjcl from 'sjcl'
import _ from 'lodash'
import shajs from 'sha.js'
import pusher from '../js/pusher'

export default async (event, context) => {
  try {
    const b_key = _.get(JSON.parse(event.body), 'key')
    const h_auth = getAuth(event)

    const appKeypair = StellarSdk.Keypair.fromSecret(h_auth)

    const pgKey = await Pool.query(`
      select * from keys
      where _key='${b_key}'
    `).then((data) => _.get(data, 'rows[0]'))

    const keyKeypair = StellarSdk.Keypair.fromSecret(
      sjcl.decrypt(
        shajs('sha256').update(masterKeypair.secret() + appKeypair.secret()).digest('hex'),
        Buffer.from(pgKey.cipher, 'base64').toString()
      )
    )

    const masterUserPublic = new sjcl.ecc.elGamal.publicKey(
      sjcl.ecc.curves.c256, 
      sjcl.codec.base64.toBits(pgKey.mupub)
    )

    const encrypted = Buffer.from(
      sjcl.encrypt(
        masterUserPublic,
        keyKeypair.secret()
      )
    ).toString('base64')

    await Pool.query(`
      update keys set
      cipher='${encrypted}',
      mupub=NULL
      where _key='${keyKeypair.publicKey()}'
      and _user='${pgKey._user}'
      and _app='${appKeypair.publicKey()}'
    `)

    pusher.trigger(pgKey._user, 'keyVerify', {})

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