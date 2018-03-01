var express = require('express');
var app = express();
var stylus = require('stylus');
var logger = require('morgan');
var path = require('path');
var http = require('http').Server(app);
var io = require('socket.io')(http);
var mongoose = require('mongoose');

// DB
mongoose.connect('mongodb://localhost/chat', function (err) {
   if (err) throw err;
   console.log('Successfully connected to MongoDB');
});

var chatSchema = mongoose.Schema({
  msg: String,
  date: {
    type: Date,
    default: Date.now
  }
});

var Msg = mongoose.model('Msg', chatSchema);

function MsgSave(message) {
  var msg = new Msg({ msg: message });
  msg.save();
}

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// app.use(logger('dev'));
app.use(stylus.middleware(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));


// GET home page.
app.get('/', function(req, res) {

  res.render('index');

});

var onlineUsers = [];

io.on('connection', function (socket) {

  var userId = socket.handshake.address;
  if ( userId.substr(0,7) == "::ffff:" ) {
    userId = userId.substr(7);
  }
  socket.userIp = userId;


  // check duplicate userId
  var i = 1;
  while ( onlineUsers.indexOf(userId) != -1 ) {
    userId = socket.userIp + '_(' + i + ')';
    i++;
  }

  // add online user to list
  onlineUsers.push(userId);

  // update online users list
  io.emit('online users',onlineUsers);  

  socket.on('message.sent', function (message) {
    io.emit('message', userId + ': ' + message);
    MsgSave(userId + ': ' + message);
  });

  socket.broadcast.emit('message', 'User ' + userId + ' connected');
  MsgSave('User ' + userId + ' connected');

  socket.on('disconnect', function(){
    io.emit('message', 'User ' + userId + ' disconnected');
    MsgSave('User ' + userId + ' disconnected');

    // del online user
    onlineUsers.splice(onlineUsers.indexOf(userId),1);
    // update online users list
    io.emit('online users',onlineUsers);
  });
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

http.listen(3000, function () {
    console.log('Started server');
});