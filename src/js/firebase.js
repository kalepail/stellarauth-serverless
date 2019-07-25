import _ from 'lodash'
import * as admin from 'firebase-admin'
import serviceAccount from '../../certs/stellarauth-9578d-firebase-adminsdk-0xakw-23f88796bb.json'

if (_.isEmpty(admin.apps))
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://stellarauth-9578d.firebaseio.com'
  })

export default admin