import React, { useState } from 'react';
import { SignIn } from './SignIn';
import { Home } from './Home'
import { User } from './model/Model';

import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

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
const firestore = getFirestore(app);

const App = () => {
	const [user, setUser] = useState<User | undefined>(undefined);

	if (user == undefined) return (<SignIn setUser={setUser} />);
	else return (<Home firestore={firestore} user={user} />);
}

export default App;
