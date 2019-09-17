import _ from 'lodash'
import * as admin from 'firebase-admin'
import { isDev } from './utils'

const serviceAccount = require(`../../certs/stellarauth-9578d-firebase-adminsdk-0xakw-${isDev ? '23f88796bb' : 'effdd19406'}.json`)

if (_.isEmpty(admin.apps))
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://stellarauth-9578d.firebaseio.com'
  })

export default admin