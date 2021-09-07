import React from 'react';
//import {useState, useRef} from 'react';
import './App.css';
import Game from './game';

//import socket from "./socket";

function App() {
    // const [list, setList] = useState<Array<any>>([]);
    // const input = useRef<HTMLInputElement>(null);
    //
    // const onSubmit = (e: any) => {
    //     e.preventDefault();
    //     if (input.current?.value) {
    //         socket.emit('addquestion', input.current.value);
    //         input.current.value = '';
    //     }
    // };

    // socket.on('addquestion', (msg) => {
    //     const newList = [...list, {question: msg}];
    //     setList(newList);
    //     window.scrollTo(0, document.body.scrollHeight);
    // });
    //
    // socket.on('allquestions', (questions) => {
    //     setList(questions);
    //     window.scrollTo(0, document.body.scrollHeight);
    // });

    return (
        <div className="App">
            <Game/>
            {/*<ul id="messages">*/}
            {/*    {list.map((item: any, index) =>*/}
            {/*        <li key={index}>{item.question}</li>*/}
            {/*    )}*/}
            {/*</ul>*/}
            {/*<form id="form" action="" onSubmit={onSubmit}>*/}
            {/*    <input ref={input} id="input" autoComplete="off"/>*/}
            {/*    <button>Send</button>*/}
            {/*</form>*/}
        </div>
    );
}

export default App;
