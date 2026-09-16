const express = require('express');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');

const app = express();
// Usa el puerto del servidor en la nube o el 3000 si estás en local
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

let configuracion = {
  nombreNegocio: "Ángel Mejía - Sistema POS",
  tasaBCV: 84.22, 
  ultimaActualizacion: "Inicializando..."
};

// Inventario base con código de barras
let inventario = [
  { id: 1, codigoBarras: "759100100001", nombre: "Harina de Maíz 1kg", precioUSD: 1.10, stock: 25 },
  { id: 2, codigoBarras: "759100100002", nombre: "Refresco 1.5L", precioUSD: 1.50, stock: 12 },
  { id: 3, codigoBarras: "759100100003", nombre: "Café Molido 250g", precioUSD: 2.50, stock: 8 },
  { id: 4, codigoBarras: "759100100004", nombre: "Arroz Superior 1kg", precioUSD: 1.00, stock: 30 }
];

let ventasRealizadas = [];

// Obtener Tasa Oficial BCV
async function obtenerTasaBCV() {
  try {
    const agent = new https.Agent({ rejectUnauthorized: false });
    const response = await axios.get('https://www.bcv.org.ve/', { 
      httpsAgent: agent, 
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    const valorDolarTexto = $('#dolar strong').text().trim().replace('.', '').replace(',', '.');
    const valorDolar = parseFloat(valorDolarTexto);

    if (!isNaN(valorDolar) && valorDolar > 0) {
      configuracion.tasaBCV = valorDolar;
      configuracion.ultimaActualizacion = new Date().toLocaleTimeString();
      console.log(`[BCV OK] Tasa oficial actualizada: Bs. ${configuracion.tasaBCV}`);
    }
  } catch (error) {
    console.log('[BCV AVISO] Usando tasa de respaldo mientras responde bcv.org.ve.');
  }
}

obtenerTasaBCV();

// Rutas de la API
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/api/info', (req, res) => res.json(configuracion));

app.post('/api/sincronizar-bcv', async (req, res) => {
  await obtenerTasaBCV();
  res.json(configuracion);
});

app.get('/api/productos', (req, res) => res.json(inventario));

// Registrar Productos
app.post('/api/productos', (req, res) => {
  const { codigoBarras, nombre, precioUSD, stock } = req.body;
  const nuevoProducto = {
    id: inventario.length + 1,
    codigoBarras: codigoBarras || "",
    nombre,
    precioUSD: parseFloat(precioUSD),
    stock: parseInt(stock)
  };
  inventario.push(nuevoProducto);
  res.status(201).json({ mensaje: "Producto registrado", producto: nuevoProducto });
});

// Cobrar Ventas
app.post('/api/ventas', (req, res) => {
  const { productoId, cantidad } = req.body;
  const producto = inventario.find(p => p.id === parseInt(productoId));

  if (!producto) return res.status(404).json({ error: "Producto no encontrado" });
  if (producto.stock < cantidad) return res.status(400).json({ error: "Stock insuficiente" });

  producto.stock -= cantidad;

  const totalUSD = producto.precioUSD * cantidad;
  const totalVES = totalUSD * configuracion.tasaBCV;

  const venta = {
    id: ventasRealizadas.length + 1,
    producto: producto.nombre,
    cantidad,
    totalUSD: totalUSD.toFixed(2),
    totalVES: totalVES.toFixed(2),
    fecha: new Date().toLocaleTimeString()
  };

  ventasRealizadas.push(venta);
  res.status(201).json({ mensaje: "Venta registrada con éxito", venta });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n==================================================`);
  console.log(`¡Sistema POS - Ángel Mejía activo en puerto ${PORT}!`);
  console.log(`==================================================\n`);
});