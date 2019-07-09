var express = require('express');
var path = require('path');
var app = express();
var server = app.listen(8082); 
var io = require('socket.io').listen(server); 

app.use((req, res, next) => { 
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});



app.get('/', function(req, res){
    // let reqPath = path.join(__dirname, '../client');
    // res.sendFile(reqPath + '/index.html');
    res.send('working well')
});

const users = {};

io.on('connection', socket => { 
    console.log(`user ${socket.id} connected!!!`);
    
    socket.on('message', function(message) { 
	
      var data; 
		
      //accepting only JSON messages 
      try { 
         data = JSON.parse(message); 
      } catch (e) { 
         console.log("Invalid JSON"); 
         data = {}; 
      }
		
      //switching type of the user message 
      switch (data.type) { 
         //when a user tries to login
         case "login": 
            console.log("User logged", data.name); 
				
            //if anyone is logged in with this username then refuse 
            if(users[data.name]) { 
               sendTo(socket, { 
                  type: "login", 
                  success: false 
               }); 
            } else { 
               //save user socket on the server 
               users[data.name] = socket; 
               socket.name = data.name; 
					
               sendTo(socket, { 
                  type: "login", 
                  success: true 
               }); 
            } 
				
            break;
				
         case "offer": 
            //for ex. UserA wants to call UserB 
            console.log("Sending offer to: ", data.name);
				
            //if UserB exists then send him offer details 
            var conn = users[data.name]; 
				
            if(conn != null) { 
               //setting that UserA connected with UserB 
               socket.otherName = data.name; 
					
               sendTo(conn, { 
                  type: "offer", 
                  offer: data.offer, 
                  name: socket.name 
               }); 
            }
				
            break;
				
         case "answer": 
            console.log("Sending answer to: ", data.name); 
            //for ex. UserB answers UserA 
            var conn = users[data.name]; 
				
            if(conn != null) { 
               socket.otherName = data.name; 
               sendTo(conn, { 
                  type: "answer", 
                  answer: data.answer 
               }); 
            } 
				
            break; 
				
         case "candidate": 
            console.log("Sending candidate to:",data.name); 
            var conn = users[data.name];
				
            if(conn != null) { 
               sendTo(conn, { 
                  type: "candidate", 
                  candidate: data.candidate 
               }); 
            } 
				
            break;
				
         case "leave": 
            console.log("Disconnecting from", data.name); 
            var conn = users[data.name]; 
            conn.otherName = null; 
				
            //notify the other user so he can disconnect his peer socket 
            if(conn != null) {
               sendTo(conn, { 
                  type: "leave" 
              }); 
            }
				
            break;
				
         default: 
            sendTo(socket, { 
               type: "error", 
               message: "Command not found: " + data.type 
            }); 
				
            break; 
      }
		
   }); 
	
   //when user exits, for example closes a browser window 
   //this may help if we are still in "offer","answer" or "candidate" state 
   socket.on("close", function() { 
	
      if(socket.name) { 
         delete users[socket.name]; 
			
         if(socket.otherName) { 
            console.log("Disconnecting from ", socket.otherName); 
            var conn = users[socket.otherName]; 
            conn.otherName = null;
				
            if(conn != null) { 
               sendTo(conn, { 
                  type: "leave" 
               }); 
            }
         } 
      }
		
   });  
	
   socket.broadcast.emit("Hello world");  
});
  
function sendTo(socket, message) { 
   socket.send(JSON.stringify(message)); 
}


app.listen(8080, () =>{ 
    console.log('Server is live on port 8080');
 }) 
