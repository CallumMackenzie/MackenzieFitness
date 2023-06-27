import React, { useState } from 'react';
import { Button } from '@mui/material';
import { GoogleAuthProvider, UserCredential, getAuth, signInWithPopup, Auth, OAuthCredential } from "firebase/auth";
import { User } from './model/Model';

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
	const [foundUser, setFoundUser] = useState<boolean | undefined>(undefined);

	const auth = getAuth();
	auth.onAuthStateChanged(user => {
		if (user)
			props.setUser(new User(auth, user, props.setUser));
		else
			setFoundUser(false);
	});

	return (<div className='container-fluid'>
		<div className="row">
			<h1 className='col mx-auto text-center'>Welcome to Mackenzie Fitness!</h1>
		</div>
		<div className='row'>
			<div className='d-flex justify-content-center'>
				<Button variant="contained"
					disabled={foundUser ?? true}
					onClick={() => signInGoogle(auth, props.setUser)}>
					Sign in with Google
				</Button>
			</div>
		</div>
	</div>);
}