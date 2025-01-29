const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
//importamos las rutas
const loginRoutes = require('./routes/login');
const imageRoutes = require('./routes/image');
const publicacionesRoutes = require('./routes/publicaciones');
const connection = require('./conexion');

const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
    secret: 'secret', // Cambia esta cadena secreta
    resave: false,
    saveUninitialized: true
}));

// Configuración para servir archivos estáticos
app.use(express.static(__dirname));
//plantillas
app.set('view engine', 'ejs');
app.set('views', './src/views');

// Routes
app.use('/', loginRoutes);
app.use('/', imageRoutes);
app.use('/', publicacionesRoutes);

// Nueva ruta para actualizar la descripcion del usuario
app.post('/actualizar-descripcion' , (req, res) => {
    const userId = req.session.userId; // Cogemos la ID del usuario en la sesión
    const descripcion = req.body.descripcion;
    if (!userId) {
        return res.status(401).send('Usuario no autenticado');
    }
    const query = 'UPDATE usuarios SET descripcion = ? WHERE id = ?';
    connection.query(query, [descripcion, userId], (error, results) => {
        if (error) {
            console.error('Error al actualizar la descripción:', error );
            res.status(500).send('Error al guardar la descripción');
        } else {
            res.redirect('/perfil'); //Nos redirige de vuelta al perfil
        }
    });
});

app.get('/perfil', (req, res) => {
    const userId = req.session.userId;

    if (!userId) {
        return res.status(401).send('Usuario no autenticado');
    }

    const query = 'SELECT description FROM usuarios WHERE id = ?';
    connection.query(query, [userId], (error, results) => {
        if (error) {
            console.error('Error al obtener la descripción:', error);
            res.status(500).send('Error al cargar el perfil');
        } else {
            const usuario = {
                descripcion: results[0].descripcion
            };
            res.render('perfil', {usuario });
        }
    });
});

app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
});