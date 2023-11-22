// packages
const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI);

// app config
app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// main page
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/index.html')
});

// define schemas
const exerciseSchema = new mongoose.Schema({
    'duration': { type: Number },
    'date': { type: Date },
    'description': { type: String }
})
const Exercise = mongoose.model("Exercise", exerciseSchema);

const userSchema = new mongoose.Schema({
    'username': { type: String },
    'count': { type: Number, default: 0 },
    'log': [exerciseSchema]
})
const User = mongoose.model("User", userSchema);

// create a new user
app.post('/api/users', async (req, res) => {
    try {
        let newUser = new User({
            username: req.body.username
        })

        await newUser.save();

        res.json({ username: newUser.username, _id: newUser._id })
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// add exercises
app.post('/api/users/:_id/exercises', async (req, res) => {
    try {
        // find user
        let user = await User.findById(req.params._id);

        if (!user) {
            console.error('User not found');
            return res.status(404).json({ error: 'User not found' });
        }

        if (isNaN(req.body.duration)) {
            console.error('Duration should be an integer');
            return res.status(400).json({ error: 'Duration should be an integer' });
        }

        let newExercise = new Exercise({
            duration: req.body.duration,
            date: req.body.date ? new Date(req.body.date) : new Date(),
            description: req.body.description
        });

        user.log.push(newExercise);
        user.count++;

        await user.save();

        res.json({
            _id: user._id,
            username: user.username,
            duration: newExercise.duration,
            date: newExercise.date.toDateString(),
            description: newExercise.description
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    };
});
// get all users
app.get('/api/users', async (req, res) => {
    try {
        // find users ans select specific keys
        let allUsers = await User.find({}).select('_id username __v').exec();
        // return users
        res.json(allUsers);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// get user's exercise log
app.get('/api/users/:_id/logs', async (req, res) => {
    try {
        let from = req.query.from ? new Date(req.query.from) : undefined;
        let to = req.query.to ? new Date(req.query.to) : undefined;
        let limit = req.query.limit ? parseInt(req.query.limit) : undefined;
        // find user
        let user = await User.findById(req.params._id);

        if (!user) {
            console.error('User not found');
            res.status(404).json({ error: 'User not found' });
        }

        let log = user.log;
        // filter results
        let filteredLog = log.filter((item) => {
            if ((from && (from > item.date)) || (to && (to < item.date))) { return false }
            return true;
        })

        // limit # of results
        if (limit) {
            filteredLog = filteredLog.slice(0, limit);
        }

        // format date
        let logToDateString = filteredLog.map((item) => {
            return {
                description: item.description,
                duration: item.duration,
                date: item.date.toDateString()
            };
        });

        // return curated data
        res.json({
            username: user.username,
            _id: user._id,
            count: user.count,
            log: logToDateString
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

const listener = app.listen(process.env.PORT || 3000, () => {
    console.log('Your app is listening on port ' + listener.address().port)
});
