const express = require('express');
const bodyParser = require('body-parser');
const MongoClient = require('mongodb').MongoClient;
const bcrypt = require('bcrypt');
const app = express();
const mongoose = require('mongoose');

const http = require('http').Server(app);
const io = require('socket.io')(http);
const port = process.env.PORT || 5050;

app.use(bodyParser.urlencoded({extended: true}));

app.set('view engine', 'ejs')

app.use(express.static('public'))
app.use(bodyParser.json())

const connectionString = 'mongodb+srv://admin:admin@cluster0.du3xs.mongodb.net/p2pchat?retryWrites=true&w=majority';
const client = new MongoClient(connectionString);

app.get('/', (req, res) => {
    res.render('index.ejs');
})

app.get('/chat', (req, res) => {
    res.render('chat.ejs');
})

mongoose.connect(connectionString, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})

var userSchema = new mongoose.Schema({
    username: String,
    password: String,
});

const User = mongoose.model("users", userSchema);


app.post('/register', async(req, res) => {
        try{
            await client.connect();
            const db = client.db('p2p_users');
            const usersCollection = db.collection('users');

            console.log("Connected to server");

            const hashedpass = await bcrypt.hash(req.body.password, 10);
            const insertedResults = await User.create({
                username: req.body.username,
                password: hashedpass,
            });
            // res.send(insertedResults);
            usersCollection.insertOne({username: req.body.username, password: hashedpass});
            console.log("Successfully registered")
        } catch (error) {
            console.log(error);
            res.status(500).send("Internal Server error Occured");
        }
});


app.post("/login", async (req, res) => {
    try {
        await client.connect();
        const db = client.db('p2p_users');
        const usersCollection = db.collection('users');

        const user = await usersCollection.findOne({username: req.body.username});
        console.log(user);
        //  console.log(await usersCollection.findOne({username: req.body.username}));
        if (user) {
        //   console.log(user);
          const cmp = await bcrypt.compare(req.body.password, user.password);
        if (cmp) {
          //   ..... further code to maintain authentication like jwt or sessions
            res.redirect("/chat")
            io.on('connection', (socket) => {
                socket.on('chat message', msg => {
                    io.emit('chat message', {
                        "msg": msg,
                        "username": req.body.username
                    });  
                })
            });
        } else {
          res.send("Wrong username or password.");
        }
      } else {
        res.send("Can't find user.");
      }
    } catch (error) {
      console.log(error);
      res.status(500).send("Internal Server error Occured");
    }
});


http.listen(port, () => {
    console.log(`listening on http://localhost:${port}`);
});