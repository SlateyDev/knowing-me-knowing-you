import React, {useState, useEffect, useMemo, useCallback, createContext, useReducer} from "react";
import socket from "./socket";
import bigtitle from './bigtitle.png';
import smltitle from './smltitle.png';

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
        if(state.waiting) return;
        socket.emit('requestRoom');
        dispatch({type: SET_WAITING});
    }
    const joinGame = () => {
        if(state.waiting) return;
        dispatch({type: SET_MODE, payload: { mode: modeEnum.EnterDetails}});
    }
    const joinHostGame = () => {
        if(state.waiting) return;
        socket.emit('joinRoom', {room: state.roomCode, name: state.playerName});
        dispatch({type: SET_WAITING});
    }
    const startGame = () => {
        if(state.waiting) return;
        socket.emit('startGame', {room: state.roomCode});
        dispatch({type: SET_WAITING});
    }
    const provideAnswers = () => {
        if(state.waiting) return;
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
                    <div className={"HeaderImage"}><img src={smltitle} /></div>
                    <div className={"Field"}>Room Code: {state.roomCode}</div>
                    <div className={"PlayersField"}>
                        <div className={"FieldRow"}>
                            <div>Players</div>
                            <ul>
                                {state.players.map((player) => (
                                    <li>{player}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                    <div className={"GameButton"} onClick={startGame} aria-disabled={state.waiting}>Start Game</div>
                    {state.waiting && <div><label>Please Wait...</label></div>}
                </>
            );
        case modeEnum.EnterDetails:
            return (
                <>
                    <div className={"HeaderImage"}><img src={smltitle} /></div>
                    <div className={"Field"}>
                        <div className={"FieldRow"}>
                            <div className={"QuestionHeader"}>Room Code</div>
                            <div className={"Answer"}><input type="text" readOnly={state.waiting} value={state.roomCode} onChange={(e) => dispatch({type: SET_ROOM_CODE, payload: { code: e.target.value}})} /></div>
                        </div>
                    </div>
                    <div className={"Field"}>
                        <div className={"FieldRow"}>
                            <div className={"QuestionHeader"}>Full Name</div>
                            <div className={"Answer"}><input type="text" readOnly={state.waiting} value={state.playerName} onChange={(e) => dispatch({type: SET_PLAYER_NAME, payload: { name: e.target.value}})} /></div>
                        </div>
                    </div>
                    <div className={"GameButton"} onClick={joinHostGame} aria-disabled={state.waiting}>Join Game</div>
                    {state.waiting && <div><label>Please Wait...</label></div>}
                </>
            );
        case modeEnum.JoinedHostGame:
            return (
                <>
                    <div className={"HeaderImage"}><img src={smltitle} /></div>
                    <div className={"Field"}>Room Code: {state.roomCode}</div>
                    <div className={"PlayersField"}>
                        <div className={"FieldRow"}>
                            <div>Players</div>
                            <ul>
                                {state.players.map((player) => (
                                    <li>{player}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                    <div><label>Waiting for host to start</label></div>
                    {state.waiting && <div><label>Please Wait...</label></div>}
                </>
            );
        case modeEnum.GameRunningAsHost:
            return (
                <>
                    <div className={"HeaderImage"}><img src={smltitle} /></div>
                    <div className={"Field"}>Room Code: {state.roomCode}</div>
                    <div><label>Welcome players</label></div>
                    <div><label>Waiting for answers: {state.hostAnswerCount} out of {state.hostPlayerCount} done</label></div>
                    {state.waiting && <div><label>Please Wait...</label></div>}
                </>
            );
        case modeEnum.GameRunningAsPlayer:
            return (
                <>
                    <div className={"HeaderImage"}><img src={smltitle} /></div>
                    <div className={"Field"}>Room Code: {state.roomCode}</div>
                    <div className={"Description"}>Please answer the following questions</div>
                    <div className={"Field"}>
                        <div className={"FieldRow"}>
                            <div className={"QuestionHeader"}>Question 1:</div>
                            <div className={"Question"}>{state.questions && state.questions.question1.question}</div>
                            <div className={"Answer"}><input type="text" readOnly={state.waiting} value={state.answers.answer1} onChange={(e) => dispatch({type: SET_ANSWER_1, payload: { answer: e.target.value}})} /></div>
                        </div>
                    </div>
                    <div className={"Field"}>
                        <div className={"FieldRow"}>
                            <div className={"QuestionHeader"}>Question 2:</div>
                            <div className={"Question"}>{state.questions && state.questions.question2.question}</div>
                            <div className={"Answer"}><input type="text" readOnly={state.waiting} value={state.answers.answer2} onChange={(e) => dispatch({type: SET_ANSWER_2, payload: { answer: e.target.value}})} /></div>
                        </div>
                    </div>
                    <div className={"GameButton"} onClick={provideAnswers} aria-disabled={state.waiting}>Send</div>
                    {state.waiting && <div><label>Please Wait...</label></div>}
                </>
            );
        default:
            return (
                <>
                    <div className={"HeaderImage"}><img src={bigtitle} /></div>
                    <div className={"GameButton"} onClick={hostGame} aria-disabled={state.waiting}>Host Game</div>
                    <div className={"GameButton"} onClick={joinGame} aria-disabled={state.waiting}>Join Game</div>
                    {state.waiting && <div><label>Please Wait...</label></div>}
                </>
            );
    }
}

export default Game;
