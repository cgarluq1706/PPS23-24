const connection = require('../conexion');

const getpublicaciones = (req, res) => {
    const username = req.session.username;
    const sql = ' SELECT u.id, u.nombre, u.foto_perfil, p.contenido , p.fecha_publicacion FROM publicaciones p INNER JOIN usuarios u ON p.usuario_id = u.id INNER JOIN seguimiento s ON u.id = s.seguido_id INNER JOIN usuarios u2 ON s.seguidor_id = u2.id WHERE u2.username = ? ORDER BY p.fecha_publicacion DESC';
    
    connection.query(sql, [username], (err, results) => {
        if (err) {
            console.error('Error al obtener publicaciones', err);
            res.status(500).send('Error al obtener publicaciones');
            return;
        }
                // Comprobar si se encontraron resultados
                if (results.length > 0) {
                    res.render('publicaciones', { username: req.session.username, publicaciones: results });
                } else {
                    res.render('publicaciones', { username: req.session.username, publicaciones: [] }); // Para que no muestre nada pero siga en la página
                }
                
            });

};

// Exporta las funciones y el enrutador
module.exports = {
 getpublicaciones
};