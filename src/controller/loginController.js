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
            const validPassword = bcrypt.compare(password, results[0].contraseña);
            if (validPassword) {
                req.session.loggedIn = true;
                req.session.username = username;
                req.session.userId = results[0].id;
                res.redirect('/dashboard');
            } else {
                res.render('index', { mensaje: 'Contraseña inválida' });
            }
        } else {
            res.render('index', { mensaje: 'Usuario no valido' });
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
    const { name, apellido, username, password, fecha_nacimiento, phone } = req.body;

    const calcularEdad = (fechaNacimiento) => {
        const hoy = new Date();
        const nacimiento = new Date(fechaNacimiento);
        let edad = hoy.getFullYear() - nacimiento.getFullYear();
        const mes = hoy.getMonth() - nacimiento.getMonth();
        if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
            edad--;
        }
        return edad;
    };
    //Calculamos edad
    const edad = calcularEdad(fecha_nacimiento);
    if (edad < 16 || edad > 99) {
        return res.status(400).render('registro', { 
            errorEdad: 'Debes tener entre 16 y 99 años.',
            datosPrevios: req.body
        });
    }
      
    const hashedPassword = await bcrypt.hash(password, 10);
    const insertQuery ='INSERT INTO usuarios (nombre, apellido, username, contraseña, fecha_nacimiento, telefono) VALUES (?, ?, ?, ?, ?, ?)';
    const values = [name, apellido, username, hashedPassword, fecha_nacimiento, phone];

    connection.query(insertQuery, values, function(error, results, fields) {
        if (error) {
            console.error('Error al insertar usuario:', error);
            return;
        }
        res.render('index', { mensaje: 'Usuario registrado' });
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
            bcrypt.compare(password, results[0].contraseña, (err, validPassword) => {
                if (err) {
                    console.error("Error al comparar la contraseña:", err);
                    return res.render('index', { mensaje: 'Error en el login' });
                }
                if (validPassword) {
                    req.session.loggedIn = true;
                    req.session.username = username;
                    req.session.userId = results[0].id;
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
    const errorEdad = req.query.errorEdad || null; // Define errorEdad
    res.render('registro', { errorEdad });
};

const getComentarios = (req, res) => {
    res.render('comentarios', { username: req.session.username });
};

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

        // Comprobar si se encotraron resultados
        if (results.length > 0) {
            // Renderizar a plantilla 'perfil' con los datos del usuario

            const sqlseguidores = 'select count(*) from usuarios u inner join seguimiento s on s.seguidor_id = u.id where u.username = ?';
            connection.query(sqlseguidores, [username], (err, results) => {
                if (err) {
                    console.error('Error al obtener datos:', err);
                    res.status(500).send('Error al obtener datos');
                    return;
                }
                const seguidos = results[0]['count(*)'];

            const sqlseguidos = 'select count(*) from usuarios u inner join seguimiento s on s.seguido_id = u.id where u.username = ?';
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

const deleteAccount = (req, res) => {
    const { contraseña } = req.body;
    const userId = req.session.userId; // El ID del usuario debe estar guardado en la sesión

    if (!userId) {
        return res.status(401).send('Usuario no autenticado');
    }

    // Buscar el usuario por su ID para obtener la contraseña almacenada
    const query = 'SELECT * FROM usuarios WHERE id = ?';
    connection.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Error al buscar el usuario:', err);
            return res.status(500).send('Error en el servidor');
        }

        if (results.length === 0) {
            return res.status(404).send('Usuario no encontrado');
        }

        // Comparar la contraseña proporcionada con la almacenada en la base de datos
        bcrypt.compare(contraseña, results[0].contraseña, (err, isMatch) => {
            if (err) {
                console.error('Error al comparar las contraseñas:', err);
                return res.status(500).send('Error en el servidor');
            }

            if (!isMatch) {
                return res.render('borrar', { mensaje: 'Contraseña incorrecta' });
            }

            // Si las contraseñas coinciden, proceder a eliminar la cuenta
            const deleteQuery = 'DELETE FROM usuarios WHERE id = ?';
            connection.query(deleteQuery, [userId], (err, results) => {
                if (err) {
                    console.error('Error al eliminar la cuenta:', err);
                    return res.status(500).send('Error al eliminar la cuenta');
                }

                // Destruir la sesión después de eliminar la cuenta
                req.session.destroy((err) => {
                    if (err) {
                        console.error('Error al destruir la sesión:', err);
                    }
                    res.redirect('/'); // Redirigir al inicio después de eliminar la cuenta
                });
            });
        });
    });
};


// Función para desactivar cuenta (guardar datos en la tabla "recovery" y desactivar cuenta)
const deactivateAccount = (req, res) => {
    const userId = req.session.userId; // El ID del usuario debe estar guardado en la sesión

    if (!userId) {
        return res.status(401).send('Usuario no autenticado');
    }

    // Verificar si el usuario existe en la tabla `usuarios`
    const queryUsuario = 'SELECT * FROM usuarios WHERE id = ?';
    connection.query(queryUsuario, [userId], (err, results) => {
        if (err) {
            console.error('Error al buscar el usuario:', err);
            return res.status(500).send('Error al buscar el usuario');
        }

        if (results.length === 0) {
            console.log(`Usuario con ID ${userId} no encontrado en la tabla usuarios`);
            return res.status(404).send('Usuario no encontrado');
        }

        const usuario = results[0];
        console.log(`Usuario encontrado: ${usuario.id} - ${usuario.username}`);

        // 1️⃣ Insertar los datos del usuario en la tabla `recovery`
        const queryRecovery = `
            INSERT INTO recovery (id, nombre, apellido, username, foto_perfil, fecha_nacimiento, telefono, descripcion, twitter, instagram, linkedin, github)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        connection.query(queryRecovery, [
            usuario.id,
            usuario.nombre,
            usuario.apellido,
            usuario.username,
            usuario.foto_perfil,
            usuario.fecha_nacimiento,
            usuario.telefono,
            usuario.descripcion,
            usuario.twitter,
            usuario.instagram,
            usuario.linkedin,
            usuario.github
        ], (errorInsert, resultsInsert) => {
            if (errorInsert) {
                console.error('Error al insertar en la tabla recovery:', errorInsert);
                return res.status(500).send('Error al guardar en la tabla recovery');
            }

            console.log('Usuario copiado a la tabla recovery con éxito');

            // 2️⃣ Borrar el usuario de la tabla `usuarios`
            const deleteQuery = 'DELETE FROM usuarios WHERE id = ?';
            connection.query(deleteQuery, [userId], (err, resultsDelete) => {
                if (err) {
                    console.error('Error al ejecutar la eliminación de usuario:', err);
                    return res.status(500).send('Error al eliminar la cuenta');
                }

                console.log(`Filas afectadas por la eliminación: ${resultsDelete.affectedRows}`);

                // Verificar si el usuario fue eliminado
                if (resultsDelete.affectedRows === 0) {
                    console.log(`No se encontró el usuario con ID ${userId} para borrar en la tabla usuarios`);
                    return res.status(404).send('No se pudo eliminar el usuario');
                }

                // 3️⃣ Destruir la sesión después de eliminar la cuenta
                req.session.destroy((err) => {
                    if (err) {
                        console.error('Error al destruir la sesión:', err);
                    }
                    console.log('Sesión destruida con éxito');
                    // Redirigir al inicio después de desactivar
                    res.redirect('/'); // Redirige al inicio después de desactivar
                });
            });
        });
    });
};

// Ruta para manejar el formulario de recuperación
const restoreAccount = (req, res) => {
    const { username, password } = req.body; // Recibe el username y la contraseña desde el formulario

    if (!username || !password) {
        return res.status(400).send('Faltan el nombre de usuario o la contraseña');
    }

    // Verificar si el usuario existe en la tabla `recovery`
    const queryRecovery = 'SELECT * FROM recovery WHERE username = ?';
    connection.query(queryRecovery, [username], (err, results) => {
        if (err) {
            console.error('Error al buscar el usuario en recovery:', err);
            return res.status(500).send('Error al buscar el usuario');
        }

        if (results.length === 0) {
            console.log(`Usuario con username ${username} no encontrado en la tabla recovery`);
            return res.status(404).send('Usuario no encontrado en la tabla recovery');
        }

        const recoveryUser = results[0];

        // Cifrar la contraseña antes de insertarla en la tabla usuarios
        bcrypt.hash(password, 10, (err, hashedPassword) => {
            if (err) {
                console.error('Error al cifrar la contraseña:', err);
                return res.status(500).send('Error al cifrar la contraseña');
            }

            // Insertar los datos del usuario en la tabla `usuarios`
            const queryInsertUsuario = `
                INSERT INTO usuarios (nombre, apellido, username, contraseña, foto_perfil, fecha_nacimiento, telefono, descripcion, twitter, instagram, linkedin, github)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            connection.query(queryInsertUsuario, [
                recoveryUser.nombre,
                recoveryUser.apellido,
                recoveryUser.username,
                hashedPassword, // Contraseña cifrada
                recoveryUser.foto_perfil,
                recoveryUser.fecha_nacimiento,
                recoveryUser.telefono,
                recoveryUser.descripcion,
                recoveryUser.twitter,
                recoveryUser.instagram,
                recoveryUser.linkedin,
                recoveryUser.github
            ], (errorInsert, resultsInsert) => {
                if (errorInsert) {
                    console.error('Error al insertar en la tabla usuarios:', errorInsert);
                    return res.status(500).send('Error al guardar en la tabla usuarios');
                }

                console.log('Usuario restaurado en la tabla usuarios con éxito');

                // Eliminar el usuario de la tabla `recovery` después de restaurarlo
                const deleteQuery = 'DELETE FROM recovery WHERE username = ?';
                connection.query(deleteQuery, [username], (errDelete, resultsDelete) => {
                    if (errDelete) {
                        console.error('Error al eliminar el usuario de recovery:', errDelete);
                        return res.status(500).send('Error al eliminar el usuario de recovery');
                    }

                    console.log(`Usuario con username ${username} eliminado de recovery`);

                    // Redirigir al login
                    res.redirect('/login'); // Redirige al login
                });
            });
        });
    });
};




module.exports = {
    getIndex,
    login,
    logout,
    getDashboard,
    postLogin,
    getRegistro,
    getComentarios,
    postRegister,
    getError,
    getPerfil,
    deleteAccount,
    deactivateAccount,
    restoreAccount
};