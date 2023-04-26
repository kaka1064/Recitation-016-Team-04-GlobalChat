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

app.set('view engine','ejs');
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

///////////////   news   ////////////////////////////////////////////////////////////////

app.get('/news', (req, res) => {
  // console.log("username", req.body);
  //need to send the data from the database to the page when rendering
  const query = `select * from news;`;
  db.any(query)

  .then(function (data) {
    res.render('pages/news', {username: req.session.user.username, data: data});
  })

  .catch(function (err) {
    return console.log(err);
  });

  // res.render('pages/news', {username: req.session.user.username});
});

//app.post  NEEDS TO BE DONE
app.post('/news', (req, res) => {
  //console.log("username", req.body);
  //res.render('pages/news');
  var username = req.body.username;
  var post = req.body.post;
  var language = req.body.language;
  var topic = req.body.topic;
  

  const query = `insert into news (username, post, language, topic) values ($1, $2, $3, $4) returning * ;`;
  console.log(query);
  console.log(req.body);
  db.any(query, [
    req.body.username,
    req.body.post,
    req.body.language,
    req.body.topic,
    
  ])

  .then(function (data) {
    res.redirect('/news');
    // res.render("pages/news", { username: req.session.user.username, data: data, message: "post successfully added"});
  })

  .catch(function(err) {
    //return console.log(err);
    res.render("pages/news", {username: req.session.user.username, message: "failed to add post"});
  });
});

///////////////   news   ////////////////////////////////////////////////////////////////

///////////////   Settings   ////////////////////////////////////////////////////////////////
app.get('/settings', (req, res) => {
    res.render('pages/settings');
});

///////////////   Settings   ////////////////////////////////////////////////////////////////

///////////////   THIS   /////////////////////////////////////////////////////////////////////

app.get('/', (req, res) => {
    res.render('pages/login'); //this will call the /anotherRoute route in the API
  });

///////////////   THIS   /////////////////////////////////////////////////////////////////////

///////////////  HOME     ///////////////////////////////////////////////////////////////////

app.get('/home', (req,res) => {
  res.render('pages/home', {username: req.session.user.username})
});

///////////////  HOME     ///////////////////////////////////////////////////////////////////

///////////////    REGISTER   /////////////////////////////////////////////////////////////////////

app.get('/register', (req, res) => {
    res.render('pages/register')
  });  

app.post('/register', async (req, res) => {
  //hash the password using bcrypt library
  const hash = await bcrypt.hash(req.body.password, 10);

  // var password = req.body.password;
  var username = req.body.username;
  var firstname = req.body.firstname;
  var lastname = req.body.lastname;
  var preference = req.body.preference;
  // To-DO: Insert username and hashed password into 'users' table

  const query = `insert into users (username, password, firstname, lastname, preference) values ($1, $2, $3, $4, $5) returning * ;`;
  // const query = `insert into users (username, password) values (${req.body.username}, ${hash}) returning * ;`;
  console.log(query);
  //we dont need the req.body,username and hash below if we type it into the query
  db.any(query, [
    req.body.username,
    hash,
    req.body.firstname,
    req.body.lastname,
    req.body.preference,
  ])

  .then(function (data) {
    res.render("pages/login", {message: "please log in now."}); //i also changed this to render instead
    //so that users can have a message knowing what they are supposed to do.
  })

  .catch(function(err) {
    //return console.log(err);
    res.render("pages/register", {message: "Error with registration - maybe try a different username"});
  });
});

///////////////    REGISTER  /////////////////////////////////////////////////////////////////////

///////////////    LOGIN   /////////////////////////////////////////////////////////////////////

app.get('/login',(req,res)=>{
    res.render('pages/login');
});

app.post('/login', async (req,res) =>  { 
    const username = req.body.username;
    const password = req.body.password;
    const query = `select * from users where users.username = $1;`;
    // const query = `select * from users where users.username = ${req.body.username}`;
    const values = [username];
    
    db.one(query, values)
      .then(async (data) => {

        const match = await bcrypt.compare(req.body.password, data.password);
        if (match) {
          req.session.user = data;
          req.session.save();
          res.render("pages/home", {username, message: "Successfully logged in"});
        } else {
          // throw new Error("Incorrect username or password.");
          res.render("pages/login", {message: "Invalid input"});
          //changed these messages ^ v to invalid input to try to match negatvie test case
        }
      })
      .catch((err) => {
        //console.log(err);
        //may only need this part for lab 11
        // res.json({status: 'fail', message: 'Invalid input'});
        res.render("pages/register", {message: "Invalid input"}); 
        //i changed this to render instead of redirect
        //so that a message can display, i believe a message gets rid of user confusion
      });
  })

///////////////    LOGIN   /////////////////////////////////////////////////////////////////////

///////////////    lOGOUT  /////////////////////////////////////////////////////////////////////

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.render("pages/login", {message: "Logged out successfully"})
})

///////////////    lOGOUT  /////////////////////////////////////////////////////////////////////

//app.use(auth);

module.exports = app.listen(3000);
console.log('Server is listening on port 3000');