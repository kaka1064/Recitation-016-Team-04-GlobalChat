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

app.use(express.static('public'))

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

///////////////   Profile ///////////////////////////////////////////////////////////////


//////////////   Translate  /////////////////////////////////////////////////////////////

///////////////   Settings   ////////////////////////////////////////////////////////////////




// app.get('/news', (req,res) => {
//   var query = 'SELECT * FROM news;';

//   db.any(query)
//   .then((news) => {
//     console.log(news);
//     res.render('pages/news.ejs', {news, username: req.session.user.username});
//   })
//   .catch(function (err) {
//     console.log("There was an error");
//     // return console.log(err);
//   })
// });

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
          res.redirect('/home');
          //res.render("pages/home", {username, message: "Successfully logged in"});
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

// Authentication middleware.
const auth = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect("login");
  }
  next();
};  
//need to catch the err
app.use(auth);

///////////////  HOME     ///////////////////////////////////////////////////////////////////

app.get('/home', (req,res) => {
  const query = "SELECT * FROM news ORDER BY news.news_id DESC LIMIT(5);";
  db.any(query)

  .then(function (data) {
    console.log(data);
    res.render('pages/home', {username: req.session.user.username, data: data});
  })
});

///////////////  HOME     ///////////////////////////////////////////////////////////////////

app.get('/profile', (req, res) => {  
  const query = `select * from news Where username=$1 ORDER BY news.news_id DESC;`;
  db.any(query,[req.session.user.username])
  .then(function (news) {
    console.log('!!!!!!', news);
    res.render('pages/profile', {username: req.session.user.username, news: news});
  })
  .catch(function (err) {
    return console.log(err);
  });
});

app.post('/delete', (req, res) => {
  var username = req.session.user.username;
  var id = req.body.deleteId;
  console.log(req.body);
  const query = `DELETE FROM news WHERE news_id = ${id};`
  db.any(query)
  .then(function () {
    const query = `select * from news Where username=$1 ORDER BY news.news_id DESC;`;
    db.any(query,[req.session.user.username])
  
    .then(function (news) {
      res.render('pages/profile', {username: req.session.user.username, news: news, message: "successfully deleted post"});
    })
    .catch(function (err) {
      return console.log(err);
    });
  })
  .catch(function (err) {
    const query = `select * from news Where username=$1 ORDER BY news.news_id DESC;`;
    db.any(query,[req.session.user.username])
  
    .then(function (news) {
      res.render('pages/profile', {username: req.session.user.username, news: news, message: "failed to delete post"});
    })
    .catch(function (err) {
      return console.log(err);
    });
    return console.log(err);
  });
});

app.post('/edit', (req, res) => {
  var username = req.session.user.username;
  var id = req.body.editId;
  var post = req.body.editpost;
  var topic = req.body.edittopic;
  var language = req.body.editlanguage;
  console.log(req.body);
  const query = `UPDATE news SET post = '${post}', language = '${language}', topic = '${topic}' WHERE news_id = ${id};`;
  // const query = `UPDATE news SET post = '${post}', topic = '${topic}' WHERE ${id}(SELECT * from );`;
  db.any(query)
  .then(function () {
    res.redirect('/profile');
  })
  .catch(function (err) {
    const query = `select * from news Where username=$1 ORDER BY news.news_id DESC;`;
    db.any(query,[req.session.user.username])
  
    .then(function (news) {
      res.render('pages/profile', {username: req.session.user.username, news: news, message: "failed to edit post"});
    })
    .catch(function (err) {
      return console.log(err);
    });
    return console.log(err);
  });

});
///////////////   news   ////////////////////////////////////////////////////////////////

app.get('/news', (req, res) => {
  // console.log("username", req.body);
  //need to send the data from the database to the page when rendering
  const query = `select * from news ORDER BY news.news_id DESC;`;
  db.any(query)

  .then(function (data) {
    console.log('!!!!!!', req.session.user);
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

//////////////   Translate  /////////////////////////////////////////////////////////////

app.post('/translate', (req, res) => {
  const post = req.body.post;
  // const language = req.session.user.preference;
  const language = req.session.user.preference;

  console.log(req.body.post);
  console.log(language);

  axios({
    method: 'post',
    url: `https://api-free.deepl.com/v2/translate`,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `DeepL-Auth-Key ${process.env.API_KEY}`
    },
    // data: `text=${encodeURIComponent(textToTranslate)}&target_lang=${targetLang}`
    // data: `text=${textToTranslate}&target_lang=${targetLang}`
    params: {
      text: req.body.post,
      // text: `こんにちは`,
      target_lang: language,
      // target_lang: `EN-US`,
    },
  })
    .then(response => {
      console.log(response.data);
      console.log(response.data.translations[0].text);
      const query = `select * from news ORDER BY news.news_id DESC;`;
      db.any(query)

      .then(function (data) {
        res.render('pages/news', {username: req.session.user.username, data: data, message: "Translation for the post: " + response.data.translations[0].text});
      })

      .catch(function (err) {
        return console.log(err);
      });
    })
    .catch(error => {
      console.error(error);
    });
});


///////////////   Settings   ////////////////////////////////////////////////////////////////
app.post("/settingsNewPassword", async (req,res)=>{
  db.one(`select * from users where username = $1;`,[req.session.user.username]).then(async data=>{
    const match = await bcrypt.compare(req.body.oldpass, data.password);
    if (match){
      let pass = await bcrypt.hash(req.body.password, 10);
      let query = `update users set password = $1 where username = $2 returning *;`;
      db.one(query,[pass,req.session.user.username]).then(data=>{
        res.render("pages/settings",{
          message: 'password updated successfully', 
          user:req.session.user
      });
      }).catch(error=>{
        res.render("pages/settings",{message: error, error: true, user: req.session.user});
      });
    } else {
      res.render("pages/settings",{
        message: 'incorrect password',
        error: true,
        user:req.session.user
      });
    }
  });
});

app.get('/home', (req,res) => {
  const query = "SELECT * FROM news ORDER BY news.news_id DESC LIMIT(5);";
  db.any(query)

  .then(function (data) {
    console.log(data);
    res.render('pages/home', {username: req.session.user.username, data: data,user:req.session.user});
  })
});

app.post("/settings",(req,res) => {
  let query = `update users set preference = $1 where username = $2 returning *;`
  db.one(query,[req.body.preference,req.session.user.username]).then(data=>{
    req.session.user.preference = data.preference;
    req.session.save();
    res.render('pages/settings',{
      message:`updated language preference to: ${data.preference}`,
      user:req.session.user
    });
  })
  .catch(error=>{
    console.log(error);
    res.render('pages/settings',{
      message:error,
      error: true, 
      user: req.session.user
    });
  });
});

app.post('/newUserinfo',(req,res)=>{
  db.one('update users set firstname = $1, lastname = $2 where username = $3 returning *;',[req.body.firstname,req.body.lastname,req.session.user.username]).then(data=>{
    req.session.user = data;
    req.session.save();
    res.render('pages/settings',{user:req.session.user, message:'user information updated'});
  }).catch(error=>{
    res.render('pages/settings',{message:error.message, error:true,user:req.session.user});
  });
});

app.get('/settings', (req, res) => {
  res.render('pages/settings',{
    user: req.session.user,
  });
});

app.get('/', (req, res) => {
  res.render('pages/home',{
    username: req.session.user.username,
    user: req.session.user
  });
});

app.get('/home', (req,res) => {
  res.render('pages/home',{
    username:req.session.user.username,
    user: req.session.user
  });
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.render("pages/login", {message: "Logged out successfully"});
});

app.get('/*',(req,res)=>{
  res.status(404).render('pages/404');
});


module.exports = app.listen(3000);
console.log('Server is listening on port 3000');
