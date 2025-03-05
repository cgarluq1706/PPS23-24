const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
//importamos las rutas
const loginRoutes = require('./routes/login');
const imageRoutes = require('./routes/image');
const publicacionesRoutes = require('./routes/publicaciones');
const likeRoutes = require("./routes/like");
const guardadoRoutes = require("./routes/elementoguardado");
const connection = require('./conexion');


const terminosRoutes = require('./routes/terminos');
const acercaRoutes = require('./routes/acerca');
const contactoRoutes = require('./routes/contacto');


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
app.use('/', likeRoutes);
app.use('/', guardadoRoutes);
app.use('/', terminosRoutes);
app.use('/', acercaRoutes);
app.use('/', contactoRoutes);


app.use((req, res, next) => {
    console.log("Sesión activa:", req.session);
    console.log("Usuario autenticado:", req.session.userId);
    next();
});


const comentariosRoutes = require('./routes/comentarios'); // Importa la ruta de comentarios
app.use("/", comentariosRoutes); // Activa la ruta de comentarios




// Nueva ruta para actualizar las redes sociales, la descripcion y la informacion personal
app.post('/actualizar-perfil', (req, res) => {
    const userId = req.session.userId;
    if (!userId) {
        return res.redirect('/perfil?mensaje=error');
    }


    //Recoger todos los campos del formulario
    const {
        nombre,
        apellido,
        fecha_nacimiento,
        telefono,
        descripcion,
        twitter,
        instagram,
        linkedin,
        github
    } = req.body;


    // Query para actualizar todos los campos
    const query = `
        UPDATE usuarios
        SET
            nombre = ?,
            apellido = ?,
            fecha_nacimiento = ?,
            telefono = ?,
            descripcion = ?,
            twitter = ?,
            instagram = ?,
            linkedin = ?,
            github = ?
        WHERE id = ?
    `;


    connection.query(
        query,
        [
            nombre,
            apellido,
            fecha_nacimiento,
            telefono,
            descripcion,
            twitter,
            instagram,
            linkedin,
            github,
            userId
        ],
        (error, results) => {
            if (error) {
                console.error('Error al actualizar el perfil:', error);
                return res.redirect('/perfil?mensaje=error');
            }
            res.redirect('/perfil?mensaje=exito');
        }
    );
});


app.get('/perfil', (req, res) => {
    const userId = req.session.userId;


    if (!userId) {
        return res.status(401).send('Usuario no autenticado');
    }


    // Consulta actualizada para obtener todos los campos necesarios
    const query = `
        SELECT
            nombre,
            apellido,
            fecha_nacimiento,
            telefono,
            descripcion,
            twitter,
            instagram,
            linkedin,
            github
        FROM usuarios
        WHERE id = ?
    `;


    connection.query(query, [userId], (error, results) => {
        if (error) {
            console.error('Error al obtener el perfil:', error);
            return res.status(500).send('Error al cargar el perfil');
        }


        const usuario = results[0] || {};


        // Asegurar formato de fecha válido
        if (usuario.fecha_nacimiento) {
            usuario.fecha_nacimiento = new Date(usuario.fecha_nacimiento)
                .toISOString()
                .split('T')[0];
        }


        const mensaje = req.query.mensaje;
        
       
        res.render('perfil', {
            usuario,
            seguidos: 0,
            seguidores: 0,
            mensaje
        });
    });
});


app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
});

