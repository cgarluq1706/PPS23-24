const express = require('express');
const router = express.Router();
const connection = require('../conexion');

router.get('/:id', (req, res) => {
    const usuarioId = req.params.id;
    const sessionUserId = req.session.userId;

    if (!sessionUserId) {
        return res.redirect('/login');
    }

    connection.query('SELECT nombre FROM usuarios WHERE id = ?', [usuarioId], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error en la base de datos');
        }

        if (results.length === 0) {
            return res.status(404).send('Usuario no encontrado');
        }

        const nombreUsuario = results[0].nombre;

        const query = `
            SELECT * FROM mensajes 
            WHERE (emisor_id = ? AND receptor_id = ?) 
            OR (emisor_id = ? AND receptor_id = ?)
            ORDER BY fecha_envio ASC
        `;
        connection.query(query, [sessionUserId, usuarioId, usuarioId, sessionUserId], (error, messages) => {
            if (error) {
                console.error(error);
                return res.status(500).send('Error al cargar mensajes');
            }

            res.render('chat', { 
                usuarioId,
                nombreUsuario,
                messages,
                sessionUserId
            });
        });
    });
});

module.exports = router;
