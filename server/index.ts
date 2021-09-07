import path from 'path';
import http from 'http';
import express from 'express';
import {Server, Socket} from 'socket.io';
import NoSQL from 'nosql';

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = process.env.PORT || 3001;

const questiondb = NoSQL.load(path.resolve(__dirname, "./questions.nosql"));

const questionTimeout = 60 * 5;
const quizTimeout = 15;

interface PlayerAnswerData {
  playerName: string;
  playerSocketId: string;
  answerIndex: number;
}
interface QuestionData {
  questionIndex: number;
  text: string;
  playersAnswers: PlayerAnswerData[];
}
interface RoomData {
  questionInterval: NodeJS.Timeout;
  questionTimeRemaining: number;
  questionTimeStart: number;
  phase: number;
  questions: QuestionData[];
  currentQuestion: QuestionData | undefined;
}

//let roomData: Map<string, RoomData> =[] = [];
const roomData = new Map<string, RoomData>();

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
    roomData.set(newRoom, {questionInterval: undefined, questionTimeRemaining: 0, questionTimeStart: 0, phase: 1, questions: [], currentQuestion: undefined});
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
  const roomCode = socket.data.room;
  const room = roomData.get(roomCode);
  const questions = (await getData()).map((record, index) => ({...record, index, sort: Math.random()})).sort((a,b) => {
    if (a.sort < b.sort) {
      return -1;
    }
    if (b.sort < a.sort) {
      return 1;
    }
    return 0;
  });

  const socketsInRoom = Array.from(io.of("/").adapter.rooms.get(roomCode).keys());
  const playerSocketsInRoom = socketsInRoom.filter((socketId) => {
    const player = io.of("/").sockets.get(socketId).data;
    return !!player.name;

  });
  const playerSockets = playerSocketsInRoom.map((socketId) => {
    return io.of("/").sockets.get(socketId);
  });

  playerSockets.forEach((playerSocket, index) => {
    playerSocket.data = {...playerSocket.data, q1Index: index, question1: questions[index % questions.length], question2: undefined, sort2: Math.random()}
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
      playerSocket.data = {...playerSocket.data, q2Index: index, question2: questions[index % questions.length]};
    } else {
      // find a person who has this question as their first question but doesn't have a second question
      const problemPosition = playerSockets.filter((socket) => socket.data.question1.index === questions[index % questions.length].index && socket.data.question2 === undefined)[0];
      // swap question1 with someone else who has been given a question2 that is not the same and then continue assigning question2?
      const alternatePositions = playerSockets.filter((socket) => socket.data.question2 !== undefined && socket.data.question2.index !== questions[index % questions.length].index);
      const randomAlternatePosition = Math.floor(Math.random() * alternatePositions.length);
      const alternateQuestion1 = {...alternatePositions[randomAlternatePosition].data.question1};
      const alternateQuestion1Index = alternatePositions[randomAlternatePosition].data.q1Index;
      alternatePositions[randomAlternatePosition].data.question1 = {...problemPosition.data.question1};
      alternatePositions[randomAlternatePosition].data.q1Index = problemPosition.data.q1Index;
      problemPosition.data = {...problemPosition.data, q1Index: alternateQuestion1Index, question1:alternateQuestion1, q2Index: index, question2:questions[index % questions.length]}
    }
  });

  room.questions = new Array(playerSockets.length);

  playerSockets.forEach((playerSocket) => {
    if (!room.questions[playerSocket.data.q1Index]) {
      const newQuestion: QuestionData = {questionIndex: playerSocket.data.question1.index, text: playerSocket.data.question1.question, playersAnswers: []}
      room.questions[playerSocket.data.q1Index] = newQuestion;
    }
    if (!room.questions[playerSocket.data.q2Index]) {
      const newQuestion: QuestionData = {questionIndex: playerSocket.data.question2.index, text: playerSocket.data.question2.question, playersAnswers: []}
      room.questions[playerSocket.data.q2Index] = newQuestion;
    }
    room.questions[playerSocket.data.q1Index] = {...room.questions[playerSocket.data.q1Index], playersAnswers: [...room.questions[playerSocket.data.q1Index].playersAnswers, {playerSocketId: playerSocket.id, playerName: playerSocket.data.name, answerIndex: 1}]}
    room.questions[playerSocket.data.q2Index] = {...room.questions[playerSocket.data.q2Index], playersAnswers: [...room.questions[playerSocket.data.q2Index].playersAnswers, {playerSocketId: playerSocket.id, playerName: playerSocket.data.name, answerIndex: 2}]}
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

  if (playerCount === answerCount) {
    endQuestioning(socket.data.room);
  }
}

async function provideGuessListener(socket, answers) {
  const room = roomData.get(socket.data.room);

  if(socket.id === room.currentQuestion.playersAnswers[0].playerSocketId || socket.id == room.currentQuestion.playersAnswers[1].playerSocketId){
    return;
  }

  socket.data = {...socket.data, quizAnswers: answers};

  const player1 = room.currentQuestion.playersAnswers[0].playerSocketId;
  const player2 = room.currentQuestion.playersAnswers[1].playerSocketId;
  const player1Socket = io.of("/").sockets.get(player1);
  const player2Socket = io.of("/").sockets.get(player2);
  const player1Answer = player1Socket.data.answers[room.currentQuestion.playersAnswers[0].answerIndex - 1];
  const player2Answer = player2Socket.data.answers[room.currentQuestion.playersAnswers[1].answerIndex - 1];

  if (player1Answer == socket.data.quizAnswers[0] && player2Answer == socket.data.quizAnswers[1]) {
    if (socket.data.score === undefined) {
      socket.data.score = 0;
    }
    socket.data.score += ((quizTimeout * 1000) - (Date.now() - room.questionTimeStart))/(quizTimeout * 500);
  }

  await recalculateWaitingQuizAnswers(socket)
}

async function recalculateWaitingQuizAnswers(socket) {
  const room = roomData.get(socket.data.room);
  const quizSocketsInRoom = Array.from(io.of("/").adapter.rooms.get(socket.data.room).keys()).filter((socketId) => (socketId != room.currentQuestion.playersAnswers[0].playerSocketId && socketId != room.currentQuestion.playersAnswers[1].playerSocketId));
  let answerCount = 0;
  let playerCount = 0;
  let hostSocket = undefined;

  for(let socketIndex = 0; socketIndex < quizSocketsInRoom.length; socketIndex++) {
    const socket = io.of("/").sockets.get(quizSocketsInRoom[socketIndex]);
    if (socket.data.name) {
      playerCount++;
      if (socket.data.quizAnswers) {
        answerCount++;
      }
    }
    else {
      hostSocket = socket;
    }
  }

  hostSocket.emit('answersGiven', {playerCount, answerCount});

  if (playerCount === answerCount) {
    endQuestioning(socket.data.room);
  }
}

function showCorrectAnswer(roomCode) {
  const room = roomData.get(roomCode);
  const player1 = room.currentQuestion.playersAnswers[0].playerSocketId;
  const player2 = room.currentQuestion.playersAnswers[1].playerSocketId;
  const player1Socket = io.of("/").sockets.get(player1);
  const player2Socket = io.of("/").sockets.get(player2);
  const player1Answer = player1Socket.data.answers[room.currentQuestion.playersAnswers[0].answerIndex - 1];
  const player2Answer = player2Socket.data.answers[room.currentQuestion.playersAnswers[1].answerIndex - 1];

  const quizSocketsInRoom = Array.from(io.of("/").adapter.rooms.get(roomCode).keys()).filter((socketId) => (socketId != room.currentQuestion.playersAnswers[0].playerSocketId && socketId != room.currentQuestion.playersAnswers[1].playerSocketId));
  let correct = 0;
  let total = 0;

  for(let socketIndex = 0; socketIndex < quizSocketsInRoom.length; socketIndex++) {
    const socket = io.of("/").sockets.get(quizSocketsInRoom[socketIndex]);
    if (socket.data.name) {
      total += 1;
      if (socket.data.quizAnswers) {
        if (player1Answer == socket.data.quizAnswers[0] && player2Answer == socket.data.quizAnswers[1]) {
          socket.emit('answerCorrect', {correct: true});
          correct += 1;
        }
        else {
          socket.emit('answerCorrect', {correct: false});
        }
      }
    }
  }

  const topFivePlayersInScoreOrder = Array.from(io.of("/").adapter.rooms.get(roomCode).keys())
      .map((socketId) => (io.of("/").sockets.get(socketId)))
      .filter((socket) => (!!socket.data.name && socket.data.score))
      .sort((socketA, socketB) => {
        if (socketA.data.score === undefined) return 1;
        if (socketB.data.score === undefined) return -1;
        return socketB.data.score - socketA.data.score
      })
      .slice(0,5)
      .map((socket) => ({player: socket.data.name, score: socket.data.score}));

  let answers = [player1Answer, player2Answer];
  const quizQuestion = {total, correct, topFive: topFivePlayersInScoreOrder, players: [room.currentQuestion.playersAnswers[0].playerName, room.currentQuestion.playersAnswers[1].playerName], answers};
  console.log(quizQuestion);
  io.to(roomCode).emit('quizCorrect', quizQuestion);
}

function gameTimeInterval(roomCode) {
  const room = roomData.get(roomCode);
  room.questionTimeRemaining--;
  io.to(roomCode).emit('timeRemaining', {remaining: room.questionTimeRemaining});
  if (room.questionTimeRemaining === 0) {
    endQuestioning(roomCode);
  }
}

function endQuestioning(roomCode) {
  console.log('endQuestioning');
  stopInterval(roomCode);
  const room = roomData.get(roomCode);
  if (room.phase === 1) {
    switchPhase(roomCode, 2);
  }
  else if (room.phase === 3) {
    switchPhase(roomCode, 4);
    showCorrectAnswer(roomCode);
  }
}

function stopInterval(roomCode) {
  const room = roomData.get(roomCode);
  if (room.questionInterval !== undefined) {
    clearInterval(room.questionInterval);
    room.questionInterval = undefined;
  }
}

function switchPhase(roomCode, phase) {
  stopInterval(roomCode);
  const room = roomData.get(roomCode);
  room.phase = phase;
  io.to(roomCode).emit('setGamePhase', {phase});
}

function askQuizQuestion(roomCode) {
  const room = roomData.get(roomCode);

  const socketsInRoom = Array.from(io.of("/").adapter.rooms.get(roomCode).keys());
  for(let socketIndex = 0; socketIndex < socketsInRoom.length; socketIndex++) {
    const socket = io.of("/").sockets.get(socketsInRoom[socketIndex]);
    socket.data.quizAnswers = undefined;
  }

  const remainingQuestions = room.questions.filter((question) => (!!question));
  console.log(`${remainingQuestions.length} questions remaining`);
  if (remainingQuestions.length === 0) {
    switchPhase(roomCode, 5);
    return;
  }
  const randomQuestion = Math.floor(Math.random() * remainingQuestions.length);
  room.currentQuestion = remainingQuestions[randomQuestion];
  const remainingQuestionIndex = room.questions.indexOf(room.currentQuestion);
  remainingQuestions[remainingQuestionIndex] = undefined;
  room.questions[room.questions.indexOf(room.currentQuestion)] = undefined;

  const player1 = room.currentQuestion.playersAnswers[0].playerSocketId;
  const player2 = room.currentQuestion.playersAnswers[1].playerSocketId;
  const player1Socket = io.of("/").sockets.get(player1);
  const player2Socket = io.of("/").sockets.get(player2);
  const player1Answer = player1Socket.data.answers[room.currentQuestion.playersAnswers[0].answerIndex - 1];
  const player2Answer = player2Socket.data.answers[room.currentQuestion.playersAnswers[1].answerIndex - 1];
  let answers = [player1Answer, player2Answer];
  if (Math.floor(Math.random() * 2) > 0) {
    answers = [player2Answer, player1Answer];
  }
  const quizQuestion = {total: room.questions.length, remaining: remainingQuestions.length - 1, question: room.currentQuestion.text, players: [room.currentQuestion.playersAnswers[0].playerName, room.currentQuestion.playersAnswers[1].playerName], answers};

  io.to(roomCode).except([player1, player2]).emit('quiz', quizQuestion);
  io.to([player1, player2]).emit('quizYou', quizQuestion);

  room.questionTimeRemaining = quizTimeout;
  room.questionTimeStart = Date.now();
  room.questionInterval = setInterval(() => gameTimeInterval(roomCode), 1000);
  io.to(roomCode).emit('timeRemaining', {remaining: room.questionTimeRemaining});
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

    const room = roomData.get(msg.room);
    room.questionTimeRemaining = questionTimeout;
    room.questionInterval = setInterval(() => gameTimeInterval(msg.room), 1000);
    io.to(msg.room).emit('timeRemaining', {remaining: room.questionTimeRemaining});
  });

  socket.on('provideResponse', async (msg) => {
    console.log(`provideResponse`, msg);
    socket.data = {...socket.data, answers: [msg.answer1, msg.answer2]};
    await recalculateWaitingAnswers(socket);
  });

  socket.on('continueToPhase3', async (msg) => {
    console.log('continueToPhase3');
    switchPhase(socket.data.room, 3);
    askQuizQuestion(socket.data.room);
    await recalculateWaitingQuizAnswers(socket);
  })

  socket.on('provideGuess', async (msg) => {
    console.log('provideGuess', msg);
    await provideGuessListener(socket, msg.answers);
  })

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
