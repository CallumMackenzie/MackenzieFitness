import React, { useEffect } from 'react';
import './App.scss';
import { GoogleAuthProvider, UserCredential, getAuth, signInWithPopup, User as FirebaseUser, Auth, OAuthCredential, setPersistence, browserSessionPersistence, signInWithRedirect, signInWithEmailAndPassword, signInWithEmailLink } from "firebase/auth";
import { User } from './Model';

const googleAuthProvider = new GoogleAuthProvider();

const handleSignInError = (error: any) => {
	const errorMessage = error.message;
	const email = error.customData.email;
	if (email != null) {
		alert("Could not sign in " + email + ".");
	}
	console.error(errorMessage);
}

const checkOAuthCredential = (cred: OAuthCredential | null, valid: (cred: OAuthCredential) => any) => {
	if (cred == null) {
		console.error("Credential has no value, but no error was thrown.");
	} else valid(cred);
}

const signInGoogle = (auth: Auth, setUser: (set: User | undefined) => any) =>
	signInWithPopup(auth, googleAuthProvider).then(
		(result: UserCredential) =>
			checkOAuthCredential(GoogleAuthProvider.credentialFromResult(result),
				(credential) => {
					const token = credential.accessToken;
					const user = result.user;
					setUser(new User(auth, user, setUser));
				})).catch(handleSignInError);

export const SignIn = (props: {
	setUser: (user: User | undefined) => any
}) => {
	const auth = getAuth();
	auth.onAuthStateChanged(user => {
		if (user) {
			props.setUser(new User(auth, user, props.setUser));
		}
	});

	return (<div className='container-fluid'>
		<div className="row">
			<header className='mx-auto'>
				<h1 className='m-2'>Welcome to Mackenzie Fitness!</h1>
			</header>
		</div>
		<div className='row'>
			<div className='d-flex justify-content-center'>
				<button className='btn btn-primary m-1' onClick={() => signInGoogle(auth, props.setUser)}>
					Sign in with Google
				</button>
			</div>
		</div>
	</div>);
}