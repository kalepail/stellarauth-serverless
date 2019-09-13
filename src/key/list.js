import { headers, parseError } from '../js/utils'
import Pool from '../js/pg'
import _ from 'lodash'

// TODO:
// This call should limited to users only, don't want to allow apps to list out all a user's keys
// Apps might should be able to list out all the keys they've created though. However that would likely need to be paginated

export default async (event, context) => {
  try {
    const q_user = _.get(event.queryStringParameters, 'user')

    const pgKeys = await Pool.query(`
      select * from keys
      where _user='${q_user}'
    `).then((data) => _
      .chain(data)
      .get('rows')
      .map((key) => ({
        _key: key._key,
        cipher: key.cipher,
        name: key.name,
        image: key.image,
        link: key.link,
        verified: key.verifiedat
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