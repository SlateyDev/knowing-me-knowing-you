import path from 'path';
import http from 'http';
import express from 'express';
import { Server } from 'socket.io';
import NoSQL from 'nosql';

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = process.env.PORT || 3001;

const questiondb = NoSQL.load(path.resolve(__dirname, "./questions.nosql"));

interface PlayerData {
  name: string;
}
interface PlayerAnswerData {
  player: PlayerData;
  answer: string;
}
interface QuestionData {
  text: string;
  playersAnswers: PlayerAnswerData[];
}
interface RoomData {
  code: string;
  players: PlayerData[];
  questions: QuestionData[];
}

//let roomData: Map<string, RoomData> =[] = [];
const roomData = new Map<string, any>();

function generateCode() : string {
  const max = Math.pow(26, 4);
  const code = Math.floor(Math.random() * max);

  const asciiCode = ['','','',''];

  asciiCode.reduce((acc, curr, index, arr) => {
    arr[index] = String.fromCharCode(65 + acc % 26);
    return Math.floor(acc / 26);
  }, code);
  return asciiCode.join('');
}

function createRoom(socket) : string {
  const usedRooms = Array.from(io.of("/").adapter.rooms.keys());

  while(1 == 1) {
    const newRoom = generateCode();
    if (usedRooms.includes(newRoom)) continue;
    socket.join(newRoom);
    roomData.set(newRoom, {});
    return newRoom;
  }
}

function playerJoinRoom(socket, room, name) {
  const runningRooms = Array.from(io.of("/").adapter.rooms.keys());
  if (!runningRooms.includes(room)) {
    socket.emit('roomNotFound', {room});
    console.log("room not found");
    return;
  }

  socket.data = {room, name};
  socket.join(room);
  socket.emit('welcomeToRoom', {room});
  const socketsInRoom = Array.from(io.of("/").adapter.rooms.get(room).keys());
  socketsInRoom.forEach((socketInRoom) => {
    const data = io.of("/").sockets.get(socketInRoom).data;
    if (data.name) {
      socket.emit('playerAdded', {player: data.name});
    }
  });
  socket.to(room).emit('playerAdded', {player: name});
}

//First phase
//Find how many players
//Choose questions for players (number of questions = number of players)
//Send questions to players
//Get players answers
//Wait until all players have answered, or time is up
//Start second phase

//Second phase
//Show a question to players and the answer given
//Show a list of players who may have provided the answer
//Wait until players have chosen an answer, or time is up
//Show how many voted for each answer
//Show correct answer

const getData = () => {
  return new Promise<any[]>((resolve, reject) => {
    questiondb.find().make((builder) => {
      builder.callback((err, data) => {
        if (err) {
          console.log(`Error retrieving questions: ${err}`);
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  });
}

async function provideQuestions(socket) {
  const questions = (await getData()).map((record, index) => ({...record, index, sort: Math.random()})).sort((a,b) => {
    if (a.sort < b.sort) {
      return -1;
    }
    if (b.sort < a.sort) {
      return 1;
    }
    return 0;
  });

  const socketsInRoom = Array.from(io.of("/").adapter.rooms.get(socket.data.room).keys());
  const playerSocketsInRoom = socketsInRoom.filter((socketId) => {
    const player = io.of("/").sockets.get(socketId).data;
    return !!player.name;

  });
  const playerSockets = playerSocketsInRoom.map((socketId) => {
    return io.of("/").sockets.get(socketId);
  });

  playerSockets.forEach((playerSocket, index) => {
    playerSocket.data = {...playerSocket.data, question1: questions[index % questions.length], question2: undefined, sort2: Math.random()}
  });

  playerSockets.sort((a,b) => {
    if (a.data.sort2 < b.data.sort2) {
      return -1;
    }
    if (b.data.sort2 < a.data.sort2) {
      return 1;
    }
    return 0;
  });

  playerSockets.forEach((_, index) => {
    const availablePositions = playerSockets.filter((socket) => socket.data.question1.index !== questions[index % questions.length].index && socket.data.question2 === undefined);
    if (availablePositions.length > 0) {
      const randomPosition = Math.floor(Math.random() * availablePositions.length);
      const playerSocket = availablePositions[randomPosition];
      playerSocket.data = {...playerSocket.data, question2: questions[index % questions.length]};
    } else {
      // find person who has this question as their first question but doesn't have second question
      const problemPosition = playerSockets.filter((socket) => socket.data.question1.index === questions[index % questions.length].index && socket.data.question2 === undefined)[0];
      // swap question1 with someone else who has been given a question2 that is not the same and then continue assigning question2?
      const alternatePositions = playerSockets.filter((socket) => socket.data.question2 !== undefined && socket.data.question2.index !== questions[index % questions.length].index);
      const randomAlternatePosition = Math.floor(Math.random() * alternatePositions.length);
      const alternateQuestion1 = {...alternatePositions[randomAlternatePosition].data.question1};
      alternatePositions[randomAlternatePosition].data.question1 = {...problemPosition.data.question1};
      problemPosition.data = {...problemPosition.data, question1:alternateQuestion1, question2:questions[index % questions.length]}
    }
  });

  playerSockets.forEach((playerSocket) => {
    playerSocket.emit('provideQuestions', {question1: playerSocket.data.question1, question2: playerSocket.data.question2});
  });
}

async function recalculateWaitingAnswers(socket) {
  const socketsInRoom = Array.from(io.of("/").adapter.rooms.get(socket.data.room).keys());
  let answerCount = 0;
  let playerCount = 0;
  let hostSocket = undefined;

  for(let socketIndex = 0; socketIndex < socketsInRoom.length; socketIndex++) {
    const socket = io.of("/").sockets.get(socketsInRoom[socketIndex]);
    if (socket.data.name) {
      playerCount++;
      if (socket.data.answers) {
        answerCount++;
      }
    }
    else {
      hostSocket = socket;
    }
  }

  hostSocket.emit('answersGiven', {playerCount, answerCount});
}

io.of("/").adapter.on("create-room", (room) => {
  if(room.length == 4) {
    console.log(`room ${room} was created`);
  }
})

io.of("/").adapter.on("delete-room", (room) => {
  if (roomData.has(room)) {
    console.log(`room ${room} was deleted`);
  }
})

io.on('connection', async (socket) => {
  console.log('a used connected');
  socket.on('disconnect', () => {
    console.log('user disconnected');
  });

  socket.on('requestRoom', async (msg) => {
    console.log('requestRoom');
    const generatedRoom = createRoom(socket);
    socket.data = {room: generatedRoom};
    socket.emit('provideRoom', {room: generatedRoom});
  });

  socket.on('joinRoom', async (msg) => {
    console.log(`joinRoom - Room: ${msg.room}, Name: ${msg.name}`);
    playerJoinRoom(socket, msg.room, msg.name);
  });

  socket.on('startGame', async (msg) => {
    console.log(`startGame - Room: ${msg.room}`);
    socket.to(msg.room).emit('gameStartedAsPlayer');
    socket.emit('gameStartedAsHost');
    await provideQuestions(socket);
    await recalculateWaitingAnswers(socket);
  });

  socket.on('provideResponse', async (msg) => {
    console.log(`provideResponse`, msg);
    socket.data = {...socket.data, answers: msg};
    await recalculateWaitingAnswers(socket);
  });

  // socket.on('addquestion', async (question) => {
  //   console.log(`addquestion: ${question}`);
  //   questiondb.insert({question}).callback((err) => {
  //     if(err) {
  //       console.log(`Error saving question to db: ${err}`);
  //     } else {
  //       io.emit('addquestion', question);
  //     }
  //   });
  // });

  // questiondb.find().make((builder) => {
  //   builder.callback((err, response) => {
  //     if (err) {
  //       console.log(`Error retrieving questions: ${err}`);
  //     } else {
  //       socket.emit('allquestions', response);
  //     }
  //   });
  // });
});

app.use(express.static(path.resolve(__dirname, "../client/build")));

server.listen(port, async () => {
  console.log(`listening on *:${port}`);
});
