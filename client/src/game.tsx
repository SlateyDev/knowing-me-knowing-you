import React, {useEffect, useReducer} from "react";
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

enum phaseEnum {
    QuestionTime = 1,
    Intermission,
    QuizTime
}

interface Answers {
    answer1: string;
    answer2: string;
}
interface GameState {
    mode: modeEnum;
    phase: phaseEnum;
    waiting: boolean;
    players: string[];
    roomCode: string;
    playerName: string;
    questions: any;
    answers: Answers;
    hostPlayerCount: number;
    hostAnswerCount: number;
    questionTimeRemaining: number;
    quizYou: boolean;
    quizQuestion: string;
    quizAnswers: string[];
    quizPlayers: string[];
    quizTotalAnswers: number;
    quizTotalAnswersCorrect: number;
    quizCorrectness: boolean;
    quizTotalQuestions: number;
    quizRemainingQuestions: number;
    quizLeaderboard: [];
}

const initialState: GameState = {
    mode: modeEnum.None,
    phase: phaseEnum.QuestionTime,
    waiting: false,
    players: [],
    roomCode: "",
    playerName: "",
    questions: undefined,
    answers: {answer1: "", answer2: ""},
    hostPlayerCount: 0,
    hostAnswerCount: 0,
    questionTimeRemaining: 0,
    quizYou: false,
    quizQuestion: "",
    quizAnswers: [],
    quizPlayers: [],
    quizTotalAnswers: 0,
    quizTotalAnswersCorrect: 0,
    quizCorrectness: false,
    quizTotalQuestions: 0,
    quizRemainingQuestions: 0,
    quizLeaderboard: [],
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
const SET_GAME_PHASE = "SET_GAME_PHASE";
const SET_TIME_REMAINING = "SET_TIME_REMAINING";
const SWAP_ANSWERS = "SWAP_ANSWERS";
const QUIZ = "QUIZ";
const QUIZYOU = "QUIZYOU";
const SET_QUIZ_CORRECTNESS = "SET_QUIZ_CORRECTNESS";
const SET_CORRECT_ANSWERS = "SET_CORRECT_ANSWERS";

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
interface SetGamePhase {
    type: typeof SET_GAME_PHASE;
    payload: {
        newPhase: number;
    }
}
interface SetTimeRemaining {
    type: typeof SET_TIME_REMAINING;
    payload: {
        remaining: number;
    }
}
interface SwapAnswers {
    type: typeof SWAP_ANSWERS;
}
interface Quiz {
    type: typeof QUIZ;
    payload: {
        total: number;
        remaining: number;
        question: string;
        answers: string[];
        players: string[];
    }
}
interface QuizYou {
    type: typeof QUIZYOU;
    payload: {
        total: number;
        remaining: number;
        question: string;
        answers: string[];
        players: string[];
    }
}
interface SetQuizCorrectness {
    type: typeof SET_QUIZ_CORRECTNESS;
    payload: {
        correct: boolean;
    }
}
interface SetCorrectAnswers {
    type: typeof SET_CORRECT_ANSWERS;
    payload: {
        total: number;
        correct: number;
        players: string[];
        answers: string[];
        topFive: [];
    }
}

type ActionTypes =
    AddPlayerAction |
    SetModeAction |
    SetWaitingAction |
    SetRoomCodeAction |
    SetPlayerName |
    SetQuestions |
    SetHostAnswersGiven |
    SetAnswer1 |
    SetAnswer2 |
    SetGamePhase |
    SetTimeRemaining |
    SwapAnswers |
    Quiz |
    QuizYou |
    SetQuizCorrectness |
    SetCorrectAnswers;

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
                phase: 1,
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
            };
        case SET_GAME_PHASE:
            return {
                ...state,
                phase: action.payload.newPhase,
                waiting: false,
            };
        case SET_TIME_REMAINING:
            return {
                ...state,
                questionTimeRemaining: action.payload.remaining,
            };
        case SWAP_ANSWERS:
            return {
                ...state,
                quizAnswers: [state.quizAnswers[1],state.quizAnswers[0]],
            };
        case QUIZ:
            return {
                ...state,
                quizYou: false,
                quizTotalQuestions: action.payload.total,
                quizRemainingQuestions: action.payload.remaining,
                quizQuestion: action.payload.question,
                quizAnswers: action.payload.answers,
                quizPlayers: action.payload.players,
            };
        case QUIZYOU:
            return {
                ...state,
                quizYou: true,
                quizTotalQuestions: action.payload.total,
                quizRemainingQuestions: action.payload.remaining,
                quizQuestion: action.payload.question,
                quizAnswers: action.payload.answers,
                quizPlayers: action.payload.players,
            };
        case SET_QUIZ_CORRECTNESS:
            return {
                ...state,
                quizCorrectness: action.payload.correct,
            };
        case SET_CORRECT_ANSWERS:
            console.log(action.payload);
            return {
                ...state,
                quizTotalAnswers: action.payload.total,
                quizTotalAnswersCorrect: action.payload.total,
                quizAnswers: action.payload.answers,
                quizPlayers: action.payload.players,
                quizLeaderboard: action.payload.topFive,
            };
        default:
            throw new Error();
    }
}

function Game() {
    const [state, dispatch] = useReducer(reducer, initialState);

    useEffect(() => {
        socket.on('provideRoom', provideRoomListener);
        socket.on('welcomeToRoom', welcomeToRoomListener);
        socket.on('roomNotFound', roomNotFoundListener);
        socket.on('playerAdded', playerAddedListener)
        socket.on('gameStartedAsHost', gameStartedAsHostListener);
        socket.on('gameStartedAsPlayer', gameStartedAsPlayerListener);
        socket.on('provideQuestions', provideQuestionsListener);
        socket.on('answersGiven', answersGivenListener);
        socket.on('setGamePhase', setGamePhaseListener);
        socket.on('timeRemaining', timeRemainingListener);
        socket.on('quiz', quizListener);
        socket.on('quizYou', quizYouListener);
        socket.on('answerCorrect', answerCorrectListener);
        socket.on('quizCorrect', quizCorrectListener);

        return function cleanup() {
            socket.off('provideRoom', provideRoomListener);
            socket.off('welcomeToRoom', welcomeToRoomListener);
            socket.off('roomNotFound', roomNotFoundListener);
            socket.off('playerAdded', playerAddedListener)
            socket.off('gameStartedAsHost', gameStartedAsHostListener);
            socket.off('gameStartedAsPlayer', gameStartedAsPlayerListener);
            socket.off('provideQuestions', provideQuestionsListener);
            socket.off('answersGiven', answersGivenListener);
            socket.off('setGamePhase', setGamePhaseListener);
            socket.off('timeRemaining', timeRemainingListener);
            socket.off('quiz', quizListener);
            socket.off('quizYou', quizYouListener);
            socket.off('answerCorrect', answerCorrectListener);
            socket.off('quizCorrect', quizCorrectListener);
        }
    }, [])

    function provideRoomListener(msg: any) {
        dispatch({type: SET_ROOM_CODE, payload: { code: msg.room}});
        dispatch({type: SET_MODE, payload: { mode: modeEnum.Host}});
    }
    function welcomeToRoomListener(msg: any) {
        dispatch({type: SET_MODE, payload: { mode: modeEnum.JoinedHostGame}});
    }
    function roomNotFoundListener(msg: any) {
        dispatch({type: SET_MODE, payload: { mode: modeEnum.JoinedHostGame}});
    }
    function gameStartedAsHostListener(msg: any) {
        dispatch({type: SET_MODE, payload: { mode: modeEnum.GameRunningAsHost}});
    }
    function gameStartedAsPlayerListener(msg: any) {
        dispatch({type: SET_MODE, payload: { mode: modeEnum.GameRunningAsPlayer}});
    }
    function playerAddedListener(msg: any) {
        dispatch({type: ADD_PLAYER, payload: {name: msg.player}});
    }
    function provideQuestionsListener(msg: any) {
        console.log(msg);
        dispatch({type: SET_QUESTIONS, payload: {questions: msg}});
    }
    function answersGivenListener(msg: any) {
        dispatch({type: SET_HOST_ANSWERS_GIVEN, payload: {playerCount: msg.playerCount, answerCount: msg.answerCount}});
    }
    function setGamePhaseListener(msg: any) {
        dispatch({type: SET_GAME_PHASE, payload: {newPhase: msg.phase}});
    }
    function timeRemainingListener(msg: any) {
        dispatch({type: SET_TIME_REMAINING, payload: {remaining: msg.remaining}});
    }
    function quizListener(msg: any) {
        dispatch({type: QUIZ, payload: {total: msg.total, remaining: msg.remaining, question: msg.question, players: msg.players, answers: msg.answers}});
    }
    function quizYouListener(msg: any) {
        dispatch({type: QUIZYOU, payload: {total: msg.total, remaining: msg.remaining, question: msg.question, players: msg.players, answers: msg.answers}});
    }
    function answerCorrectListener(msg: any) {
        dispatch({type: SET_QUIZ_CORRECTNESS, payload: {correct: msg.correct}});
    }
    function quizCorrectListener(msg: any) {
        dispatch({type: SET_CORRECT_ANSWERS, payload: {total: msg.total, correct: msg.correct, players: msg.players, answers: msg.answers, topFive: msg.topFive}})
    }

    function hostGame() {
        if(state.waiting) return;
        socket.emit('requestRoom');
        dispatch({type: SET_WAITING});
    }
    function joinGame() {
        if(state.waiting) return;
        dispatch({type: SET_MODE, payload: { mode: modeEnum.EnterDetails}});
    }
    function joinHostGame() {
        if(state.waiting) return;
        if(state.roomCode.length !== 4) {
            alert("Invalid room code. Please check host for room code.");
            return;
        }
        if(state.playerName.length === 0) {
            alert("Player name is required.");
            return;
        }
        socket.emit('joinRoom', {room: state.roomCode, name: state.playerName});
        dispatch({type: SET_WAITING});
    }
    function startGame() {
        if(state.waiting) return;
        socket.emit('startGame', {room: state.roomCode});
        dispatch({type: SET_WAITING});
    }
    function provideAnswers() {
        if(state.waiting) return;
        if(state.answers.answer1.length === 0 || state.answers.answer1.length === 0) {
            alert("Please answer all questions before continuing.");
            return;
        }
        socket.emit('provideResponse', {answer1: state.answers.answer1, answer2: state.answers.answer2});
        dispatch({type: SET_WAITING});
    }
    function provideGuess() {
        if(state.waiting) return;
        socket.emit('provideGuess', {answers: state.quizAnswers});
        dispatch({type: SET_WAITING});
    }
    function swapPlayers() {
        if(state.waiting) return;
        dispatch({type: SWAP_ANSWERS});
    }
    function continueToPhase3() {
        if(state.waiting) return;
        socket.emit('continueToPhase3');
        dispatch({type: SET_WAITING});
    }

    const hostPhases = [HostPhase1, HostPhase2, HostPhase3, HostPhase4, HostPhase5];
    const playerPhases = [PlayerPhase1, PlayerPhase2, PlayerPhase3, PlayerPhase4, PlayerPhase5];

    function HostPhase1() {
        return (
            <>
                <div className={"HeaderImage"}><img alt="Knowing ME Knowing YOU" src={smltitle} /></div>
                <div className={"Field"}>Room Code: {state.roomCode}</div>
                <div className={"Field"}>Time Remaining: {state.questionTimeRemaining}</div>
                <div><label>Welcome players</label></div>
                <div><label>Waiting for answers: {state.hostAnswerCount} out of {state.hostPlayerCount} done</label></div>
                {state.waiting && <div><label>Please Wait...</label></div>}
            </>
        );
    }

    function PlayerPhase1() {
        return (
            <>
                <div className={"HeaderImage"}><img alt="Knowing ME Knowing YOU" src={smltitle} /></div>
                <div className={"Field"}>Time Remaining: {state.questionTimeRemaining}</div>
                <div className={"Description"}>Please answer the following questions</div>
                <div className={"Field"}>
                    <div className={"FieldRow"}>
                        <div className={"QuestionHeader"}>Question 1:</div>
                        <div className={"Question"}>{state.questions && state.questions.question1.question}</div>
                        <div className={"Answer"}><input autoFocus type="text" readOnly={state.waiting} value={state.answers.answer1} onChange={(e) => dispatch({type: SET_ANSWER_1, payload: { answer: e.target.value}})} /></div>
                    </div>
                </div>
                <div className={"Field"}>
                    <div className={"FieldRow"}>
                        <div className={"QuestionHeader"}>Question 2:</div>
                        <div className={"Question"}>{state.questions && state.questions.question2.question}</div>
                        <div className={"Answer"}><input type="text" readOnly={state.waiting} value={state.answers.answer2} onChange={(e) => dispatch({type: SET_ANSWER_2, payload: { answer: e.target.value}})} /></div>
                    </div>
                </div>
                <div tabIndex={0} className={"GameButton"} onClick={provideAnswers} onKeyPress={(event) => {if(event.key == "Enter") provideAnswers()}} aria-disabled={state.waiting}>Send</div>
                {state.waiting && <div><label>Please Wait...</label></div>}
            </>
        );
    }

    function HostPhase2() {
        return (
            <>
                <div className={"HeaderImage"}><img alt="Knowing ME Knowing YOU" src={smltitle} /></div>
                <div className={"Field"}>Room Code: {state.roomCode}</div>
                <div className={"Field"}>Time Remaining: {state.questionTimeRemaining}</div>
                <div className={"Description"}>Answers have been entered. Get ready for the first question</div>
                <div className={"GameButton"} onClick={continueToPhase3} aria-disabled={state.waiting}>Continue</div>
                {state.waiting && <div><label>Please Wait...</label></div>}
            </>
        );
    }

    function PlayerPhase2() {
        return (
            <>
                <div className={"HeaderImage"}><img alt="Knowing ME Knowing YOU" src={smltitle} /></div>
                <div className={"Description"}>Waiting for host</div>
                {state.waiting && <div><label>Please Wait...</label></div>}
            </>
        );
    }

    function HostPhase3() {
        return (
            <>
                <div className={"HeaderImage"}><img alt="Knowing ME Knowing YOU" src={smltitle} /></div>
                <div className={"Field"}>Room Code: {state.roomCode}</div>
                <div className={"Field"}>Time Remaining: {state.questionTimeRemaining}</div>
                <div className={"Description"}>Who said it? Match the answer with the person who said it.</div>
                <div className={"Field"}>
                    <div className={"FieldRow"}>
                        <div className={"QuestionHeader"}>Question:</div>
                        <div className={"Question"}>{state.quizQuestion}</div>
                    </div>
                </div>
                <div style={{display: "flex", width: 437, marginLeft: 'auto', marginRight: 'auto', marginBottom: 10}}>
                    <div style={{backgroundColor: "grey", marginRight: 2, alignItems: "center", display: "flex", justifyContent: "center", padding: 10}} className={"Answer"}>{state.quizPlayers[0]}</div>
                    <div style={{backgroundColor: "grey", marginLeft: 2, alignItems: "center", display: "flex", justifyContent: "center", padding: 10}} className={"Answer"}>{state.quizPlayers[1]}</div>
                </div>
                <div style={{display: "flex", width: 437, marginLeft: 'auto', marginRight: 'auto', marginBottom: 4}}>
                    <div style={{backgroundColor: "grey", marginRight: 2, alignItems: "center", display: "flex", justifyContent: "center", padding: 10}} className={"Answer"}>{state.quizAnswers[0]}</div>
                    <div style={{backgroundColor: "grey", marginLeft: 2, alignItems: "center", display: "flex", justifyContent: "center", padding: 10}} className={"Answer"}>{state.quizAnswers[1]}</div>
                </div>
                <div><label>Waiting for answers: {state.hostAnswerCount} out of {state.hostPlayerCount} done</label></div>
                {state.waiting && <div><label>Please Wait...</label></div>}
            </>
        );
    }

    function PlayerPhase3() {
        return (
            <>
                <div className={"HeaderImage"}><img alt="Knowing ME Knowing YOU" src={smltitle} /></div>
                <div className={"Field"}>Time Remaining: {state.questionTimeRemaining}</div>
                {!state.quizYou && (
                    <>
                        <div className={"Description"}>Who said it? Match the answer with the person who said it. Swap if you think link is wrong.</div>
                        <div className={"Field"}>
                            <div className={"FieldRow"}>
                                <div className={"QuestionHeader"}>Question:</div>
                                <div className={"Question"}>{state.quizQuestion}</div>
                            </div>
                        </div>
                        <div style={{display: "flex", width: 437, marginLeft: 'auto', marginRight: 'auto', marginBottom: 10}}>
                            <div style={{backgroundColor: "grey", marginRight: 2, alignItems: "center", display: "flex", justifyContent: "center", padding: 10}} className={"Answer"}>{state.quizPlayers[0]}</div>
                            <div style={{backgroundColor: "grey", marginLeft: 2, alignItems: "center", display: "flex", justifyContent: "center", padding: 10}} className={"Answer"}>{state.quizPlayers[1]}</div>
                        </div>
                        <div style={{display: "flex", width: 437, marginLeft: 'auto', marginRight: 'auto', marginBottom: 4}}>
                            <div style={{marginRight: 2, alignItems: "center", display: "flex", justifyContent: "center", padding: 2}} className={"Answer"}>=</div>
                            <div style={{marginLeft: 2, alignItems: "center", display: "flex", justifyContent: "center", padding: 2}} className={"Answer"}>=</div>
                        </div>
                        <div style={{display: "flex", width: 437, marginLeft: 'auto', marginRight: 'auto', marginBottom: 4}}>
                            <div style={{backgroundColor: "grey", marginRight: 2, alignItems: "center", display: "flex", justifyContent: "center", padding: 10}} className={"Answer"}>{state.quizAnswers[0]}</div>
                            <div style={{backgroundColor: "grey", marginLeft: 2, alignItems: "center", display: "flex", justifyContent: "center", padding: 10}} className={"Answer"}>{state.quizAnswers[1]}</div>
                        </div>
                        <div className={"SwapButton"} onClick={swapPlayers} aria-disabled={state.waiting}>&gt;&gt; Swap &lt;&lt;</div>
                        <div className={"GameButton"} onClick={provideGuess} aria-disabled={state.waiting}>Send</div>
                    </>
                )}
                {state.quizYou && (
                    <>
                        <div className={"Description"}>Currently asking a question involving you. Look at the hosts screen.</div>
                    </>
                )}
                {state.waiting && <div><label>Please Wait...</label></div>}
            </>
        );
    }

    function HostPhase4() {
        return (
            <>
                <div className={"HeaderImage"}><img alt="Knowing ME Knowing YOU" src={smltitle} /></div>
                <div className={"Field"}>Room Code: {state.roomCode}</div>
                <div className={"Field"}>Time Remaining: {state.questionTimeRemaining}</div>
                <div className={"Description"}>Correct answers were.</div>
                <div className={"Field"}>
                    <div className={"FieldRow"}>
                        <div className={"QuestionHeader"}>Question:</div>
                        <div className={"Question"}>{state.quizQuestion}</div>
                    </div>
                </div>
                <div style={{display: "flex", width: 437, marginLeft: 'auto', marginRight: 'auto', marginBottom: 10}}>
                    <div style={{backgroundColor: "green", marginRight: 2, alignItems: "center", display: "flex", justifyContent: "center", padding: 10}} className={"Answer"}>{state.quizPlayers[0]}</div>
                    <div style={{backgroundColor: "green", marginLeft: 2, alignItems: "center", display: "flex", justifyContent: "center", padding: 10}} className={"Answer"}>{state.quizPlayers[1]}</div>
                </div>
                <div style={{display: "flex", width: 437, marginLeft: 'auto', marginRight: 'auto', marginBottom: 4}}>
                    <div style={{backgroundColor: "green", marginRight: 2, alignItems: "center", display: "flex", justifyContent: "center", padding: 10}} className={"Answer"}>{state.quizAnswers[0]}</div>
                    <div style={{backgroundColor: "green", marginLeft: 2, alignItems: "center", display: "flex", justifyContent: "center", padding: 10}} className={"Answer"}>{state.quizAnswers[1]}</div>
                </div>
                <div className={"Description"}>
                    {Math.round(state.quizTotalAnswersCorrect / state.quizTotalAnswers * 100)}% answered correctly
                </div>
                <div className={"Field"}>
                    <div className={"FieldRow"}>
                        <div className={"QuestionHeader"}>Leaderboard:</div>
                        {state.quizLeaderboard.map((player: any, index) => {
                            let style: React.CSSProperties = {display: "flex", width: "100%", marginLeft: 'auto', marginRight: 'auto'};
                            if(index !== 0) {
                                style = {...style, borderTop: "1px dotted white", paddingTop: 5};
                            }
                            return (<div key={index} style={style}>
                                <div className={"Question"} style={{flexGrow: 1}}>{player.player}</div>
                                <div className={"Question"}>{Number(player.score).toFixed(3)}</div>
                            </div>);
                        })}
                    </div>
                </div>
                <div className={"GameButton"} onClick={continueToPhase3} aria-disabled={state.waiting}>Continue</div>

                {state.waiting && <div><label>Please Wait...</label></div>}
            </>
        );
    }

    function PlayerPhase4() {
        return (
            <>
                <div className={"HeaderImage"}><img alt="Knowing ME Knowing YOU" src={smltitle} /></div>
                {!state.quizYou && (
                    <>
                        <div className={"Description"}>Who said it? Match the answer with the person who said it. Swap if you think link is wrong.</div>
                        <div className={"Field"}>
                            <div className={"FieldRow"}>
                                <div className={"QuestionHeader"}>Question:</div>
                                <div className={"Question"}>{state.quizQuestion}</div>
                            </div>
                        </div>
                        {state.quizCorrectness &&
                            <div className={"Field"} style={{backgroundColor: 'green', justifyContent: 'center'}}>
                                Correct
                            </div>
                        }
                        {!state.quizCorrectness &&
                            <div className={"Field"} style={{backgroundColor: 'red', justifyContent: 'center'}}>
                                Wrong
                            </div>
                        }
                        <div className={"Field"}>
                            <div className={"FieldRow"}>
                                <div className={"QuestionHeader"}>{state.quizPlayers[0]}</div>
                                <div className={"Question"}>{state.quizAnswers[0]}</div>
                            </div>
                        </div>
                        <div className={"Field"}>
                            <div className={"FieldRow"}>
                                <div className={"QuestionHeader"}>{state.quizPlayers[1]}</div>
                                <div className={"Question"}>{state.quizAnswers[1]}</div>
                            </div>
                        </div>
                    </>
                )}
                {state.quizYou && (
                    <>
                        <div className={"Description"}>Showing answer for a question involving you. Look at the hosts screen.</div>
                    </>
                )}
                {state.waiting && <div><label>Please Wait...</label></div>}
            </>
        );
    }

    function HostPhase5() {
        return (
            <>
                <div className={"HeaderImage"}><img alt="Knowing ME Knowing YOU" src={bigtitle} /></div>
                <div className={"Description"}>Final Leaderboard. Refresh browser to play again.</div>
                <div className={"Field"}>
                    <div className={"FieldRow"}>
                        <div className={"QuestionHeader"}>Leaderboard:</div>
                        {state.quizLeaderboard.map((player: any, index) => {
                            let style: React.CSSProperties = {display: "flex", width: "100%", marginLeft: 'auto', marginRight: 'auto'};
                            if(index !== 0) {
                                style = {...style, borderTop: "1px dotted white", paddingTop: 5};
                            }
                            return (<div key={index} style={style}>
                                <div className={"Question"} style={{flexGrow: 1}}>{player.player}</div>
                                <div className={"Question"}>{Number(player.score).toFixed(3)}</div>
                            </div>);
                        })}
                    </div>
                </div>
                {state.waiting && <div><label>Please Wait...</label></div>}
            </>
        );
    }

    function PlayerPhase5() {
        return (
            <>
                <div className={"HeaderImage"}><img alt="Knowing ME Knowing YOU" src={bigtitle} /></div>
                <div className={"Description"}>Thanks for playing. Refresh to play again.</div>
                {state.waiting && <div><label>Please Wait...</label></div>}
            </>
        );
    }

    switch (state.mode) {
        case modeEnum.Host:
            return (
                <>
                    <div className={"HeaderImage"}><img alt="Knowing ME Knowing YOU" src={smltitle} /></div>
                    <div className={"Field"}>Room Code: {state.roomCode}</div>
                    <div className={"PlayersField"}>
                        <div className={"FieldRow"}>
                            <div>Players</div>
                            <ul>
                                {state.players.map((player, index) => (
                                    <li key={index}>{player}</li>
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
                    <div className={"HeaderImage"}><img alt="Knowing ME Knowing YOU" src={smltitle} /></div>
                    <div className={"Field"}>
                        <div className={"FieldRow"}>
                            <div className={"QuestionHeader"}>Room Code</div>
                            <div className={"Answer"}><input autoFocus type="text" readOnly={state.waiting} value={state.roomCode} onChange={(e) => dispatch({type: SET_ROOM_CODE, payload: { code: e.target.value.toUpperCase().slice(0,4)}})} /></div>
                        </div>
                    </div>
                    <div className={"Field"}>
                        <div className={"FieldRow"}>
                            <div className={"QuestionHeader"}>Full Name</div>
                            <div className={"Answer"}><input type="text" readOnly={state.waiting} value={state.playerName} onChange={(e) => dispatch({type: SET_PLAYER_NAME, payload: { name: e.target.value}})} /></div>
                        </div>
                    </div>
                    <div tabIndex={0} className={"GameButton"} onClick={joinHostGame} onKeyPress={(event) => {if(event.key == "Enter") joinHostGame()}} aria-disabled={state.waiting}>Join Game</div>
                    {state.waiting && <div><label>Please Wait...</label></div>}
                </>
            );
        case modeEnum.JoinedHostGame:
            return (
                <>
                    <div className={"HeaderImage"}><img alt="Knowing ME Knowing YOU" src={smltitle} /></div>
                    <div className={"Field"}>Room Code: {state.roomCode}</div>
                    <div className={"PlayersField"}>
                        <div className={"FieldRow"}>
                            <div>Players</div>
                            <ul>
                                {state.players.map((player, index) => (
                                    <li key={index}>{player}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                    <div><label>Waiting for host to start</label></div>
                    {state.waiting && <div><label>Please Wait...</label></div>}
                </>
            );
        case modeEnum.GameRunningAsHost:
            if (state.phase - 1 >= hostPhases.length) return null;
            return hostPhases[state.phase - 1]();
        case modeEnum.GameRunningAsPlayer:
            if (state.phase - 1 >= playerPhases.length) return null;
            return playerPhases[state.phase - 1]();
        default:
            return (
                <>
                    <div className={"HeaderImage"}><img alt="Knowing ME Knowing YOU" src={bigtitle} /></div>
                    <div className={"GameButton"} onClick={hostGame} aria-disabled={state.waiting}>Host Game</div>
                    <div className={"GameButton"} onClick={joinGame} aria-disabled={state.waiting}>Join Game</div>
                    {state.waiting && <div><label>Please Wait...</label></div>}
                </>
            );
    }
}

export default Game;
