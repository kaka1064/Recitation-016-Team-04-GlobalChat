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


app.get('/', (req, res) => {
  res.redirect('/login'); //this will call the /anotherRoute route in the API
});

app.get('/login',(req,res)=>{
    res.render('pages/login');
});

app.get('/home', (req,res) => {
  res.render('pages/home');
});
app.post("/register", async (req,res) => {
  const username = req.body.username;
  const hash = await bcrypt.hash(req.body.password, 10);
  const query = `insert into users (username, password) values ($1, $2) returning $1;`; 
  const values = [username, hash];
  db.one(query,values).then(data=>{
    res.render("pages/login", {
      message: `${username}'s account created successfully`,
      error: false
    });
  }).catch(error=>{
    res.render("pages/login",{
      message: `ERROR: ${error}`,
      error: true
    });
  });
});

app.post('/login', async (req,res) =>  { 
  const username = req.body.username;
  const password = req.body.password;
  const query = `select * from users where users.username = $1`;
  // this may have problems with what the username value is
  const values = [username];
  
  db.one(query, values)
    .then(async (data) => {
      // user.username = username;
      // user.password = data.password;

      const match = await bcrypt.compare(req.body.password, data.password);
      if (match) {
        req.session.user = data;
        req.session.save();
        res.redirect("pages/home");
      } else {
        // throw new Error("Incorrect username or password.");
        res.render("pages/login", {message: "Incorrect username or password."});
      }
    })
    .catch((err) => {
      console.log(err);
      res.render("pages/register", {message: "No user found."}); //i changed this to render instead of redirect
      //so that a message can display, i believe a message gets rid of user confusion
    });
})

app.get("/register", (req, res) => {
  res.render('pages/register', {
      error: false,
      message: ``
  });
}); 


// Authentication Middleware.
// const auth = (req, res, next) => {
//   if (!req.session.user) {
//     // Default to login page.
//     return res.redirect('/login');
//   }
//   next();
// };

// Authentication Required
// app.use(auth);

app.get("/logout",(req,res)=>{
  req.session.destroy();
  res.render("pages/login", {
    message: "Log out successful",
    error: false
  });
});

module.exports = app.listen(3000);
console.log("success - listening");
