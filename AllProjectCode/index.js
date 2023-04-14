const express = require('express');
const app = express();
const pgp = require('pg-promise')();
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt'); 
const axios = require('axios');

const dbConfig = {
    host: 'db', 
    port: 5432, 
    database: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER, 
    password: process.env.POSTGRES_PASSWORD, 
};

const db = pgp(dbConfig);
db.connect().then(obj=>{
    obj.done();
}).catch(error=>{
    console.log(error);
});

app.set('view-engine','ejs');
app.use(bodyParser.json());

app.use(
    session({
        secret : process.env.SESSION_SECRET,
        saveUninitialized: false,
        resave: false,
    })
);

app.use(
    bodyParser.urlencoded({
        extended : true,
    })
);

app.get('/welcome', (req, res) => {
    res.json({status: 'success', message: 'Welcome!'});
});

app.get('/login',(req,res)=>{
    res.render('views/pages/login');
});
app.listen(3000);
console.log("success");
module.exports = app;