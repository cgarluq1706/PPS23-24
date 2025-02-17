const bcrypt = require('bcryptjs'); // Importamos bcrypt
const connection = require('../conexion');

    

const getIndex = (req, res) => {
    res.render('index',{ mensaje: '' });
};

const login = (req, res) => {
    const username = req.body.username;
    const password = req.body.contraseña;
    const query = 'SELECT * FROM usuarios WHERE BINARY username = ?';
   
    connection.query(query, [username], (err, results) => {
        if (err) throw err;
        if (results.length > 0) {
            // Verificar si la contraseña coincide utilizando bcrypt.compare()
            const validPassword = bcrypt.compare(password, results[0].contraseña);
                if (validPassword) {
                    req.session.loggedIn = true; // Establece la sesión como iniciada
                    req.session.username = username; // Guarda el nombre de usuario en la sesión
                    req.session.userId = results[0].id; // Guardamos el ID del usuario

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
    if (req.session.loggedIn) {
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

 
const postLogin = (req, res) => {
    const username = req.body.username;
    const password = req.body.contraseña;
    const query = 'SELECT * FROM usuarios WHERE BINARY username = ?';

    connection.query(query, [username], (err, results) => {
        if (err) {
            console.error("Error en la consulta:", err);
            return res.render('index', { mensaje: 'Error en el servidor' });
        }

        if (results.length > 0) {
            // Verificamos si la contraseña coincide con la de la base de datos usando bcrypt
            bcrypt.compare(password, results[0].contraseña, (err, validPassword) => {
                if (err) {
                    console.error("Error al comparar la contraseña:", err);
                    return res.render('index', { mensaje: 'Error en el login' });
                }

                if (validPassword) {
                    // Si la contraseña es válida, establecemos la sesión
                    req.session.loggedIn = true;
                    req.session.username = username; // Guardamos el nombre de usuario en la sesión
                    req.session.userId = results[0].id; // Guardamos el ID del usuario

                    console.log('Usuario autenticado, ID:', req.session.userId);

                    // Redirigimos al dashboard
                    res.redirect('/dashboard');
                } else {
                    res.render('index', { mensaje: 'Contraseña inválida' });
                }
            });
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
    const username = req.session.username;
    const mensaje = req.query.mensaje;
    // Consulta SQL para obtener los datos del perfil del usuario
    const sql = 'SELECT * FROM usuarios WHERE BINARY username = ?';
    connection.query(sql, [username], (err, results) => {
        if (err) {
            console.error('Error al obtener datos del perfil:', err);
            res.status(500).send('Error al obtener datos del perfil');
            return;
        }
        const usuario = results[0];

        // Comprobar si se encontraron resultados
        if (results.length > 0) {
            // Renderizar la plantilla 'perfil' con los datos del usuario
            
            const sqlseguidores = 'select count(*) from usuarios u inner join seguimiento s on s.seguidor_id = u.id where u.username = ?';
            connection.query(sqlseguidores, [username], (err, results) => {
                if (err) {
                    console.error('Error al obtener datos:', err);
                    res.status(500).send('Error al obtener datos');
                    return;
                }
                const seguidos = results[0]['count(*)'];

            const sqlseguidos = 'select count(*) from usuarios u inner join seguimiento s on s.seguido_id  = u.id where u.username  = ?';
            connection.query(sqlseguidos, [username], (err, results) => {
                if (err) {
                    console.error('Error al obtener datos:', err);
                    res.status(500).send('Error al obtener datos');
                    return;
                }
                const seguidores = results[0]['count(*)'];
                res.render('perfil', { username, usuario, seguidos, seguidores, mensaje});
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