import React from 'react';
import './App.scss';

import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
	apiKey: process.env.REACT_APP_apiKey,
	authDomain: process.env.REACT_APP_authDomain,
	projectId: process.env.REACT_APP_projectId,
	storageBucket: process.env.REACT_APP_storageBucket,
	messagingSenderId: process.env.REACT_APP_messagingSenderId,
	appId: process.env.REACT_APP_appId,
	measurementId: process.env.REACT_APP_measurementId
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

const App = () => {
	return (<div className='container-fluid'>
		<div className="row">
			<header>
				<h1>Welcome to Mackenzie Fitness!</h1>
			</header>
		</div>
		<div className='row'>
		</div>
		<div className='row'>
		</div>
	</div>);
}

export default App;
