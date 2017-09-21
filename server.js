const express = require('express');
var Q = require('q');
const bodyParser = require('body-parser');
const MongoClient = require('mongodb').MongoClient

var app = express();
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

var tempdata = {}

function packdata(req) {
    return {
        user: req.params.user,
        thing: req.params.thing,
        data: req.body,
        timestamp: new Date()
    }
}

Q.nfcall(MongoClient.connect, "mongodb://localhost/dweet").then((db) => {
    app.post('/dweet/for/:user/:thing', (req, res) => {
        delete tempdata[key(req)]
        db.collection('dweets').insert(
            packdata(req)
        );
        res.json(true)
    });

    function key(req) {
        return req.params.user + "/" + req.params.thing;
    }

    app.post('/dweet/temp/:user/:thing', (req, res) => {
        tempdata[key(req)] = packdata(req);
        res.json(true)
    });

    app.get('/dweet/for/:user/:thing', (req, res) => {
        var k = key(req);
        if (tempdata[k]) {
            res.json(tempdata[k]);
            return;
        }
        db.collection('dweets').find({
            user: req.params.user,
            thing: req.params.thing
        }).sort({
            timestamp: -1
        }).limit(1).toArray().then(data => {
            res.send(data[0]);
        })
    });

    const PORT = 3000
    app.listen(PORT, () => {
        console.log(`Dweet clone running on port ${PORT}.`)
    });
})