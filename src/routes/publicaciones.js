const express = require('express');
const router = express.Router();
const publicacionesController = require('../controller/publicacionesController');

// Ruta para obtener publicaciones
router.get("/publicaciones", publicacionesController.getpublicaciones);

// Ruta para crear una nueva publicación
router.post('/publicaciones', publicacionesController.crearPublicacion);

// Ruta para eliminar una publicación
router.delete('/publicaciones/:id', publicacionesController.eliminarPublicacion);

// Ruta para obtener las publicaciones del usuario
router.get('/mis_publicaciones', publicacionesController.getMisPublicaciones);

module.exports = router;