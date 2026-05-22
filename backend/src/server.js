// import 'dotenv/config'; // Carga .env ANTES de cualquier otro import
// import app from './app.js';

// const PUERTO = Number(process.env.PORT) || 3001;

// app.listen(PUERTO, () => {
//     console.log(`✅ Backend corriendo en http://localhost:${PUERTO}`);
//     console.log(`   FRONTEND_URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
// });

// CONFIGURACION PARA ADAPTAR AL USO EN RED LOCAL
import 'dotenv/config';
import app from './app.js';

const PUERTO = Number(process.env.PORT) || 3001;
const HOST = '0.0.0.0';

app.listen(PUERTO, HOST, () => {
    console.log(`✅ Backend corriendo en http://localhost:${PUERTO}`);
    console.log(`✅ Frontend corriendo en ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
});
