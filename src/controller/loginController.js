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
        return res.send("<script>alert('La edad debe estar entre 16 y 99 años.'); window.location.href='/registro';</script>");
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
    res.render('registro');
};

const getComentarios = (req, res) => {
    res.render('comentarios', { username: req.session.username });
};

const getError = (req, res) => {
    res.render('error');
};

const getPerfil = (req, res) => {
    const username = req.session.username;
    res.render('perfil', { username });
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
    getPerfil
};
