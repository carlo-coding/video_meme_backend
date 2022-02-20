"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Game = exports.shuffle = exports.compareWords = exports.getRandomWord = void 0;
const palabras_1 = require("./palabras");
function getRandomWord() {
    return palabras_1.palabras[Math.floor(Math.random() * palabras_1.palabras.length)];
}
exports.getRandomWord = getRandomWord;
function compareWords(str1, str2) {
    if (str1.toUpperCase() === str2.toUpperCase())
        return true;
    return false;
}
exports.compareWords = compareWords;
function shuffle(array) {
    let currentIndex = array.length, randomIndex;
    while (currentIndex != 0) {
        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]
        ];
    }
    return array;
}
exports.shuffle = shuffle;
const pause = (seg) => new Promise(resolve => setTimeout(resolve, seg * 1000));
const pauseRej = (seg) => new Promise((_, reject) => setTimeout(() => reject({ reason: "time out" }), seg * 1000));
class Game {
    constructor(players, namespace, socket) {
        this.players = shuffle(players).map(player_id => ({ player_id, points: 0 }));
        this.word = getRandomWord();
        this.namespace = namespace;
        this.socket = socket;
        this.gameState = "Playing";
        this.timeOut = 20;
        this.winner = null;
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            for (let { player_id } of this.players) {
                // Emit the rest who is playing
                this.namespace.to(player_id).emit("[GAME] start", { playing: true, word: this.word });
                this.namespace.except(player_id).emit("[GAME] start", { playing: false, player: player_id });
                try {
                    // Break promise until timeout or someone guesses word
                    yield Promise.all([this.validateMessage(this.timeOut), pauseRej(this.timeOut)]);
                }
                catch (err) {
                    if (err.reason === "User guessed") {
                        // Asign points
                        this.assignPoints(player_id, 6);
                        this.assignPoints(err.player_id, 4);
                        // Update the state of the winner
                        this.setWinner();
                    }
                    else if (err.reason === "time out") {
                        this.namespace.emit("[GAME] Time out");
                    }
                }
            }
            this.gameState = "Over";
            // Emit all players game over, and the winner
            this.namespace.emit("[GAME] Over", { winner: this.winner });
        });
    }
    validateMessage(seg) {
        return new Promise((resolve, reject) => {
            // Remove listeners and resolve after n seg
            setTimeout(() => {
                this.socket.removeAllListeners("[GAME] test-word");
                resolve(null);
            }, seg * 1000);
            // If the message is the word then remove listener and then reject
            this.namespace.on("[GAME] test-word", (message) => {
                console.log("Message: ", message, this.word);
                console.log(compareWords(message, this.word));
                if (compareWords(message, this.word)) {
                    this.namespace.removeAllListeners("[GAME] test-word");
                    reject({ reason: "User guessed", player_id: this.socket.id });
                }
            });
        });
    }
    assignPoints(player_id, points) {
        this.players = this.players.map(player => (player.player_id === player_id) ? Object.assign(Object.assign({}, player), { points }) : player);
    }
    setWinner() {
        let maxPoints = Math.max(...this.players.map(({ points }) => points));
        this.winner = this.players.find(player => player.points === maxPoints);
    }
}
exports.Game = Game;
