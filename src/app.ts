import express from "express";
import { Server } from "socket.io";

const palabras = [
    "PROFESOR",
    "VELO",
    "CASCO",
    "TIJERAS",
    "ACEITE",
    "YUNTA",
    "TARTA",
    "DERECHA",
    "EMBAJADOR",
    "TOSTAR",
    "FLECHA",
    "TARJETAS",
    "SUFRIR",
    "MADUREZ",
    "DONDE",
    "CAJONERA",
    "COSA",
    "LAMER",
    "DESCIFRAR",
    "ESPUMAR",
    "POSTRE",
    "BOCADILLO",
    "TORNILLO",
    "LEER",
    "PASTAR",
    "MANTEL",
    "NOVIO",
    "COLECTIVO",
    "COLLAR",
    "CICATRIZAR",
    "CAMBIO",
    "TRASPLANTAR",
    "UNIFORME",
    "FRACTURAR",
    "ELECTRICIDAD",
    "ROTOR",
    "VELORIO",
    "PERSONA",
    "CHICOS",
    "APELLIDO",
    "COMETA",
    "CABALGAR",
    "ESCALERA",
    "PROMEDIO",
    "CARNICERO",
    "NADAR",
    "PESA",
    "BESTIA",
    "HEMISFERIOS",
    "PATO",
    "VIDRIO",
    "DENSO",
    "ACUPUNTURA",
    "PINTARSE",
    "DESAYUNO",
    "FIESTA",
    "PERA",
    "MINAR",
    "NARIZ",
    "RAYA",
    "CLAVO",
    "SUEGRO",
    "MANTA",
    "AHOGAR",
    "CEJAS",
    "CONFLICTO",
    "PARARSE",
    "TUMBA",
    "ENVASADO",
    "CUCHILLO",
    "REPÚBLICA",
    "ADIVINO",
    "FRANCIA",
    "SEIS",
    "ANCHOA",
    "MINORISTA",
    "MONO",
    "HIEDRA",
    "MANEJAR",
    "ESCRIBIR",
    "TAPIZAR",
    "TANGO",
    "ADELGAZAR",
    "OBELISCO",
    "MALO",
    "PASTEL",
    "ABANDERADO",
    "VENECIA",
    "FUGARSE",
    "HISTORIETA",
    "DIVORCIADO",
    "ADHESIVO",
    "MANTEL",
    "AZOTAR",
    "CARACOL",
    "VUELTA",
    "BALIZAS",
    "ASPIRADORA",
    "CAÑOS",
    "ESPIGA",
]

function getRandomWord() {
    return palabras[Math.floor( Math.random() * palabras.length )];
}

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

const videoNamespace = io.of(/^\/gvideo-\w+$/);

const timeToGuess = 60;

videoNamespace.on("connection", (socket)=> {
    const currentNamespace = socket.nsp;

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

    socket.on("signal", ({signal, socket_id}: any) => {
        socket.to(socket_id).emit("signal", {
            signal,
            socket_id: socket.id,
        })
    })
    
    // Manejar desconexión
    socket.on("disconnect", ()=> {
        socket.broadcast.emit("peer-disconnected", socket.id);
        //sockets[socket.nsp.name] = sockets[socket.nsp.name].filter((id: string)=> id !== socket.id);
    });


    // Handle messages
    socket.on("message", (message)=> {
        videoNamespace.emit("message", { socket_id: socket.id, message})
    });

    socket.on("game:start", ()=> {
        socket.broadcast.emit("game:send-id", {socket_id: socket.id});
    });

    socket.on("game:player-start", ({ socket_id }) => {
        // Whether a player guesses or not, we send the timeout
        // Emit timeout and socket_id
        setTimeout(()=> {
            currentNamespace.emit("game:time-out", { socket_id })
        }, timeToGuess * 1000);

        let newWord = getRandomWord();
        currentNamespace.emit("game:player-start", { socket_id, word: newWord, time: timeToGuess })
    });

    socket.on("game:user-guessed", data=> {
        currentNamespace.emit("game:user-guessed", data);
    });

    socket.on("game:message", message=> {
        socket.broadcast.emit("game:message", { socket_id: socket.id, message})
    })
    
})
