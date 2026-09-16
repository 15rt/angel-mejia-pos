const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.static('.'));

// Función para obtener la tasa oficial
async function obtenerTasaBCV() {
    try {
        const response = await axios.get('https://ve.dolarapi.com/v1/dolares/oficial', { timeout: 7000 });
        if (response.data && response.data.promedio) {
            return parseFloat(response.data.promedio);
        }
        throw new Error('Respuesta de API inválida');
    } catch (error) {
        // Respaldo en caso de fallo
        const backupRes = await axios.get('https://pydolarve.org/api/v1/dollar?page=bcv', { timeout: 5000 });
        return parseFloat(backupRes.data.monedas.usd.promedio);
    }
}

// Ruta API para el frontend
app.get('/api/bcv', async (req, res) => {
    try {
        const tasa = await obtenerTasaBCV();
        res.json({ tasa: tasa });
    } catch (err) {
        console.error('Error al enviar la tasa:', err.message);
        res.status(500).json({ error: 'No se obtuvo la tasa' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    console.log(`\n===================================`);
    console.log(`🚀 Servidor POS activo en el puerto ${PORT}`);
    
    try {
        const tasaInicial = await obtenerTasaBCV();
        console.log(`✅ Conexión BCV Exitosa! Tasa del día: Bs. ${tasaInicial}`);
    } catch (e) {
        console.log('❌ Error al consultar la tasa inicial');
    }
    console.log(`===================================\n`);
});