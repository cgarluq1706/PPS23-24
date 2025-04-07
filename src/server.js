const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
// Importamos las rutas
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
const bloqueoRoutes = require('./routes/bloqueo');

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
    secret: 'secret', // Cambia esta cadena secreta
    resave: false,
    saveUninitialized: true
}));

// Configuración para WebSocket
const WebSocket = require('ws'); // Importar WebSocket
const wss = new WebSocket.Server({ port: 8090 }); // Servidor WebSocket en puerto 8080

// Guardar los sockets de los usuarios conectados
const connectedUsers = {};

wss.on('connection', (ws, req) => {
    console.log('Nuevo cliente conectado');

    ws.on('message', (message) => {
        try {
            const msgData = JSON.parse(message);
            const { emisorId, receptorId, contenido } = msgData;

            if (!emisorId || !receptorId || !contenido) {
                console.error('Datos inválidos:', msgData);
                return ws.send(JSON.stringify({ error: 'Datos inválidos' }));
            }

            console.log('Mensaje recibido:', msgData);

            // Guardar mensaje en la base de datos
            const query = "INSERT INTO mensajes (emisor_id, receptor_id, mensaje) VALUES (?, ?, ?)";
            connection.query(query, [emisorId, receptorId, contenido], (err) => {
                if (err) {
                    console.error('Error al guardar mensaje en la base de datos:', err);
                    return ws.send(JSON.stringify({ error: 'Error al guardar el mensaje' }));
                }

                console.log('Mensaje guardado en la base de datos');

                // Enviar mensaje a ambos usuarios conectados
                wss.clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({
                            emisorId,
                            receptorId,
                            contenido,
                            timestamp: new Date().toISOString()
                        }));
                    }
                });
            });

        } catch (error) {
            console.error('Error al procesar el mensaje:', error);
            ws.send(JSON.stringify({ error: 'Error al procesar el mensaje' }));
        }
    });

    // Manejar desconexión
    ws.on('close', () => {
        console.log('Cliente desconectado');
    });
});

const fileUpload = require("express-fileupload");
app.use(fileUpload()); // Habilita recibir archivos


// Ruta para el chat con otro usuario
app.get('/chat/:id', (req, res) => {
    const usuarioId = req.session.userId;
    const chatWithId = req.params.id;

    if (!usuarioId) {
        return res.status(401).send('Usuario no autenticado');
    }

    // Obtener el nombre del usuario actual y del usuario con quien se chatea
    const queryUsuario = `SELECT nombre FROM usuarios WHERE id = ?`;
    const queryMensajes = `
        SELECT * FROM mensajes 
        WHERE (emisor_id = ? AND receptor_id = ?)
        OR (emisor_id = ? AND receptor_id = ?)
        ORDER BY fecha_envio ASC
    `;

    connection.query(queryUsuario, [chatWithId], (error, results) => {
        if (error) {
            console.error('Error al obtener el nombre del usuario:', error);
            return res.status(500).send('Error en el servidor');
        }

        if (results.length === 0) {
            return res.status(404).send('Usuario no encontrado');
        }

        const nombreUsuario = results[0].nombre;

        connection.query(queryMensajes, [usuarioId, chatWithId, chatWithId, usuarioId], (err, messages) => {
            if (err) {
                console.error('Error al cargar mensajes:', err);
                return res.status(500).send('Error al cargar mensajes');
            }

            // Renderizar la vista de chat y pasar variables
            res.render('chat', {
                usuarioId: chatWithId,
                sessionUserId: usuarioId,
                nombreUsuario: nombreUsuario,
                messages: messages
            });
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

// Ruta para el perfil ajeno
app.get("/perfilajeno/:username", (req, res) => {
    const username = req.params.username; // Usuario cuyo perfil se quiere ver
    const userId = req.session.userId;    // ID del usuario autenticado

    const queryUsuario = `SELECT * FROM usuarios WHERE username = ?`;

    const queryBloqueadoPor = `
        SELECT COUNT(*) AS bloqueado
        FROM bloqueos
        WHERE bloqueador_id = (SELECT id FROM usuarios WHERE username = ?)
        AND bloqueado_id = ?`;

    // Verificar si el usuario está bloqueado por el dueño del perfil
    connection.query(queryBloqueadoPor, [username, userId], (errBloqueado, resultBloqueado) => {
        if (errBloqueado) {
            console.error("Error al verificar si el usuario está bloqueado:", errBloqueado);
            return res.status(500).send("Error interno del servidor");
        }

        if (resultBloqueado[0].bloqueado > 0) {
            return res.status(403).send("No tienes permiso para acceder a este perfil.");
        }

        // Si no está bloqueado, continuar con la lógica normal
        connection.query(queryUsuario, [username], (err, resultUsuario) => {
            if (err) {
                console.error("Error al obtener usuario:", err);
                return res.status(500).send("Error interno del servidor");
            }
            if (resultUsuario.length === 0) {
                return res.status(404).send("Usuario no encontrado");
            }

            const perfilId = resultUsuario[0].id;

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

            const queryBloqueado = `
                SELECT COUNT(*) AS bloqueado
                FROM bloqueos
                WHERE bloqueador_id = ? AND bloqueado_id = ?`;

            connection.query(querySeguidos, [username], (errSeguidos, resultSeguidos) => {
                if (errSeguidos) {
                    console.error("Error al obtener seguidos:", errSeguidos);
                    return res.status(500).send("Error interno del servidor");
                }

                connection.query(querySeguidores, [username], (errSeguidores, resultSeguidores) => {
                    if (errSeguidores) {
                        console.error("Error al obtener seguidores:", errSeguidores);
                        return res.status(500).send("Error interno del servidor");
                    }

                    connection.query(querySeguido, [userId, perfilId], (errSeguido, resultSeguido) => {
                        if (errSeguido) {
                            console.error("Error al obtener estado de seguimiento:", errSeguido);
                            return res.status(500).send("Error interno del servidor");
                        }

                        const seguido = resultSeguido[0].seguido > 0;

                        connection.query(queryBloqueado, [userId, perfilId], (errBloqueado2, resultBloqueado2) => {
                            if (errBloqueado2) {
                                console.error("Error al verificar estado de bloqueo:", errBloqueado2);
                                return res.status(500).send("Error interno del servidor");
                            }

                            const bloqueado = resultBloqueado2[0].bloqueado > 0;

                            res.render("perfilajeno", {
                                usuario: resultUsuario[0],
                                seguidos: resultSeguidos[0].seguidos,
                                seguidores: resultSeguidores[0].seguidores,
                                seguido,
                                bloqueado,
                                userId,
                                username: req.session.username
                            });
                        });
                    });
                });
            });
        });
    });
});


// buscar usuarios
const busquedaRoutes = require("./routes/busqueda");
app.use("/", busquedaRoutes);

// Importar ruta de admin
const adminRoutes = require('./routes/admin');


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
app.use('/', adminRoutes)
app.use('/', bloqueoRoutes);

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
    const username = req.params.username; // Usuario cuyo perfil se quiere ver
    const userId = req.session.userId; // ID del usuario autenticado

    const queryUsuario = `SELECT * FROM usuarios WHERE username = ?`;

    const queryBloqueadoPor = `
        SELECT COUNT(*) AS bloqueado
        FROM bloqueos
        WHERE bloqueador_id = (SELECT id FROM usuarios WHERE username = ?)
        AND bloqueado_id = ?`;

    // Verificar si el usuario está bloqueado por el dueño del perfil
    connection.query(queryBloqueadoPor, [username, userId], (errBloqueado, resultBloqueado) => {
        if (errBloqueado) {
            console.error("Error al verificar si el usuario está bloqueado:", errBloqueado);
            return res.status(500).send("Error interno del servidor");
        }

        if (resultBloqueado[0].bloqueado > 0) {
            // Si el usuario está bloqueado, redirigir o mostrar un mensaje
            return res.status(403).send("No tienes permiso para acceder a este perfil.");
        }

        // Si no está bloqueado, continuar con la lógica normal
        connection.query(queryUsuario, [username], (err, resultUsuario) => {
            if (err) {
                console.error("Error al obtener usuario:", err);
                return res.status(500).send("Error interno del servidor");
            }
            if (resultUsuario.length === 0) {
                return res.status(404).send("Usuario no encontrado");
            }

            const perfilId = resultUsuario[0].id; // Obtenemos el ID del perfil visitado (seguido_id)

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

            const queryBloqueado = `
                SELECT COUNT(*) AS bloqueado
                FROM bloqueos
                WHERE bloqueador_id = ? AND bloqueado_id = ?`;

            // Obtener la cantidad de seguidos
            connection.query(querySeguidos, [username], (errSeguidos, resultSeguidos) => {
                if (errSeguidos) {
                    console.error("Error al obtener seguidos:", errSeguidos);
                    return res.status(500).send("Error interno del servidor");
                }

                // Obtener la cantidad de seguidores
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

                        // Verificar si el usuario logueado ha bloqueado a este perfil
                        connection.query(queryBloqueado, [userId, perfilId], (errBloqueado, resultBloqueado) => {
                            if (errBloqueado) {
                                console.error("Error al verificar estado de bloqueo:", errBloqueado);
                                return res.status(500).send("Error interno del servidor");
                            }

                            const bloqueado = resultBloqueado[0].bloqueado > 0; // true si está bloqueado, false si no

                            // Renderizar la vista con los datos obtenidos
                            res.render("perfilajeno", {
                                usuario: resultUsuario[0],
                                seguidos: resultSeguidos[0].seguidos,
                                seguidores: resultSeguidores[0].seguidores,
                                seguido, // true si lo sigue, false si no
                                bloqueado, // true si está bloqueado, false si no
                                userId,
                                username: req.session.username
                            });
                        });
                    });
                });
            });
        });
    });
});

app.get("/perfil/:username/siguiendo", (req, res) => {
    const usernameperfil = req.params.username;

    const querySiguiendo = `
        SELECT u.id, u.username, u.descripcion,
            EXISTS (
                SELECT 1 FROM bloqueos 
                WHERE bloqueador_id = (SELECT id FROM usuarios WHERE username = ?) 
                AND bloqueado_id = u.id
            ) AS bloqueado
        FROM seguimiento s
        INNER JOIN usuarios u ON s.seguido_id = u.id
        WHERE s.seguidor_id = (SELECT id FROM usuarios WHERE username = ?)
    `;

    connection.query(querySiguiendo, [usernameperfil, usernameperfil], (err, result) => {
        if (err) {
            console.error("Error al obtener la lista de seguidos:", err);
            return res.status(500).send("Error interno del servidor");
        }

        res.render("siguiendo", {
            username: req.session.username,
            usernameperfil,
            siguiendo: result
        });
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

