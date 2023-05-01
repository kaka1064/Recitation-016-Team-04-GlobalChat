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

app.get('/profile', (req, res) => {  
  const query = `select * from news Where username=$1 ORDER BY news.news_id DESC;`;
  db.any(query,[req.session.user.username])

  .then(function (news) {
    console.log('!!!!!!', req.session.user);
    res.render('pages/profile', {username: req.session.user.username, news: news});
  })
  .catch(function (err) {
    return console.log(err);
  });
})
///////////////   news   ////////////////////////////////////////////////////////////////

app.get('/news', (req, res) => {
  // console.log("username", req.body);
  //need to send the data from the database to the page when rendering
  const query = `select * from news ORDER BY news.news_id DESC;`;
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

//////////////   Translate  /////////////////////////////////////////////////////////////


///////////////   Settings   ////////////////////////////////////////////////////////////////

///////////////   THIS   /////////////////////////////////////////////////////////////////////



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
    res.render("pages/register", {message: err.message, error:true});
  });
});


app.get('/login',(req,res)=>{
  res.render('pages/login');
});

app.post('/login', async (req,res) =>  { 
  if (req.session.user) res.redirect('/home');
  const username = req.body.username;
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

app.get('/home', (req,res) => {
  const query = "SELECT * FROM news ORDER BY news.news_id DESC LIMIT(5);";
  db.any(query)

  .then(function (data) {
    console.log(data);
    res.render('pages/home', {username: req.session.user.username, data: data});
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
  res.redirect('/home');
});


module.exports = app.listen(3000);
console.log('Server is listening on port 3000');
