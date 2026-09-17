const express = require('express');
const axios = require('axios');
const open = require('open');
const path = require('path');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;

// Servir la carpeta estática "public" (donde estará index.html)
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Endpoint de respaldo por si el navegador tiene bloqueo de CORS al consultar las APIs del BCV
app.get('/api/bcv', async (req, res) => {
    const API_PRINCIPAL = "https://pydolarvenezuela-api.vercel.app/api/v1/dollar?page=bcv";
    const API_RESPALDO = "https://ve.dolarapi.com/v1/dolares/oficial";

    try {
        const respuesta = await axios.get(`${API_PRINCIPAL}&_t=${Date.now()}`, { timeout: 4000 });
        const valor = parseFloat(respuesta.data?.monedas?.usd?.promedio || respuesta.data?.promedio);
        if (valor) return res.json({ exito: true, promedio: valor, fuente: 'Principal' });
    } catch (e) {
        console.warn("Servidor: API Principal no respondió, intentando API de respaldo...");
    }

    try {
        const respuesta2 = await axios.get(`${API_RESPALDO}?_t=${Date.now()}`, { timeout: 4000 });
        const valor2 = parseFloat(respuesta2.data?.promedio);
        if (valor2) return res.json({ exito: true, promedio: valor2, fuente: 'Respaldo' });
    } catch (e2) {
        console.error("Servidor: Fallaron ambas APIs de la tasa BCV.");
    }

    res.status(500).json({ exito: false, mensaje: "No se pudo obtener la tasa BCV" });
});

// Detectar IP local para conectarse desde Android / iOS
function obtenerIPLocal() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

app.listen(PORT, async () => {
    const ipLocal = obtenerIPLocal();
    console.log('====================================================');
    console.log('🚀 SISTEMA POS ÁNGEL MEJÍA - ACTIVO Y EN VIVO');
    console.log('====================================================');
    console.log(`💻 Acceso en esta PC:      http://localhost:${PORT}`);
    console.log(`📱 Acceso Móvil (Red WiFi): http://${ipLocal}:${PORT}`);
    console.log('====================================================');

    try {
        await open(`http://localhost:${PORT}`);
    } catch (error) {
        console.log('Abre http://localhost:3000 manualmente en Chrome.');
    }
});