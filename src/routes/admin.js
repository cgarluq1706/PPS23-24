const express = require('express');
const router = express.Router();
const connection = require('../conexion');

// Middleware para verificar si el usuario es administrador
function verifyAdmin(req, res, next) {
    if (!req.session || req.session.role !== 'admin') {
        return res.status(403).send('Acceso denegado: Solo los administradores pueden acceder.');
    }
    next();
}

// Ruta para renderizar el panel de administrador
router.get('/admin', verifyAdmin, (req, res) => {
    res.render('admin', { username: req.session.username });
});

// Ruta para obtener las publicaciones de un usuario (visibles y ocultas)
router.get('/admin/users/:id/posts/all', verifyAdmin, (req, res) => {
    const userId = req.params.id;
    const query = `
        SELECT id, contenido AS title, num_like AS likes, oculto 
        FROM publicaciones 
        WHERE usuario_id = ?
        `;
    connection.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Error al obtener publicaciones:', err);
            return res.status(500).send('Error al obtener publicaciones');
        }
        res.json(results);
    });
});

// Ruta para eliminar una publicación (ocultar)
router.delete('/admin/posts/:id', verifyAdmin, (req, res) => {
    const postId = req.params.id;
    const query = 'UPDATE publicaciones SET oculto = TRUE WHERE id = ?';
    connection.query(query, [postId], (err, results) => {
        if (err) {
            console.error('Error al ocultar publicación:', err);
            return res.status(500).send('Error al ocultar publicación');
        }
        res.sendStatus(200); //OK
    });
});

// Ruta para hacer visible una publicación (desocultar)
router.put('/admin/posts/:id/visible', verifyAdmin, (req, res) => {
    const postId = req.params.id;
    const query = 'UPDATE publicaciones SET oculto = FALSE WHERE id = ?';
    connection.query(query, [postId], (err, results) => {
        if (err) {
            console.error('Error al hacer visible la publicación:', err);
            return res.status(500).send('Error al hacer visible la publicación');
        }
        res.sendStatus(200); // OK
    });
});

// Ruta para obtener todos los comentarios (visibles e invisibles) de una publicación
router.get('/admin/posts/:id/comments/all', verifyAdmin, (req, res) => {
    const postId = req.params.id;
    const query = `
        SELECT c.id AS comment_id, c.contenido AS comment_content, c.oculto, u.username AS commenter_username
        FROM comentarios c
        INNER JOIN usuarios u ON c.usuario_id = u.id
        WHERE c.publicacion_id = ?
    `;
    connection.query(query, [postId], (err, results) => {
        if (err) {
            console.error('Error al obtener comentarios:', err);
            return res.status(500).send('Error al obtener comentarios');
        }
        res.json(results);
    });
});

// Ruta para ocultar un comentario
router.delete('/admin/comments/:id', verifyAdmin, (req, res) => {
    const commentId = req.params.id;
    const query = 'UPDATE comentarios SET oculto = TRUE WHERE id = ?';
    connection.query(query, [commentId], (err, results) => {
        if (err) {
            console.error('Error al ocultar comentario:', err);
            return res.status(500).send('Error al ocultar comentario');
        }
        res.sendStatus(200); // OK
    });
});

// Ruta para hacer visible un comentario
router.put('/admin/comments/:id/visible', verifyAdmin, (req, res) => {
    const commentId = req.params.id;
    const query = 'UPDATE comentarios SET oculto = FALSE WHERE id = ?';
    connection.query(query, [commentId], (err, results) => {
        if (err) {
            console.error('Error al hacer visible el comentario:', err);
            return res.status(500).send('Error al hacer visible el comentario');
        }
        res.sendStatus(200); // OK
    });
});

// Ruta para buscar un usuario por username (incluye ocultos si es admin)
router.get('/admin/users/search/all', verifyAdmin, (req, res) => {
    const { username } = req.query;
    const query = `
        SELECT id, nombre, apellido, username, fecha_nacimiento, telefono, foto_perfil, descripcion, twitter, instagram, linkedin, github, role, oculto
        FROM usuarios 
        WHERE username LIKE ?
    `;
    connection.query(query, [`%${username}%`], (err, results) => {
        if (err) {
            console.error('Error al buscar usuario:', err);
            return res.status(500).send('Error al buscar usuario');
        }
        if (results.length > 0) {
            res.json(results[0]); // Devuelve el primer usuario encontrado
        } else {
            res.status(404).send('Usuario no encontrado');
        }
    });
});

// Ruta para ocultar un usuario
router.delete('/admin/users/:id', verifyAdmin, (req, res) => {
    const userId = req.params.id;
    const query = 'UPDATE usuarios SET oculto = TRUE WHERE id = ?';
    connection.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Error al ocultar usuario:', err);
            return res.status(500).send('Error al ocultar usuario');
        }
        res.sendStatus(200); // OK
    });
});

// Ruta para hacer visible un usuario
router.put('/admin/users/:id/visible', verifyAdmin, (req, res) => {
    const userId = req.params.id;
    const query = 'UPDATE usuarios SET oculto = FALSE WHERE id = ?';
    connection.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Error al hacer visible el usuario:', err);
            return res.status(500).send('Error al hacer visible el usuario');
        }
        res.sendStatus(200); // OK
    });
});

// Ruta para dar like a una publicación
router.post('/admin/posts/:id/like', verifyAdmin, (req, res) => {
    const postId = req.params.id;
    console.log('Post ID recibido:', postId); // Verifica el ID recibido
    const query = 'UPDATE publicaciones SET num_like = num_like + 1 WHERE id = ?';
    connection.query(query, [postId], (err, results) => {
        if (err) {
            console.error('Error al agregar like:', err);
            return res.status(500).send('Error al agregar like');
        }
        res.sendStatus(200); // OK
    });
});
module.exports = router;