import express from "express";
import { Server } from "socket.io";
const PORT = 4057;

const app = express();


const server = app.listen(PORT, ()=> console.log("Server ready on port: "+PORT));

const io = new Server(server, {
    cors:{
        origin: "*",
        methods: ["GET", "POST"]
    },
    serveClient: false
});

const gameNamespace = io.of(/^\/game-\d+$/);

gameNamespace.on("connection", (socket)=> {

    socket.on("start-propagation", (userName)=> {
        socket.broadcast.emit("start-propagation", {
            socket_id: socket.id,
            username: userName
        });
    })

    // Responder al usuario que se acaba de unir y pasarle nuestro id
    socket.on("respond-propagation", ( {socket_id, username })=> {
        socket.to(socket_id).emit("respond-propagation", {socket_id: socket.id, username });
    })

    socket.on("signal", ({signal, user_id}: any) => {
        socket.to(user_id).emit("signal", {
            signal,
            user_id: socket.id,
        })
    })
    
    // Manejar desconexión
    socket.on("disconnect", ()=> {
        socket.broadcast.emit("peer-disconnected", socket.id);
    });


    // Handle messages
    socket.on("message", (message)=> {
        gameNamespace.emit("message", { socket_id: socket.id, message})
    })
    
})