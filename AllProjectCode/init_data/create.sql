
DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE users(
    username VARCHAR(50) PRIMARY KEY,
    password CHAR(60) NOT NULL,
    firstname VARCHAR(60) NOT NULL,
    lastname VARCHAR(60) NOT NULL, 
    preference VARCHAR(60) NOT NULL
);


-- DROP TABLE IF EXISTS friends CASCADE;
-- CREATE TABLE friends(
--     username VARCHAR(50) NOT NULL,
--     friends VARCHAR(50) NOT NULL
-- );

DROP TABLE IF EXISTS news CASCADE;
CREATE TABLE news(
    news_id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    post text NOT NULL,
    language VARCHAR(60) NOT NULL,
    topic VARCHAR(60) NOT NULL
);