const express = require('express');
const router = express.Router();
//
const publicacionesController = require('../controller/publicacionesController');

router
    //login
    .get("/publicaciones", publicacionesController.getpublicaciones);
    //.get("/getMispublicaciones",publicacionesController.getMispublicaciones);

module.exports = router;