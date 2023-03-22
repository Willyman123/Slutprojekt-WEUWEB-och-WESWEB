// paket som används

// ejs, dotenv, bcrypt, mongoose, express, cookie-parser, multer


// Variables

const express = require('express')
const app = express()
const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const cookie = require('cookie-parser')   
require('dotenv').config()
const multer = require('multer')

mongoose.connect(process.env.MONGODBADRESS)

// Middleware

app.set('view engine', 'ejs')
app.use(express.urlencoded({ extended:true}))
app.use(express.static('resources'))
app.use(cookie())

// Multer storage för att ladda upp bilder till upploads mappen som ligger i resources och namnge dem med unika namn. 
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './resources/upploads')
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
      const fileExtension = file.originalname.split('.').at(-1)
      cb(null, file.fieldname + '-' + uniqueSuffix + '.' + fileExtension)
    }
})

// Multer middleware för att ladda upp bilder
const upload = multer({ storage: storage })

// auth för inloggning
function auth(req, res, next){
    console.log(req.cookies);
    if(req.cookies.login === 'true'){
        console.log('inloggad');
        next()
    }
    else{
        res.status(401).redirect('/login')
    }
}

// skapar en user Schema för andvändaren. Username, password och en bild.
const user = new mongoose.Schema({
    username: String,
    password: String,
    image: String,

})

// skapar en andvändare med usernamne, password. Passwordet är encrypterat med bcrypt.
const Users = mongoose.model('users', user)

// Schema för en post av andvändaren
const userPost = new mongoose.Schema({
    username: String,
    image: String,  
    text: String,

})

// skapar en post med andvändarens namn, bild och text. Bilden sparas i upploads mappen och länkas sedan till databasen.
const Posts = mongoose.model('posts', userPost)

// skapar en post med andvändarens namn, bild och text. Bilden sparas i upploads mappen och länkas sedan till databasen.
app.post('/newpost', auth, upload.single('image'), (req, res) => {
    console.log(req.file);
    Users.findById(req.cookies.user, (error, data) => {
        Posts.create({
            username: data.username,
            image: "/upploads/" + req.file.filename,
            text: req.body.post
        }).then(() => {
            res.redirect('/feed')
        }).catch((error) => {
            console.log(error);
            res.redirect('/feed')
        })
    })

})

// renderar feed sidan med alla posts
app.get('/feed', auth, (req, res) => {
    Posts.find({}, (error, data) => {
        Users.findById(req.cookies.user, (error, user) => {
            res.render('feed', {data: data.reverse(), user: user.username, image: user.image})
        })
    })
})

//routes

// renderar startsidan
app.get('/', (req, res) =>{
    res.render("home")
})

// för att skapa en ny andvändare med usernamne, password och färg. Passwordet är encrypterat med bcrypt. 
app.post("/new", upload.single("image"), (req, res) => {
    console.log(req.file);
    Users.find({username: req.body.username}, (error, data) =>{
        if(error){return error} //stannar koden om det är ett fel
        console.log(data);
        if (!data[0]){
            bcrypt.genSalt(10, (error, salt)=>{ bcrypt.hash(req.body.password, salt, (error, password)=>{
                Users.create({
                    username: req.body.username,
                    password: password,
                    image: "/upploads/" + req.file.filename, 
                  
                }).then(()=>{
                    res.redirect('/login')
                }).catch((error)=>{
                    console.log(error);
                    res.redirect('/')
                })
            })
        })
        }else{
            console.log("username already taken");
            res.redirect('/')
        }
    })
})

// renderar login sidan
app.get('/login', (req, res) =>{
    res.render('login')
})

// Loggar in användaren och redirectar till profilsidan och skapar cookies för användaren och inloggad status.
app.post('/login', (req, res) =>{
    console.log(req.body);
    Users.find({username: req.body.username}, (error, data)=>{
        console.log(data);
        if(error) return res.send('error')
        if(!data[0]) return res.send( 'wrong username')
        else{
            if(bcrypt.compareSync(req.body.username, data[0].password)){
                console.log('inne');
                res.cookie('login', true, {maxAge: 10000*60}).cookie("user", data[0].id).redirect('/feed')
            }else{
                res.send('heeeeeelll NAh')
            }
        }
    })
})

// renderar profilsidan
app.get('/profile', auth, (req, res) =>{
    Users.findById(req.cookies.user, (error, data)=>{
        if(data){
            res.cookie('image', data.image).render('profile', {data: data.username, color: data.color, image: data.image}) // data: data:username gör så att om du vill andvända andvändarnammnet nån annanstans så kan du skriva data: data:username och inte data.username.
        }
        else{
            res.render('login')
        }
    })
})

// Redigerar andvändarens andvändarnamn och redirectar till profilsidan
app.get('/edit', auth, (req, res) =>{
    Users.findById(req.cookies.user, (error, data)=>{
        if(data)
            return res.render('edit', {data: data.username})
        else{
            return res.render('login')
        }
    })
})


// Tar emot det nya andvändarnamnet och uppdaterar databasen
app.post('/edit', auth, (req, res) =>{
    console.log(req.body);
    Users.findByIdAndUpdate(req.cookies.user, {username: req.body.username}, (error, data)=>{
        if(error) return error
        res.redirect('/profile')
    })
})

// Tar bort användare och redirectar till startsidan
app.get('/delete', auth, (req, res) =>{
    Users.findByIdAndDelete(req.cookies.user, (error, data)=>{
        if(error) return error
        res.redirect('/')
        
    })
});

// Loggar ut användaren och redirectar till startsidan
app.get('/logout', (req, res) =>{
    res.clearCookie('login').clearCookie('user').redirect('/')
})

// skapar en post med andvändarens namn, bild och text. Bilden sparas i upploads mappen och länkas sedan till databasen.
app.post('/feed', upload.single("image"), (req, res) =>{
    console.log(req.file);
    Users.findById(req.cookies.user, (error, data)=>{
        Posts.create({
            text: req.body.text,
            image: "/uploads/" + req.file.filename,
            username: data.username
        }).then(()=>{
            console.log('post created');
            res.redirect('/feed')
        }).catch((error)=>{
            console.log('error');
            console.log(error);
            res.redirect('/feed')
        })
    })
})

// renderar feed sidan med alla posts
app.get('/feed', auth, (req, res) =>{
    Posts.find({}, (error, data)=>{
        if(error) return error
        res.render('feed', {data: data})
    })
})


// server start
app.listen(3000, (error) => {
    if(error) {
        console.log(error)
    }else{
        console.log('Connected')
    }
})
