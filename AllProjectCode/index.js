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

app.get('/register', (req, res) => {
  res.render('pages/register');
});  

app.post('/register', async (req, res) => {
  const hash = await bcrypt.hash(req.body.password, 10);
  var username = req.body.username;
  var firstname = req.body.firstname;
  var lastname = req.body.lastname;
  var preference = req.body.preference;
  const query = `insert into users (username, password, firstname, lastname, preference) values ($1, $2, $3, $4, $5) returning * ;`;
  db.any(query, [
    username,
    hash,
    firstname,
    lastname,
    preference
  ])

  .then(function (data) {
    res.render("pages/login", {message: "Please log in now."}); //i also changed this to render instead
    //so that users can have a message knowing what they are supposed to do.
  })

  .catch(function(err) {
    //return console.log(err);
    res.render("pages/register", {message: "Error with registration - maybe try a different username", error:true});
  });
});


app.get('/login',(req,res)=>{
  res.render('pages/login');
});
app.post('/login', async (req,res) =>  { 
  const username = req.body.username;
  const password = req.body.password;
  const query = `select * from users where users.username = $1;`;
  const values = [username];
  
  db.one(query, values)
    .then(async (data) => {
      const match = await bcrypt.compare(req.body.password, data.password);
      if (match) {
        req.session.user = data;
        req.session.save();
        res.redirect("/home");
      } else {
        // throw new Error("Incorrect username or password.");
        res.render("pages/login", {message: "Invalid input"});
        //changed these messages ^ v to invalid input to try to match negatvie test case
      }
    })
    .catch((err) => {
      res.render("pages/register", {message: "Invalid input"}); 
    });
})

const auth = (req,res,next)=>{
  if (!req.session.user){
    return res.redirect('/login');
  }
  next();
};

app.use(auth);

app.get('/chatbox', (req, res) => {
  res.render('pages/chatbox');
});

app.post("/settings",(req,res) => {
  let query = `update users set preference = $1 where username = $2 returning *;`
  db.one(query,[req.body.preference,req.session.user.username])
  .then(data=>{
    req.session.user.preference = req.body.preference;
    res.redirect('/home');
  })
  .catch(error=>{
    console.log(error);
    res.render('pages/settings');
  });
});

app.get('/settings', (req, res) => {
  res.render('pages/settings',{
    error:false,
    preference:req.session.user.preference});
});

app.get('/', (req, res) => {
  res.render('pages/home',{username:req.session.user.username});
});

app.get('/home', (req,res) => {
  res.render('pages/home', {username: req.session.user.username});
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.render("pages/login", {message: "Logged out successfully"})
})

module.exports = app.listen(3000);
console.log('Server is listening on port 3000');