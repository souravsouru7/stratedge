const admin = require("firebase-admin");
const { assertFirebaseAdminConfig } = require("./index");

const getFirebaseAdmin = () => {
  if (admin.apps.length > 0) {
    return admin;
  }

  const serviceAccount = assertFirebaseAdminConfig();

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  return admin;
};

module.exports = {
  getFirebaseAdmin
};
