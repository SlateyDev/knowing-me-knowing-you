import React, {useState, useEffect, useMemo, useCallback, createContext, useReducer} from "react";
import socket from "./socket";

enum modeEnum {
    None,
    Host,
    EnterDetails,
    JoinedHostGame,
    GameRunningAsHost,
    GameRunningAsPlayer
}

interface Answers {
    answer1: string;
    answer2: string;
}
interface GameState {
    mode: number;
    phase: number;
    waiting: boolean;
    players: string[];
    roomCode: string;
    playerName: string;
    questions: any;
    answers: Answers;
    hostPlayerCount: number;
    hostAnswerCount: number;
}

const initialState: GameState = {
    mode: modeEnum.None,
    phase: 0,
    waiting: false,
    players: [],
    roomCode: "",
    playerName: "",
    questions: undefined,
    answers: {answer1: "", answer2: ""},
    hostPlayerCount: 0,
    hostAnswerCount: 0,
};

const ADD_PLAYER = "ADD_PLAYER";
const SET_MODE = "SET_MODE";
const SET_WAITING = "SET_WAITING";
const SET_ROOM_CODE = "SET_ROOM_CODE";
const SET_PLAYER_NAME = "SET_PLAYER_NAME";
const SET_QUESTIONS = "SET_QUESTIONS";
const SET_ANSWER_1 = "SET_ANSWER_1";
const SET_ANSWER_2 = "SET_ANSWER_2";
const SET_HOST_ANSWERS_GIVEN = "SET_HOST_ANSWERS_GIVEN";

interface AddPlayerAction {
    type: typeof ADD_PLAYER;
    payload: {
        name: string;
    }
}
interface SetModeAction {
    type: typeof SET_MODE;
    payload: {
        mode: modeEnum;
    }
}
interface SetWaitingAction {
    type: typeof SET_WAITING;
}
interface SetRoomCodeAction {
    type: typeof SET_ROOM_CODE;
    payload: {
        code: string;
    }
}
interface SetPlayerName {
    type: typeof SET_PLAYER_NAME;
    payload: {
        name: string;
    }
}
interface SetQuestions {
    type: typeof SET_QUESTIONS;
    payload: {
        questions: any;
    }
}
interface SetAnswer1 {
    type: typeof SET_ANSWER_1;
    payload: {
        answer: string;
    }
}
interface SetAnswer2 {
    type: typeof SET_ANSWER_2;
    payload: {
        answer: string;
    }
}
interface SetHostAnswersGiven {
    type: typeof SET_HOST_ANSWERS_GIVEN;
    payload: {
        playerCount: number;
        answerCount: number;
    }
}

type ActionTypes = AddPlayerAction | SetModeAction | SetWaitingAction | SetRoomCodeAction | SetPlayerName | SetQuestions | SetHostAnswersGiven | SetAnswer1 | SetAnswer2;

function reducer(state: GameState, action: ActionTypes) {
    switch(action.type) {
        case ADD_PLAYER:
            return {
                ...state,
                players: [...state.players, action.payload.name],
            };
        case SET_MODE:
            return {
                ...state,
                mode: action.payload.mode,
                phase: action.payload.mode === modeEnum.GameRunningAsPlayer ? 0 : state.phase,
                waiting: false,
            };
        case SET_WAITING:
            return {
                ...state,
                waiting: true,
            };
        case SET_ROOM_CODE:
            return {
                ...state,
                roomCode: action.payload.code,
            };
        case SET_PLAYER_NAME:
            return {
                ...state,
                playerName: action.payload.name,
            };
        case SET_QUESTIONS:
            return {
                ...state,
                questions: action.payload.questions,
            };
        case SET_ANSWER_1:
            return {
                ...state,
                answers: {...state.answers, answer1: action.payload.answer},
            };
        case SET_ANSWER_2:
            return {
                ...state,
                answers: {...state.answers, answer2: action.payload.answer},
            };
        case SET_HOST_ANSWERS_GIVEN:
            return {
                ...state,
                hostPlayerCount: action.payload.playerCount,
                hostAnswerCount: action.payload.answerCount,
            }
        default:
            throw new Error();
    }
}

function Game() {
    const [state, dispatch] = useReducer(reducer, initialState);

    const provideRoomListener = (msg: any) => {
        dispatch({type: SET_ROOM_CODE, payload: { code: msg.room}});
        dispatch({type: SET_MODE, payload: { mode: modeEnum.Host}});
    }
    const welcomeToRoomListener = (msg: any) => {
        dispatch({type: SET_MODE, payload: { mode: modeEnum.JoinedHostGame}});
    }
    const roomNotFoundListener = (msg: any) => {
        dispatch({type: SET_MODE, payload: { mode: modeEnum.JoinedHostGame}});
    }
    const gameStartedAsHostListener = (msg: any) => {
        dispatch({type: SET_MODE, payload: { mode: modeEnum.GameRunningAsHost}});
    }
    const gameStartedAsPlayerListener = (msg: any) => {
        dispatch({type: SET_MODE, payload: { mode: modeEnum.GameRunningAsPlayer}});
    }
    const playerAddedListener = (msg: any) => {
        dispatch({type: ADD_PLAYER, payload: {name: msg.player}});
    }
    const provideQuestionsListener = (msg: any) => {
        console.log(msg);
        dispatch({type: SET_QUESTIONS, payload: {questions: msg}});
    }
    const answersGivenListener = (msg: any) => {
        dispatch({type: SET_HOST_ANSWERS_GIVEN, payload: {playerCount: msg.playerCount, answerCount: msg.answerCount}});
    }

    const hostGame = () => {
        socket.emit('requestRoom');
        dispatch({type: SET_WAITING});
    }
    const joinGame = () => {
        dispatch({type: SET_MODE, payload: { mode: modeEnum.EnterDetails}});
    }
    const joinHostGame = () => {
        socket.emit('joinRoom', {room: state.roomCode, name: state.playerName});
        dispatch({type: SET_WAITING});
    }
    const startGame = () => {
        socket.emit('startGame', {room: state.roomCode});
        dispatch({type: SET_WAITING});
    }
    const provideAnswers = () => {
        socket.emit('provideResponse', {answer1: state.answers.answer1, answer2: state.answers.answer2});
        dispatch({type: SET_WAITING});
    }

    useEffect(() => {
        socket.on('provideRoom', provideRoomListener);
        socket.on('welcomeToRoom', welcomeToRoomListener);
        socket.on('roomNotFound', roomNotFoundListener);
        socket.on('playerAdded', playerAddedListener)
        socket.on('gameStartedAsHost', gameStartedAsHostListener);
        socket.on('gameStartedAsPlayer', gameStartedAsPlayerListener);
        socket.on('provideQuestions', provideQuestionsListener);
        socket.on('answersGiven', answersGivenListener);

        return function cleanup() {
            socket.off('provideRoom', provideRoomListener);
            socket.off('welcomeToRoom', welcomeToRoomListener);
            socket.off('roomNotFound', roomNotFoundListener);
            socket.off('playerAdded', playerAddedListener)
            socket.off('gameStartedAsHost', gameStartedAsHostListener);
            socket.off('gameStartedAsPlayer', gameStartedAsPlayerListener);
            socket.off('provideQuestions', provideQuestionsListener);
            socket.off('answersGiven', answersGivenListener);
        }
    }, [])

    switch (state.mode) {
        case modeEnum.Host:
            return (
                <>
                    <div><label>Code: {state.roomCode}</label></div>
                    <div><label>Players</label></div>
                    <div><ul>
                        {state.players.map((player) => (
                            <li>{player}</li>
                        ))}
                    </ul></div>
                    <div><button onClick={startGame} disabled={state.waiting}>Start Game</button></div>
                    {state.waiting && <div><label>Please Wait...</label></div>}
                </>
            );
        case modeEnum.EnterDetails:
            return (
                <>
                    <div><label>Code </label><input type="text" readOnly={state.waiting} value={state.roomCode} onChange={(e) => dispatch({type: SET_ROOM_CODE, payload: { code: e.target.value}})} /></div>
                    <div><label>Full Name </label><input type="text" readOnly={state.waiting} value={state.playerName} onChange={(e) => dispatch({type: SET_PLAYER_NAME, payload: { name: e.target.value}})} /></div>
                    <div><button onClick={joinHostGame} disabled={state.waiting}>Join Game</button></div>
                    {state.waiting && <div><label>Please Wait...</label></div>}
                </>
            );
        case modeEnum.JoinedHostGame:
            return (
                <>
                    <div><label>Code: {state.roomCode}</label></div>
                    <div><label>Players</label></div>
                    <div><ul>
                        {state.players.map((player) => (
                            <li>{player}</li>
                        ))}
                    </ul></div>
                    <div><label>Waiting for host to start</label></div>
                    {state.waiting && <div><label>Please Wait...</label></div>}
                </>
            );
        case modeEnum.GameRunningAsHost:
            return (
                <>
                    <div><label>Code: {state.roomCode}</label></div>
                    <div><label>Welcome players</label></div>
                    <div><label>Waiting for answers: {state.hostAnswerCount} out of {state.hostPlayerCount} done</label></div>
                    {state.waiting && <div><label>Please Wait...</label></div>}
                </>
            );
        case modeEnum.GameRunningAsPlayer:
            return (
                <>
                    <div><label>Code: {state.roomCode}</label></div>
                    <div><label>You are in the game</label></div>
                    <div><label>Questions:</label></div>
                    <div><label>Question 1: </label></div>
                    <div><label>{state.questions && state.questions.question1.question}</label></div>
                    <div><input type="text" readOnly={state.waiting} value={state.answers.answer1} onChange={(e) => dispatch({type: SET_ANSWER_1, payload: { answer: e.target.value}})} /></div>
                    <div><label>Question 1: </label></div>
                    <div><label>{state.questions && state.questions.question2.question}</label></div>
                    <div><input type="text" readOnly={state.waiting} value={state.answers.answer2} onChange={(e) => dispatch({type: SET_ANSWER_2, payload: { answer: e.target.value}})} /></div>
                    <button onClick={provideAnswers} disabled={state.waiting}>Send</button>
                    {state.waiting && <div><label>Please Wait...</label></div>}
                </>
            );
        default:
            return (
                <>
                    <div><button onClick={hostGame} disabled={state.waiting}>Host Game</button></div>
                    <div><button onClick={joinGame} disabled={state.waiting}>Join Game</button></div>
                    {state.waiting && <div><label>Please Wait...</label></div>}
                </>
            );
    }
}

export default Game;
