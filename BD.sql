
drop database if exists red_social;
create database if not exists red_social;

use red_social; 


CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) not null,
    username varchar(100) not null unique,
 --   email VARCHAR(100) NOT NULL UNIQUE,
    contraseña CHAR(60) NOT NULL,
    fecha_nacimiento date,
    telefono varchar(100),
    foto_perfil LONGBLOB,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    activo boolean default 1,
    descripción VARCHAR(100)
);
-- Creación de la tabla de seguimiento
CREATE TABLE IF NOT EXISTS seguimiento (
    seguidor_id INT,
    seguido_id INT,
    PRIMARY KEY (seguidor_id, seguido_id),
    FOREIGN KEY (seguidor_id) REFERENCES usuarios(id),
    FOREIGN KEY (seguido_id) REFERENCES usuarios(id)
);


-- Creación de la tabla de publicaciones
CREATE TABLE IF NOT EXISTS publicaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT,
    contenido TEXT,
    fecha_publicacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

select * from usuarios u ;


-- para ver desde que rutas se pueden subir archivos
SHOW VARIABLES LIKE 'secure_file_priv';
-- Hay que incluir \\ 
-- C:\\ProgramData\\MySQL\\MySQL Server 8.3\\Uploads\\
INSERT INTO usuarios (nombre, apellido, username, contraseña, fecha_nacimiento, telefono, foto_perfil)
VALUES ('Miguel', 'Ternero Algarín', 'miguelt', '$2a$10$DxvoLNDuQpgNbheGIRb7ZuKoJA91o24LllzbEGp4fpt.JFqLJ8QUC', '1985-10-20', '987654321', LOAD_FILE('C:\\ProgramData\\MySQL\\MySQL Server 8.3\\Uploads\\IMG_36290.jpg'));
INSERT INTO usuarios (nombre, apellido, username, contraseña, fecha_nacimiento, telefono, foto_perfil)
VALUES ('María', 'RuiG', 'mariar', '$2a$10$DxvoLNDuQpgNbheGIRb7ZuKoJA91o24LllzbEGp4fpt.JFqLJ8QUC', '1985-10-20', '987654321', LOAD_FILE('C:\\ProgramData\\MySQL\\MySQL Server 8.3\\Uploads\\IMG_36264.jpg'));
INSERT INTO usuarios (nombre, apellido, username, contraseña, fecha_nacimiento, telefono, foto_perfil)
VALUES ('Ronaldo', 'de Assis Moreira', 'Ronaldinho1', '$2a$10$DxvoLNDuQpgNbheGIRb7ZuKoJA91o24LllzbEGp4fpt.JFqLJ8QUC', '1985-10-20', '987654321', LOAD_FILE('C:\\ProgramData\\MySQL\\MySQL Server 8.3\\Uploads\\Ronaldinho.png'));
INSERT INTO usuarios (nombre, apellido, username, contraseña, fecha_nacimiento, telefono, foto_perfil)
VALUES ('Linda', 'Onotanto', 'officialLinda1', '$2a$10$DxvoLNDuQpgNbheGIRb7ZuKoJA91o24LllzbEGp4fpt.JFqLJ8QUC', '1985-10-20', '987654321', LOAD_FILE('C:\\ProgramData\\MySQL\\MySQL Server 8.3\\Uploads\\IMG_36268.jpg'));


-- Miguel sigue a ...
insert into seguimiento values(1,2);
insert into seguimiento values(1,3);

-- mariar sigue a ...
insert into seguimiento values(2,1);
insert into seguimiento values(2,3);
insert into seguimiento values(2,4);

-- Ronaldo sigue a ...
insert into seguimiento values(3,4);

-- linda sigue a ...
insert into seguimiento values(4,2);
insert into seguimiento values(4,3);


-- Maria escribe varios post
insert into publicaciones (usuario_id,contenido)   values(2,'Soy nuevo en SocialTernero');
insert into publicaciones (usuario_id,contenido)   values(2,'Seguidme!! please');
insert into publicaciones (usuario_id,contenido)   values(2,'Divide et impera ');
insert into publicaciones (usuario_id,contenido)   values(2,'Esta red funciona');
-- Linda escribe varios post
insert into publicaciones (usuario_id,contenido)   values(4,'Hola Red social');
insert into publicaciones (usuario_id,contenido)   values(4,'Cogito Ergo sum');
-- Ronaldinho escribe varios post
insert into publicaciones (usuario_id,contenido) values(3,'Dura derrota, a seguir trabajando!');
insert into publicaciones (usuario_id,contenido) values(3,'Gran victoría!! este equipo promete');




-- CONSULTAS

-- post de los que yo sigo
SELECT p.*
FROM publicaciones p
INNER JOIN seguimiento s ON p.usuario_id = s.seguido_id
WHERE s.seguidor_id = 1
ORDER BY p.fecha_publicacion DESC;

SELECT u.nombre, u.foto_perfil, p.contenido , p.fecha_publicacion 
FROM publicaciones p
INNER JOIN usuarios u ON p.usuario_id = u.id
INNER JOIN seguimiento s ON u.id = s.seguido_id
INNER JOIN usuarios u2 ON s.seguidor_id = u2.id
WHERE u2.username = 'miguelt'
ORDER BY p.fecha_publicacion DESC;
