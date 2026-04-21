const fs = require('fs');
const admin = require('firebase-admin');

function printUsage() {
  console.log('Uso: node scripts/set-user-role.js <email_o_uid> <member|trainer|admin>');
  console.log('Requiere la variable GOOGLE_APPLICATION_CREDENTIALS apuntando al service account JSON.');
}

async function main() {
  const [, , identifier, role] = process.argv;
  const validRoles = new Set(['member', 'trainer', 'admin']);

  if (!identifier || !role || !validRoles.has(role)) {
    printUsage();
    process.exit(1);
  }

  const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credentialPath || !fs.existsSync(credentialPath)) {
    console.error('No se encontró GOOGLE_APPLICATION_CREDENTIALS o el archivo no existe.');
    process.exit(1);
  }

  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });

  const db = admin.firestore();
  let userRecord;

  try {
    if (identifier.includes('@')) {
      userRecord = await admin.auth().getUserByEmail(identifier);
    } else {
      userRecord = await admin.auth().getUser(identifier);
    }
  } catch (error) {
    console.error('No se encontró el usuario en Firebase Authentication.');
    process.exit(1);
  }

  await db.collection('users').doc(userRecord.uid).set(
    {
      uid: userRecord.uid,
      email: userRecord.email || null,
      role,
      active: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  console.log(`Rol actualizado correctamente. Usuario: ${userRecord.email || userRecord.uid} -> ${role}`);
}

main().catch((error) => {
  console.error('Error inesperado al actualizar el rol:', error);
  process.exit(1);
});
