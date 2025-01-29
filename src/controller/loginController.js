const bcrypt = require('bcryptjs');// Añade la importación de bcrypt
const connection = require('../conexion');

    

const getIndex = (req, res) => {
    res.render('index',{ mensaje: '' });
};

const login = (req, res) => {
    const username = req.body.username;
    const password = req.body.contraseña;
    const query = 'SELECT * FROM usuarios WHERE username = ?';
   
    connection.query(query, [username], (err, results) => {
        if (err) throw err;
        if (results.length > 0) {
            // Verificar si la contraseña coincide utilizando bcrypt.compare()
            const validPassword = bcrypt.compare(password, results[0].contraseña);
                if (validPassword) {
                    req.session.loggedIn = true; // Establece la sesión como iniciada
                    req.session.username = username; // Guarda el nombre de usuario en la sesión
                    res.redirect('/dashboard'); // Redirige al usuario al panel de control (dashboard)
                } else {
                    res.render('index', { mensaje: 'Contraseña inválida' });
                }
   
        } else {
            res.render('index', { mensaje: 'Usuario no valido' }); // Redirige al usuario de vuelta al formulario de inicio de sesión con un mensaje de error
        }
    
    });
};


const logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
        }
        
        res.redirect('/');
    });
};

const getDashboard = (req, res) => {
    if (req.session.userId) {
     res.render('dashboard', { username: req.session.username });
 } else {
     res.render('error');
 }
 };

 const postRegister = async (req, res) => {
    //const url = req.body;
    const { name, apellido, username, password, fecha_nacimiento, phone } = req.body;
    // Encriptar la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);
    const insertQuery ='INSERT INTO usuarios (nombre, apellido, username, contraseña, fecha_nacimiento, telefono) VALUES (?, ?, ?, ?, ?, ?)';
    const values = [name, apellido, username, hashedPassword, fecha_nacimiento, phone];
    // Ejecutar la consulta INSERT
    connection.query(insertQuery, values, function(error, results, fields) {
    if (error) {
        console.error('Error al insertar usuario:', error);
        return;
    }
    //console.log('Usuario insertado correctamente');
    res.render('index',{ mensaje: 'Usuario registrado' });
    });
};

 
const postLogin = async (req, res) => {
    const username = req.body.username;
    const password = req.body.contraseña;
    const query = 'SELECT * FROM usuarios WHERE username = ?';

    connection.query(query, [username], async (err, results) => {
        if (err) throw err;
        if (results.length > 0) {
            const validPassword = await bcrypt.compare(password, results[0].contraseña);
            if (validPassword) {
                req.session.loggedIn = true; // Indicador de sesión iniciada
                req.session.username = username; // Guardar el nombre de usuario
                req.session.userId = results[0].id; // Guardar el ID del usuario
                res.redirect('/dashboard');
            } else {
                res.render('index', { mensaje: 'Contraseña inválida' });
            }
        } else {
            res.render('index', { mensaje: 'Usuario no válido' });
        }
    });
};

const getRegistro = (req, res) => {
    res.render('registro');
};

const getComentarios = (req, res) => {
    res.render('comentarios',{ username: req.session.username });
};
/*
const getpublicaciones = (req, res) => {
    res.render('publicaciones',{ username: req.session.username });
}; */

const getError = (req, res) => {
    res.render('error');
};

const getPerfil = (req, res) => {
    const userId = req.session.userId; // Obtener el userId de la sesión
    const mensaje = req.query.mensaje;

    if (!userId) {
        return res.status(401).send('Usuario no autenticado'); // Si no hay userId, el usuario no está autenticado
    }

    // Consulta SQL para obtener los datos del perfil del usuario
    const sql = 'SELECT * FROM usuarios WHERE id = ?';
    connection.query(sql, [userId], (err, results) => {
        if (err) {
            console.error('Error al obtener datos del perfil:', err);
            res.status(500).send('Error al obtener datos del perfil');
            return;
        }

        // Comprobar si se encontraron resultados
        if (results.length > 0) {
            const usuario = results[0];

            // Consulta para obtener el número de seguidores y seguidos
            const sqlSeguidoresSeguidos = `
                SELECT 
                    (SELECT COUNT(*) FROM seguimiento WHERE seguido_id = ?) AS seguidores,
                    (SELECT COUNT(*) FROM seguimiento WHERE seguidor_id = ?) AS seguidos
            `;

            connection.query(sqlSeguidoresSeguidos, [userId, userId], (err, results) => {
                if (err) {
                    console.error('Error al obtener datos de seguidores y seguidos:', err);
                    res.status(500).send('Error al obtener datos de seguidores y seguidos');
                    return;
                }

                const seguidores = results[0].seguidores;
                const seguidos = results[0].seguidos;

                // Renderizar la plantilla 'perfil' con los datos del usuario
                res.render('perfil', { 
                    username: req.session.username, 
                    usuario, 
                    seguidos, 
                    seguidores, 
                    mensaje 
                });
            });
        } else {
            res.status(404).send('Usuario no encontrado');
        }
    });
};

// Exporta las funciones y el enrutador
module.exports = {
    getIndex,
    login,
    logout,
    getDashboard,
    postLogin,
    getRegistro,
    getComentarios,
 //   getpublicaciones,
    postRegister,
    getError,
    getPerfil

};