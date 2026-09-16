const express = require('express');
const axios = require('axios');
const app = express();

// Servir archivos estáticos (index.html, manifest.json, sw.js, etc.)
app.use(express.static('.'));

// Función completa para obtener la tasa oficial BCV con consola detallada
async function obtenerTasaBCV() {
    console.log('🔄 Consultando tasa oficial del BCV...');
    try {
        // Intento 1: API primaria
        const response = await axios.get('https://ve.dolarapi.com/v1/dolares/oficial', { timeout: 7000 });
        if (response.data && response.data.promedio) {
            const tasa = parseFloat(response.data.promedio);
            console.log(`📡 Tasa obtenida de Fuente Primaria: Bs. ${tasa}`);
            return tasa;
        }
        throw new Error('Respuesta inválida de la API primaria');
    } catch (error) {
        console.warn('⚠️ Falló la fuente primaria del BCV, intentando servidor de respaldo...');
        
        // Intento 2: Respaldo secundario (PyDolarVe)
        try {
            const backupRes = await axios.get('https://pydolarve.org/api/v1/dollar?page=bcv', { timeout: 5000 });
            if (backupRes.data && backupRes.data.monedas && backupRes.data.monedas.usd) {
                const tasaBackup = parseFloat(backupRes.data.monedas.usd.promedio);
                console.log(`🛡️ Tasa obtenida de Fuente de Respaldo: Bs. ${tasaBackup}`);
                return tasaBackup;
            }
            throw new Error('Estructura de respuesta inválida en respaldo');
        } catch (backupError) {
            console.error('❌ Error en servidor de respaldo:', backupError.message);
            throw backupError;
        }
    }
}

// Ruta API consultada por el frontend en index.html
app.get('/api/bcv', async (req, res) => {
    console.log('📩 Petición recibida en /api/bcv desde el cliente...');
    try {
        const tasa = await obtenerTasaBCV();
        res.json({ tasa: tasa, status: 'OK' });
    } catch (err) {
        console.error('💥 Error final enviando respuesta al cliente:', err.message);
        res.status(500).json({ error: 'No se pudo obtener la tasa oficial del BCV' });
    }
});

// Inicio del Servidor con marco visual y verificación automática
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    console.log(`\n==================================================`);
    console.log(`🚀 SISTEMA POS ÁNGEL MEJÍA - SERVIDOR ACTIVO`);
    console.log(`🌐 Escuchando peticiones en el puerto: ${PORT}`);
    console.log(`==================================================`);
    
    // Verificación inicial de conexión con el BCV al encender
    try {
        const tasaInicial = await obtenerTasaBCV();
        console.log(`\n✅ SISTEMA POS ABIERTO Y LISTO PARA USAR`);
        console.log(`💵 Tasa de cambio sincronizada: 1 USD = Bs. ${tasaInicial}`);
        console.log(`==================================================\n`);
    } catch (e) {
        console.log(`\n⚠️ SISTEMA POS ABIERTO (ADVERTENCIA DE SINCRO)`);
        console.log(`❌ No se pudo sincronizar la tasa inicial, pero el servidor está activo.`);
        console.log(`==================================================\n`);
    }
});