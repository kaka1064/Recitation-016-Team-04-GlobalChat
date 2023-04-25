
DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE users(
    username VARCHAR(50) PRIMARY KEY,
    password CHAR(60) NOT NULL,
    firstname CHAR(60) NOT NULL,
    lastname CHAR(60) NOT NULL, 
    preference CHAR(60) NOT NULL
);


DROP TABLE IF EXISTS friends CASCADE;
CREATE TABLE friends(
    username VARCHAR(50),
    friends VARCHAR(50)
);

DROP TABLE IF EXISTS news CASCADE;
CREATE TABLE news(
    username VARCHAR(50),
    post text
);