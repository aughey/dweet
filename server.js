const Q = require('q');
const bodyParser = require('body-parser');
const MongoClient = require('mongodb').MongoClient
const express = require('express');
let app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
const EventEmitter = require('events');

var key_emitter = new EventEmitter();

//app.use(express.static('public'));
//app.use(bodyParser.json());
var concat = require('concat-stream');
app.use(function(req, res, next) {
  req.pipe(concat(function(data) {
    req.body = data;
    next();
  }));
});

app.use(bodyParser.urlencoded({extended: true}));

let tempdata = {}

var getData = function(req) {
  let k = key(req);
  let d = tempdata[k];
  if (d) {
    return Q(d.data);
  } else {
    return Q(null);
  }
}

var setData = function(req) {
  var k = key(req);
  var data = packdata(req);
  tempdata[k] = data;
  key_emitter.emit(k, data);
}

function packdata(req) {
  return {user: req.params.user, thing: req.params.thing, data: req.body, timestamp: new Date()}
}

function key(req) {
  return req.params.user + "/" + req.params.thing;
}

app.post('/dweet/temp/:user/:thing', (req, res) => {
  setData(req);
  res.json(true)
});

// Define the get, this will get overwridden if we connect to mongo
app.post('/dweet/for/:user/:thing', (req, res) => {
  setData(req);
  return res.json(true);
});

// This will get over written if we connect to mongo
app.get('/dweet/for/:user/:thing', (req, res) => {
  if (req.params.ct) {
    res.set('Content-Type', req.params.ct);
  } else {
    res.set('Content-Type', 'text/plain')
  }
  getData(req).then(data => res.send(data));
});

Q.nfcall(MongoClient.connect, "mongodb://localhost/dweet").then((db) => {
  console.log("Connected to mongo, updating the set and get methods");
  var oldgetData = getData;
  getData = function(req) {
    oldgetData(req).then(data => {
      if (data) {
        return data;
      }
      return db.collection('dweets').find({user: req.params.user, thing: req.params.thing}).sort({timestamp: -1}).limit(1).toArray().then(data => {
        var out = null;
        if (data[0]) {
          out = data[0].data;
        }
        return out;
      })
    });
  }

  setData = function(req, res) {
    delete tempdata[key(req)]
    db.collection('dweets').insert(packdata(req));
  }

})

io.on('connection', function(socket) {
  console.log("connection");
  var subscriptions = {}
  socket.on('disconnect', function() {
    console.log("Unsubscribing all");
    for (var key in subscriptions) {
      console.log("  " + key);
      key_emitter.removeListener(key, subscriptions[key]);
    }
    subscriptions = null;
  })
  socket.on('sub', function(key) {
    var short = key.short;
    key = key.key;
    if (subscriptions[key]) {
      return;
    }
    console.log("sub " + key);
    var url = 'http://localhost:3000/dweet/for/' + key;
    var emit = (data) => {
      if (short) {
        socket.emit(key, url);
      } else {
        socket.emit(key, data.data.toString());
      }
    }
    key_emitter.on(key, emit);
    subscriptions[key] = emit;
    var keys = key.split('/');

    getData({
      params: {
        user: keys[0],
        thing: keys[1]
      }
    }).then((data) => {
      if (data) {
        console.log("Sending on sub " + key);
        if (short) {
          socket.emit(key, url);
        } else {
          socket.emit(key, data.toString());
        }
      }
    }).done();
  })
  socket.on('get', function(q) {
    q = {
      params: q
    };
    getData(q).then(data => {
      socket.emit(key(q), data.toString());
    });
  });
});

const PORT = 3000
server.listen(PORT, () => {
  console.log(`Dweet clone running on port ${PORT}.`)
});
