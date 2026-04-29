const { google } = require('googleapis');
require('dotenv').config();

const CLIENT_EMAIL = process.env.NEXT_PUBLIC_CLIENT_EMAIL;
const PRIVATE_KEY = process.env.NEXT_PUBLIC_PRIVATE_KEY.replace(/\\n/g, '\n');

const jwtClient = new google.auth.JWT(
    CLIENT_EMAIL,
    null,
    PRIVATE_KEY,
    ['https://www.googleapis.com/auth/drive']
);

const checkQuota = async () => {
    const drive = google.drive({ version: 'v3', auth: jwtClient });
    
    const about = await drive.about.get({
        fields: 'storageQuota'
    });

    const quota = about.data.storageQuota;
    console.log('Cuota de almacenamiento:');
    console.log(`  Límite: ${(quota.limit / 1e9).toFixed(2)} GB`);
    console.log(`  Usado: ${(quota.usage / 1e9).toFixed(2)} GB`);
    console.log(`  Disponible: ${((quota.limit - quota.usage) / 1e9).toFixed(2)} GB`);
};

checkQuota().catch(console.error);