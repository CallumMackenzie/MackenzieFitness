import { GoogleAuthProvider, UserCredential, signInWithPopup, Auth, OAuthCredential } from "firebase/auth";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

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

export const signInGoogle = (auth: Auth) =>
	signInWithPopup(auth, googleAuthProvider).then(
		(result: UserCredential) =>
			checkOAuthCredential(GoogleAuthProvider.credentialFromResult(result),
				(credential) => {
					const token = credential.accessToken;
					const user = result.user;
				})).catch(handleSignInError);


export const useSignIn = (auth: Auth): boolean | undefined => {
	const navigate = useNavigate();
	const [foundUser, setFoundUser] = useState<boolean | undefined>(undefined);

	auth.onAuthStateChanged(user => {
		if (user) setFoundUser(true);
		else setFoundUser(false);
	});

	return foundUser;
};