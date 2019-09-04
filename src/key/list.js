import { headers, getAuth, parseError, StellarSdk } from '../js/utils'
import Pool from '../js/pg'
import _ from 'lodash'

export default async (event, context) => {
  try {
    const h_auth = getAuth(event)

    const userKeypair = StellarSdk.Keypair.fromSecret(h_auth)

    const pgKeys = await Pool.query(`
        select * from keys
        where _user='${userKeypair.publicKey()}'
      `).then((data) => _
        .chain(data)
        .get('rows')
        .map((key) => ({
          _key: key._key,
          name: key.name,
          image: key.image,
          link: key.link,
          addedat: key.addedat,
          verified: !key.mupub
        }))
        .value()
      )

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ keys: pgKeys })
    }
  }

  catch(err) {
    return parseError(err)
  }
}