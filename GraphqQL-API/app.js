const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const { clearImage } = require('./util/file');
const path = require('path');
const multer = require('multer');
const { graphqlHTTP } = require('express-graphql');
const graphqlSchema = require('./graphql/schema');
const graphqlResolver = require('./graphql/resolvers');

const auth = require('./middleware/auth');

const MONGODB_URI = 'mongodb://localhost:27017/feeds';

const app = express();

const fileStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'images');
    },
    filename: function (req, file, cb) {
        cb(null, new Date().toISOString() + file.originalname);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/png' ||
        file.mimetype === 'image/jpg' ||
        file.mimetype === 'image/jpeg') {
        cb(null, true);
    }
    else {
        cb(null, false);
    }
}



app.use(bodyParser.json());
app.use(multer({ storage: fileStorage, fileFilter: fileFilter }).single('image'));
app.use('/images', express.static(path.join(__dirname, 'images')));

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
})


app.use(auth);

app.put('/post-image', (req, res, next) => {
    if (!req.isAuth) {
        const error = new Error('Not Authenticated!');
        error.code = 401;
        throw error;
    }

    if (!req.file) {
        return res.status(200).json({ message: 'No file provided' });
    }
    if (req.body.oldPath) {
        clearImage(req.body.oldPath);
    }
    return res.status(200).json({
        message: 'File stored',
        filePath: req.file.path
    })
});

app.use('/graphql', graphqlHTTP({
    schema: graphqlSchema,
    rootValue: graphqlResolver,
    graphiql: true,
    customFormatErrorFn(err) {
        if (!err.originalError) {
            return err.message;
        }
        const data = err.originalError.data;
        const message = err.originalError.message || 'An error occured!';
        const code = err.originalError.code || '500';
        return {
            message: message,
            status: code,
            data: data
        }
    }
}));

app.use((req, res, next) => {
    const error = new Error('404!!! Not found!');
    error.statusCode = 404;
    throw error;
});

app.use((error, req, res, next) => {
    console.log(error.message);
    const status = error.statusCode || 500;
    const message = error.message;
    res.status(status).json({
        message: message
    });
})

mongoose
    .connect(MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    })
    .then(result => {
        console.log('Server running at port: 8080')
        app.listen(8080);
    })
    .catch(err => console.log(err));