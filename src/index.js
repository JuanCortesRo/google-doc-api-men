// Importar Express
const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

require('dotenv').config();


const CLIENT_EMAIL = process.env.NEXT_PUBLIC_CLIENT_EMAIL;
const PRIVATE_KEY = process.env.NEXT_PUBLIC_PRIVATE_KEY.replace(/\\n/g, '\n');
const TEMPLATE_DOC_ID = process.env.TEMPLATE_DOC_ID

const jwtClient = new google.auth.JWT(
    CLIENT_EMAIL,
    null,
    PRIVATE_KEY,
    [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/documents',
    ]
);

const docs = google.docs({ version: 'v1', auth: jwtClient });


const createDocumentFromTemplate = async ({ email }) => {
    try {
        const drive = google.drive({ version: 'v3', auth: jwtClient });

        const response = await drive.files.copy({
            fileId: TEMPLATE_DOC_ID,
            requestBody: {
                name: `Documento generado - ${new Date().toISOString()}`,
            },
        });

        const newDocId = response.data.id;

         // Paso 2: Verificar el tipo de archivo
         const fileMetadata = await drive.files.get({
            fileId: newDocId,
            fields: 'mimeType',
            convert: true,
        });

        if (fileMetadata.data.mimeType !== 'application/vnd.google-apps.document') {
            throw new Error(
                'El archivo copiado no es del tipo Google Docs. Asegúrate de que la plantilla sea compatible.'
            );
        }

        await drive.permissions.create({
            fileId: newDocId,
            requestBody: {
                role: 'writer',
                type: 'user',
                emailAddress: email,
            },
        });

        return {
            status: true,
            urlDocumento: newDocId ?? ""
        }

    } catch (error) {
        console.error('Error al crear el documento:', error);
        throw error;
    }
}

const replaceValuesDoc = async ({ dataKey, newDocId }) => {
    let response = false
    try {
        const replacements = {};
        if (dataKey?.length > 0) {
            dataKey.forEach(item => {
                if (item.key && item.value !== undefined) {
                    replacements[item.key] = item.value;
                }
            });
            const requests = Object.keys(replacements).map((key) => ({
                replaceAllText: {
                    containsText: {
                        text: `${key}`,
                        matchCase: true,
                    },
                    replaceText: replacements[key],
                },
            }));

            
            await docs.documents.batchUpdate({
                documentId: newDocId,
                requestBody: {
                    requests,
                },
            });

            response = true
        }
    } catch(e) {
        console.log(e)
    }

    return response
}

const execute = async ({ data ,  email}) => {
    try {
        const newDoc = await createDocumentFromTemplate({email: email})
        const statesChange = await replaceValuesDoc({
            dataKey: data,
            newDocId: newDoc.urlDocumento
        })

        return newDoc
    } catch (e) {
        console.log(e)
    }
}

app.post('/execute', async (req, res) => {
    const data = req.body;
    if (!data) {
      return res.status(400).json({ error: 'No se recibió ningún dato' });
    }

        // Simple trace log for incoming generation payloads.
        console.log('[execute] Payload recibido:', JSON.stringify(data, null, 2));

        const result = await execute(data);

        console.log('[execute] Resultado:', JSON.stringify(result, null, 2));
        res.status(200).json(result);
});

app.get('/', (req, res) => {
    res.status(200).json({ "server": "okey"});
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
