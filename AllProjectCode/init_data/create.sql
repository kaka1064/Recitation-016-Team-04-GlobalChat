-- DROP TABLE IF EXISTS users CASCADE;
-- CREATE TABLE users(
--     username VARCHAR(50) PRIMARY KEY,
--     password CHAR(60) NOT NULL
-- );
-- edting vvv

DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE users(
    username VARCHAR(50) PRIMARY KEY,
    password CHAR(60) NOT NULL,
    firstname CHAR(60) NOT NULL,
    lastname CHAR(60) NOT NULL, 
    preference CHAR(60) NOT NULL
);