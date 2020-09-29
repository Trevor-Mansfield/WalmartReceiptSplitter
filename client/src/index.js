import React from 'react';
import ReactDOM from 'react-dom';
import * as serviceWorker from './serviceWorker';

import "./reset.css";
// import {CostApp} from "./CostApp";
import {CostApp} from "./CostApp";


ReactDOM.render(
    <React.StrictMode>
        {/*<CostApp />*/}
        <CostApp />
    </React.StrictMode>,
    document.getElementById('root')
);


// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
