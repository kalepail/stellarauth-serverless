import { headers, masterKeypair, StellarSdk, parseError, getAuth } from '../js/utils'
import shajs from 'sha.js'
import _ from 'lodash'
import validUrl from 'valid-url'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import moment from 'moment'

const create = async (event, context) => {
  try {
    const h_auth = getAuth(event)
    const b_name = _.get(JSON.parse(event.body), 'name')
    const b_image = _.get(JSON.parse(event.body), 'image')
    const b_link = _.get(JSON.parse(event.body), 'link')

    if (
      !b_name 
      // || /[^A-Z0-9\ ]/gi.test(b_name)
    ) throw 'Name contains invalid characters'

    if (b_image && !validUrl.isWebUri(b_image))
      throw 'Image contains invalid characters'

    if (b_link && !validUrl.isWebUri(b_link))
      throw 'Link contains invalid characters'

    const date = moment()
    const appKeypair = StellarSdk.Keypair.fromSecret(h_auth)
    const passkey = shajs('sha256').update(
      crypto.randomBytes(256).toString('base64')
    ).digest('hex')
    
    const cipher = jwt.sign({
      iat: parseInt(date.format('X'), 10),
      exp: parseInt(date.add(1, 'day').format('X'), 10),
      data: {
        passkey,
        app: appKeypair.publicKey(),
        name: b_name,
        image: b_image,
        link: b_link
      }
    }, masterKeypair.rawSecretKey())

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        passkey, 
        cipher
      })
    }
  }

  catch(err) {
    return parseError(err)
  }
}

export default create