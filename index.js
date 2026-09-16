const express = require('express');
const axios = require('axios');
const https = require('https');
const app = express();

app.use(express.static('.'));

// Agente HTTPS que ignora errores de certificados del sitio del BCV
const httpsAgent = new https.Agent({
    rejectUnauthorized: false
});

app.get('/api/bcv', async (req, res) => {
    try {
        // Intento 1: Scraping directo al sitio web del BCV
        const response = await axios.get('https://www.bcv.org.ve/', {
            httpsAgent,
            timeout: 5000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        const html = response.data;
        // Buscar el div con id dolar en el HTML del BCV
        const match = html.match(/<id="dolar">[\s\S]*?<strong>\s*([\d,.]+)\s*<\/strong>/i) || 
                      html.match(/dolar[\s\S]*?<strong>\s*([\d,.]+)\s*<\/strong>/i);

        if (match && match[1]) {
            const tasaStr = match[1].replace(',', '.').trim();
            const tasa = parseFloat(tasaStr);
            return res.json({ tasa, fuente: 'BCV Oficial Directo' });
        }

        throw new Error('No se pudo extraer la tasa del HTML del BCV');

    } catch (error) {
        console.log('Fallo sitio principal BCV, intentando API de respaldo...', error.message);

        // Intento 2: Respaldo automático mediante API de tasas en Venezuela
        try {
            const backupRes = await axios.get('https://pydolarve.org/api/v1/dollar?page=bcv', { timeout: 5000 });
            if (backupRes.data && backupRes.data.monedas && backupRes.data.monedas.usd) {
                const tasaBackup = backupRes.data.monedas.usd.promedio;
                return res.json({ tasa: tasaBackup, fuente: 'Respaldo BCV' });
            }
        } catch (backupError) {
            console.error('Error en API de respaldo:', backupError.message);
        }

        // Si ambos fallan
        return res.status(500).json({ error: 'No se pudo obtener la tasa en este momento' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor POS activo en el puerto ${PORT}`);
});