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

// buscar usuarios
const busquedaRoutes = require("./routes/busqueda");
app.use("/", busquedaRoutes);


// Configuración para servir archivos estáticos
app.use(express.static(__dirname));
//plantillas
app.set('view engine', 'ejs');
app.set('views', './src/views');

// Routes
app.use('/', loginRoutes);
app.use('/', imageRoutes);
app.use('/', publicacionesRoutes);

app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
});
const comentariosRoutes = require('./routes/comentarios'); // Importa la ruta de comentarios
app.use("/", comentariosRoutes); // Activa la ruta de comentarios

// Nueva ruta para actualizar la descripcion del usuario
app.post('/actualizar-descripcion' , (req, res) => {
    const userId = req.session.userId; // Cogemos la ID del usuario en la sesi贸n
    const descripcion = req.body.descripcion;
    if (!userId) {
        return res.status(401).send('Usuario no autenticado');
    }
    const query = 'UPDATE usuarios SET descripcion = ? WHERE id = ?';
    connection.query(query, [descripcion, userId], (error, results) => {
        if (error) {
            console.error('Error al actualizar la descripci贸n:', error );
            res.status(500).send('Error al guardar la descripci贸n');
        } else {
            res.redirect('/perfil'); //Nos redirige de vuelta al perfil
        }
    });
});

// Nueva ruta para actualizar las redes sociales del usuario
app.post('/actualizar-redes' , (req, res) => {
    const userId = req.session.userId;
    const { descripcion, twitter, instagram, linkedin, github } = req.body;

    if(!userId) {
        return res.status(401).send('Usuario no autenticado');
    }

    const query = `
        UPDATE usuarios
        SET
            twitter = ?,
            instagram = ?,
            linkedin = ?,
            github = ?
        WHERE id = ?
    `;

    connection.query(
        query,
        [twitter, instagram, linkedin, github, userId],
        (error, results) => {
            if (error) {
                console.error('Error al actualizar las redes sociales:', error);
                return res.status(500).send('Error al guardar los cambios');
            }
          res.redirect('/perfil');
        }
    );
});

app.get('/perfil', (req, res) => {
    const userId = req.session.userId;

    if (!userId) {
        return res.status(401).send('Usuario no autenticado');
    }

    // Consulta SQL para obtener los datos del perfil del usuario
    const query = 'SELECT description, twitter, instagram, linkedin, github FROM usuarios WHERE id = ?';
    connection.query(query, [userId], (error, results) => {
        if (error) {
            console.error('Error al obtener la descripci贸n:', error);
            res.status(500).send('Error al cargar el perfil');
        } else {
            const usuario = results[0];  // Obtener el primer resultado
            res.render('perfil', {usuario });
        }
    });
});
