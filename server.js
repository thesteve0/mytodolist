#!/bin/env node
//  OpenShift sample Node application

var express = require('express');
var fs      = require('fs');

//  Local cache for static content [fixed and loaded at startup]
var zcache = { 'index.html': '' };
zcache['index.html'] = fs.readFileSync('./index.html'); //  Cache index.html

// Create "express" server.
var app  = express.createServer();
app.use(express.methodOverride());


//These are defaults for opening our DB connection
var dbconn;
var db;
// Adding these for mongoDB
mongo = require('mongodb');
   murl = process.env.OPENSHIFT_NOSQL_DB_URL + "mytodolist";
   mongo.connect(murl, function(err, conn) {
      conn.on('error', function(err) {
         return console.log('%s: Mongo connect error %s',
                            Date(Date.now() ), err);
      });
      dbconn = conn;
      dbconn.open(function(err, db) {
		  if(!err) {
			console.log("We are connected");
		  } else {
			  console.log("Something went wrong opening the DB");
		  }
	  });
});


/*  =====================================================================  */
/*  Setup route handlers.  */
/*  =====================================================================  */

// Handler for GET /health
app.get('/redhat', function(req, res){
    res.send('Hello everyone! MongoDB + Node.JS + OpenShift = Winning^2');
});

app.get('/', function(req, res){
  dbconn.collection('names').find().toArray(function(err, names) {
	res.header("Content-Type:","text/json");
	res.end(JSON.stringify(names));
});
});

app.put('/user/:name', function(req, res){
	var document = {name:req.params.name};
	dbconn.collection('names').insert(document,{safe:true},function(err,doc){
		if(err){
			console.log(err);
			res.send("Fail")
     	}
		else{
			res.header("Content-Type:","text/json");
			res.end(JSON.stringify(doc[0]._id));
		}
	});
});

app.put('/todos/:id/:date/:todo', function(req, res){
	var document = {creator:req.params.id,date:req.params.date,todo:req.params.todo};
	dbconn.collection('todos').insert(document,{safe:true},function(err,doc){
     	res.header("Content-Type:","text/json");
		res.end(JSON.stringify(doc[0]._id));
	});
});

app.post('/todos/:id/:todo', function(req, res){
	var id = ObjectID(req.params.id);
	dbconn.collection('todos').update({_id:id},{$set:{todo:req.params.todo}},{safe:true},function(err,doc){
		if(err){
       		res.header("Content-Type:","text/json");
			res.end(JSON.stringify({message:"fail"}));
			}
		else{
       		res.header("Content-Type:","text/json");
			res.end(JSON.stringify({message:"success"}));
			}
	});
});


app.get('/todos/:userid', function(req, res){
	dbconn.collection('todos').find({creator:req.params.userid}).toArray(function(err, todos) {
		res.header("Content-Type:","text/json");
		res.end(JSON.stringify(todos));
	});
});

app.delete('/todos/:id', function(req, res){
	var id = ObjectID(req.params.id);
	dbconn.collection('todos').remove({_id:id},{safe:true},function(err,doc){
		res.header("Content-Type:","text/json");
		res.end(JSON.stringify({message:"success"}));
	})
});


/*  =====================================================================  */
/*  Setup the Server. */
/*  =====================================================================  */


//  Get the environment variables we need.
var ipaddr  = process.env.OPENSHIFT_INTERNAL_IP;
var port    = process.env.OPENSHIFT_INTERNAL_PORT || 8080;

if (typeof ipaddr === "undefined") {
   console.warn('No OPENSHIFT_INTERNAL_IP environment variable');
}



//  terminator === the termination handler.
function terminator(sig) {
   if (typeof sig === "string") {
      console.log('%s: Received %s - terminating Node server ...',
                  Date(Date.now()), sig);
      process.exit(1);
   }
   console.log('%s: Node server stopped.', Date(Date.now()) );
}

//  Process on exit and signals.
process.on('exit', function() { terminator(); });

['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT', 'SIGBUS',
 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGPIPE', 'SIGTERM'
].forEach(function(element, index, array) {
    process.on(element, function() { terminator(element); });
});



//  And start the app on that interface (and port).
app.listen(port, ipaddr, function() {
   console.log('%s: Node server started on %s:%d ...', Date(Date.now() ),
               ipaddr, port);
});
