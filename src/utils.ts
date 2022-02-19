import { Namespace, Socket } from "socket.io";
import { palabras } from "./palabras";

export function getRandomWord() {
    return palabras[Math.floor( Math.random() * palabras.length )];
}

export function compareWords(str1: string, str2: string) {
    if (str1.toUpperCase() === str2.toUpperCase()) return true;
    return false;
}

export function shuffle(array: any[]) {
    let currentIndex = array.length,  randomIndex;
    while (currentIndex != 0) {
      // Pick a remaining element...
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
      // And swap it with the current element.
      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex], array[currentIndex]];
    }
    return array;
}

const pause = (seg: number)=> new Promise(resolve => setTimeout(resolve, seg * 1000));



const pauseRej = (seg: number)=> new Promise((_, reject) => setTimeout(()=>reject({ reason: "time out" }), seg * 1000))

export class Game {
    players; word; namespace; socket; gameState; timeOut; winner: any;

    constructor(players: string[], namespace: Namespace, socket: Socket) {
        this.players = shuffle(players).map(player_id => ({ player_id, points: 0 }));
        this.word = getRandomWord();
        this.namespace = namespace;
        this.socket = socket;
        this.gameState = "Playing";
        this.timeOut = 20;
        this.winner = null; 
    }

    async start() {
        for (let { player_id } of this.players) {
            // Emit the rest who is playing
            this.namespace.to(player_id).emit("[GAME] start", { playing: true, word: this.word })
            this.namespace.except(player_id).emit("[GAME] start", {playing: false, player: player_id})
        
            try {
                // Break promise until timeout or someone guesses word
                await Promise.all([this.validateMessage(this.timeOut), pauseRej(this.timeOut)])
            }catch(err: any) {
                if (err.reason === "User guessed") {
                    // Asign points
                    this.assignPoints(player_id, 6);
                    this.assignPoints(err.player_id, 4);
                    // Update the state of the winner
                    this.setWinner();
                }else if (err.reason === "time out") {
                    this.namespace.emit("[GAME] Time out")
                }
            }           
        }
        this.gameState = "Over";
        // Emit all players game over, and the winner
        this.namespace.emit("[GAME] Over", { winner: this.winner })
    }

    validateMessage(seg: number) {
        return new Promise((resolve, reject)=> {
            // Remove listeners and resolve after n seg
            setTimeout(()=> {
                this.socket.removeAllListeners("[GAME] test-word")
                resolve(null);
            }, seg * 1000);

            // If the message is the word then remove listener and then reject
            this.namespace.on("[GAME] test-word", (message)=> {
                console.log("Message: ", message, this.word);
                console.log(compareWords(message, this.word))
                if (compareWords(message, this.word)) {
                    this.namespace.removeAllListeners("[GAME] test-word")
                    reject({reason: "User guessed", player_id: this.socket.id });
                }
            })
        })
    }

    assignPoints(player_id: string, points: number) {
        this.players = this.players.map(player => (player.player_id === player_id)? {...player, points} : player );
    }

    setWinner() {
        let maxPoints = Math.max(...this.players.map(({points})=>points));
        this.winner = this.players.find(player => player.points === maxPoints );
    }

}