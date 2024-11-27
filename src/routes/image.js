const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer();
//
const imageController = require('../controller/imageController');

router
    //login
    .get('/imagen/:id',imageController.getImage)
    .get('/imagenID/:id',imageController.getImageId)
    .post('/modifica_foto',upload.single('image'), imageController.modificaFoto);
    

module.exports = router;