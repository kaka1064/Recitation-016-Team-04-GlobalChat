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
app.post("/register", async (req,res) => {
  const username = req.body.username;
  const hash = await bcrypt.hash(req.body.password, 10);
  const query = `insert into users (username, password) values ($1, $2) returning $1;`; 
  const values = [username, hash];
  db.one(query,values).then(data=>{
    res.render("views/pages/login",{
      message: `${username}'s account created successfully`,
      error: false
    });
  }).catch(error=>{
    res.render("views/pages/login",{
      message: `ERROR: ${error}`,
      error: true
    });
  });
});

app.post("/login", (req,res)=> {
  const username = req.body.username;
  const query = `select * from users where username = $1;`;
  const list = [username];
  db.one(query,list).then(temp=>{
    const match = bcrypt.compare(req.body.password, temp.password,(error,result)=>{
      if (result && !error){
        req.session.save();
        res.redirect("/home");
      }
      else if (error) res.render("views/pages/login",{message:error, error: true});
      else res.redirect("/home");
    });
  }).catch(error=>{
    res.render("views/pages/login",{
      message: "Invalid username/password",
      error: true
    });
  });
});

app.get("/logout",(req,res)=>{
  user.username = null;
  user.password = null;
  req.session.destroy();
  res.render("views/pages/login", {
    message: "Log out successful",
    error: false
  });
});

// Authentication Middleware.
const auth = (req, res, next) => {
  if (!req.session.user) {
    // Default to login page.
    return res.redirect('/login');
  }
  next();
};

// Authentication Required
app.use(auth);

module.exports = app.listen(3000);
console.log("success");
