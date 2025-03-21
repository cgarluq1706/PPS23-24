const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
//importamos las rutas
const loginRoutes = require('./routes/login');
const imageRoutes = require('./routes/image');
const publicacionesRoutes = require('./routes/publicaciones');
const likeRoutes = require("./routes/like");
const seguirRoutes = require("./routes/seguir");
const guardadoRoutes = require("./routes/elementoguardado");
const connection = require('./conexion');
const { deleteAccount } = require('./controller/loginController');
const { deactivateAccount } = require('./controller/loginController');
const { restoreAccount } = require('./controller/loginController'); 

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


// Buscar usuarios
app.get('/buscar', (req, res) => {
    const query = req.query.q;

    if (!query) {
        return res.json([]); // Si no hay consulta, devuelve una lista vacía
    }

    const searchQuery = `
        SELECT id, nombre, apellido, username, foto_perfil 
        FROM usuarios 
        WHERE nombre LIKE ? OR apellido LIKE ? OR username LIKE ?
        LIMIT 5
    `;

    connection.query(searchQuery, [`%${query}%`, `%${query}%`, `%${query}%`], (error, results) => {
        if (error) {
            console.error("Error al buscar usuarios:", error);
            return res.status(500).json({ error: "Error en la búsqueda" });
        }

        const users = results.map(user => ({
            id: user.id,
            nombre: user.nombre,
            apellido: user.apellido,
            username: user.username,
            foto: user.foto_perfil ? `data:image/jpeg;base64,${user.foto_perfil.toString("base64")}` : "https://via.placeholder.com/40"
        }));

        res.json(users);
    });
});

app.get("/perfilajeno/:username", (req, res) => {
    const username = req.params.username;
    const userId = req.session.userId;
    
    const queryUsuario = `SELECT * FROM usuarios WHERE username = ?`;
    
    const querySeguidos = `
        SELECT COUNT(*) AS seguidos
        FROM seguimiento s
        INNER JOIN usuarios u ON s.seguidor_id = u.id
        WHERE u.username = ?`;
    
    const querySeguidores = `
        SELECT COUNT(*) AS seguidores
        FROM seguimiento s
        INNER JOIN usuarios u ON s.seguido_id = u.id
        WHERE u.username = ?`;
    
    const querySeguido = `
        SELECT COUNT(*) AS seguido
        FROM seguimiento
        WHERE seguidor_id = ? AND seguido_id = ?`;
    
    // 1️⃣ Obtener el perfilId a partir del username
    connection.query(queryUsuario, [username], (err, resultUsuario) => {
        if (err) {
            console.error("Error al obtener usuario:", err);
            return res.status(500).send("Error interno del servidor");
        }
        if (resultUsuario.length === 0) {
            return res.status(404).send("Usuario no encontrado");
        }
    
        const perfilId = resultUsuario[0].id; // Obtenemos el ID del perfil visitado (seguido_id)
    
        // 2️⃣ Obtener la cantidad de seguidos
        connection.query(querySeguidos, [username], (errSeguidos, resultSeguidos) => {
            if (errSeguidos) {
                console.error("Error al obtener seguidos:", errSeguidos);
                return res.status(500).send("Error interno del servidor");
            }
    
            // 3️⃣ Obtener la cantidad de seguidores
            connection.query(querySeguidores, [username], (errSeguidores, resultSeguidores) => {
                if (errSeguidores) {
                    console.error("Error al obtener seguidores:", errSeguidores);
                    return res.status(500).send("Error interno del servidor");
                }
    
                // 4️⃣ Verificar si el usuario logueado sigue a este perfil
                connection.query(querySeguido, [userId, perfilId], (errSeguido, resultSeguido) => {
                    if (errSeguido) {
                        console.error("Error al obtener estado de seguimiento:", errSeguido);
                        return res.status(500).send("Error interno del servidor");
                    }
    
                    const seguido = resultSeguido[0].seguido > 0; // true si lo sigue, false si no
    
                    // 5️⃣ Renderizar la vista con los datos obtenidos
                    res.render("perfilAjeno", {
                        usuario: resultUsuario[0],
                        seguidos: resultSeguidos[0].seguidos,
                        seguidores: resultSeguidores[0].seguidores,
                        seguido, // true si lo sigue, false si no
                        userId,
                        username: req.session.username
                    });
                });
            });
        });
    });
    
});


// buscar usuarios
const busquedaRoutes = require("./routes/busqueda");
app.use("/", busquedaRoutes);





// Configurar express para servir archivos estáticos desde la carpeta 'assets'
app.use('/assets', express.static(__dirname + '/assets'));



//plantillas
app.set('view engine', 'ejs');
app.set('views', './src/views');


// Routes
app.use('/', loginRoutes);
app.use('/', imageRoutes);
app.use('/', publicacionesRoutes);
app.use('/', likeRoutes);
app.use('/', seguirRoutes);
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
    const{
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


    // Consulta actualizada para obtener todos los campos necesarioss
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
// Buscar usuarios
app.get('/buscar', (req, res) => {
    const query = req.query.q;

    if (!query) {
        return res.json([]); // Si no hay consulta, devuelve una lista vacía
    }

    const searchQuery = `
        SELECT id, nombre, apellido, username, foto_perfil 
        FROM usuarios 
        WHERE nombre LIKE ? OR apellido LIKE ? OR username LIKE ?
        LIMIT 5
    `;

    connection.query(searchQuery, [`%${query}%`, `%${query}%`, `%${query}%`], (error, results) => {
        if (error) {
            console.error("Error al buscar usuarios:", error);
            return res.status(500).json({ error: "Error en la búsqueda" });
        }

        const users = results.map(user => ({
            id: user.id,
            nombre: user.nombre,
            apellido: user.apellido,
            username: user.username,
            foto: user.foto_perfil ? `data:image/jpeg;base64,${user.foto_perfil.toString("base64")}` : "https://via.placeholder.com/40"
        }));

        res.json(users);
    });
});

app.get("/perfilajeno/:username", (req, res) => {
    const username = req.params.username;
    const userId = req.session.userId;
    
    const queryUsuario = `SELECT * FROM usuarios WHERE username = ?`;
    
    const querySeguidos = `
        SELECT COUNT(*) AS seguidos
        FROM seguimiento s
        INNER JOIN usuarios u ON s.seguidor_id = u.id
        WHERE u.username = ?`;
    
    const querySeguidores = `
        SELECT COUNT(*) AS seguidores
        FROM seguimiento s
        INNER JOIN usuarios u ON s.seguido_id = u.id
        WHERE u.username = ?`;
    
    const querySeguido = `
        SELECT COUNT(*) AS seguido
        FROM seguimiento
        WHERE seguidor_id = ? AND seguido_id = ?`;
    
    //Obtener el perfilId a partir del username
    connection.query(queryUsuario, [username], (err, resultUsuario) => {
        if (err) {
            console.error("Error al obtener usuario:", err);
            return res.status(500).send("Error interno del servidor");
        }
        if (resultUsuario.length === 0) {
            return res.status(404).send("Usuario no encontrado");
        }
    
        const perfilId = resultUsuario[0].id; // Obtenemos el ID del perfil visitado (seguido_id)
    
        //Obtener la cantidad de seguidos
        connection.query(querySeguidos, [username], (errSeguidos, resultSeguidos) => {
            if (errSeguidos) {
                console.error("Error al obtener seguidos:", errSeguidos);
                return res.status(500).send("Error interno del servidor");
            }
    
            //  Obtener la cantidad de seguidores
            connection.query(querySeguidores, [username], (errSeguidores, resultSeguidores) => {
                if (errSeguidores) {
                    console.error("Error al obtener seguidores:", errSeguidores);
                    return res.status(500).send("Error interno del servidor");
                }
    
                // Verificar si el usuario logueado sigue a este perfil
                connection.query(querySeguido, [userId, perfilId], (errSeguido, resultSeguido) => {
                    if (errSeguido) {
                        console.error("Error al obtener estado de seguimiento:", errSeguido);
                        return res.status(500).send("Error interno del servidor");
                    }
    
                    const seguido = resultSeguido[0].seguido > 0; // true si lo sigue, false si no
    
                    // Renderizar la vista con los datos obtenidos
                    res.render("perfilAjeno", {
                        usuario: resultUsuario[0],
                        seguidos: resultSeguidos[0].seguidos,
                        seguidores: resultSeguidores[0].seguidores,
                        seguido,
                        userId,
                        username: req.session.username
                    });
                });
            });
        });
    });
    
});

app.get("/perfilajeno/:username/siguiendo", (req, res) => {
    const usernameperfil = req.params.username;

    const querySiguiendo = `
    SELECT u.id, u.username, u.descripcion
    FROM seguimiento s
    INNER JOIN usuarios u ON s.seguido_id = u.id
    WHERE s.seguidor_id = (SELECT id FROM usuarios WHERE username = ?)
`;

    connection.query(querySiguiendo, [usernameperfil], (err, result) => {
        if (err) {
            console.error("Error al obtener la lista de seguidos:", err);
            return res.status(500).send("Error interno del servidor");
        }

        res.render("siguiendo", {username: req.session.username, usernameperfil, siguiendo: result });
    });
});
app.get("/perfilajeno/:username/seguidores", (req, res) => {
    const usernameperfil = req.params.username;

    const querySeguidores = `
        SELECT u.id, u.username, u.descripcion
        FROM seguimiento s
        INNER JOIN usuarios u ON s.seguidor_id = u.id
        WHERE s.seguido_id = (SELECT id FROM usuarios WHERE username = ?)
    `;

    connection.query(querySeguidores, [usernameperfil], (err, result) => {
        if (err) {
            console.error("Error al obtener la lista de seguidores:", err);
            return res.status(500).send("Error interno del servidor");
        }

        res.render("seguidores", {username: req.session.username, usernameperfil, seguidores: result });
    });
});

app.get("/perfil/:username/seguidores", (req, res) => {
    const usernameperfil = req.params.username;

    const querySeguidores = `
        SELECT u.id, u.username, u.descripcion
        FROM seguimiento s
        INNER JOIN usuarios u ON s.seguidor_id = u.id
        WHERE s.seguido_id = (SELECT id FROM usuarios WHERE username = ?)
    `;

    connection.query(querySeguidores, [usernameperfil], (err, result) => {
        if (err) {
            console.error("Error al obtener la lista de seguidores:", err);
            return res.status(500).send("Error interno del servidor");
        }

        res.render("seguidores", {username: req.session.username, usernameperfil, seguidores: result });
    });
});
app.get("/perfil/:username/siguiendo", (req, res) => {
    const usernameperfil = req.params.username;

    const querySiguiendo = `
    SELECT u.id, u.username, u.descripcion
    FROM seguimiento s
    INNER JOIN usuarios u ON s.seguido_id = u.id
    WHERE s.seguidor_id = (SELECT id FROM usuarios WHERE username = ?)
`;

    connection.query(querySiguiendo, [usernameperfil], (err, result) => {
        if (err) {
            console.error("Error al obtener la lista de seguidos:", err);
            return res.status(500).send("Error interno del servidor");
        }

        res.render("siguiendo", {username: req.session.username, usernameperfil, siguiendo: result });
    });
});

// Ruta para mostrar la página de borrar cuenta
app.get('/borrar', (req, res) => {
    if (req.session.loggedIn) {
        res.render('borrar');  // Renderiza la vista 'borrar.ejs'
    } else {
        res.redirect('/index');  // Si el usuario no está autenticado, redirige al login
    }
});
// Ruta para borrar cuenta
app.post('/borrar', deleteAccount);

// Ruta para desactivar cuenta
app.post('/desactivar', deactivateAccount);


// Ruta para mostrar el formulario de recuperación
app.get('/recovery', (req, res) => {
    res.render('recovery');
  });

  app.post('/restore-account', restoreAccount);
  
app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
});

