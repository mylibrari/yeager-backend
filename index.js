require('dotenv').config();

const express = require('express');
const fileUpload = require('express-fileupload');
const pinataSdk = require('@pinata/sdk');
const FormData = require('form-data');
const cors = require('cors');
const axios = require('axios');


const app = express();

app.use(cors());
app.use(fileUpload());

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));


const pinataApiKey = process.env.PINATA_API_KEY;
const pinataSecretApiKey = process.env.PINATA_SECRET_API_KEY;
const pinataURL = process.env.PINATA_URL || 'https://api.pinata.cloud/pinning/pinFileToIPFS';

if (!pinataApiKey || !pinataSecretApiKey) {
    console.log('Make sure to set PINATA_API_KEY and PINATA_SECRET_API_KEY in your .env');
    process.exit(1);
}

const pinata = new pinataSdk({
    pinataApiKey,
    pinataSecretApiKey
});

pinata.testAuthentication().then((result) => {
    console.log("Connected to Pinata", result);
}).catch((err) => {
    console.log(err);
});


app.post('/uploadMetadata', async (req, res) => {
    const metadata = req.body;

    try {
        const response = await axios.post(`${pinataURL}/pinJSONToIPFS`, metadata, {
            headers: {
                'Content-Type': 'application/json',
                pinata_api_key: pinataApiKey,
                pinata_secret_api_key: pinataSecretApiKey,
            },
        });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/uploadFile', async (req, res) => {
    const { file, filename } = req.body;


    if (!file || !filename) {
        return res.status(400).json({ error: 'File and filename are required' });
    }

    const buffer = Buffer.from(file, 'base64');
    const formData = new FormData();
    formData.append('file', buffer, { filename });

    formData.append('pinataMetadata', JSON.stringify({
        name: filename,
    }));

    try {
        const response = await axios.post(`${pinataURL}/pinFileToIPFS`, formData, {
            maxBodyLength: 'Infinity',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
                pinata_api_key: pinataApiKey,
                pinata_secret_api_key: pinataSecretApiKey,
            },
        });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
