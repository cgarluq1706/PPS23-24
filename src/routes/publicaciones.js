const express = require('express');
const router = express.Router();
const publicacionesController = require('../controller/publicacionesController');

// Ruta para obtener publicaciones
router.get("/publicaciones", publicacionesController.getpublicaciones);

module.exports = router;
