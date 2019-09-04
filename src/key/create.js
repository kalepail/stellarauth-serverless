import { headers, StellarSdk, parseError, masterKeypair, getAuth } from '../js/utils'
import sjcl from 'sjcl'
import shajs from 'sha.js'
import _ from 'lodash'
import validUrl from 'valid-url'
import moment from 'moment'

const create = async (event, context) => {
  try {
    const h_auth = getAuth(event)
    const b_name = _.get(JSON.parse(event.body), 'name')
    const b_image = _.get(JSON.parse(event.body), 'image')
    const b_link = _.get(JSON.parse(event.body), 'link')

    if (!b_name || /[^A-Z\ ]/gi.test(b_name))
      throw 'Name contains invalid characters'

    if (b_image && !validUrl.isWebUri(b_image))
      throw 'Image contains invalid characters'

    if (b_link && !validUrl.isWebUri(b_link))
      throw 'Link contains invalid characters'

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
          name: b_name,
          image: b_image,
          link: b_link,
          addedat: moment().format('x')
        })}
      )
    ).toString('base64')

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
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