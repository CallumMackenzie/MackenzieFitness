import React, { useEffect, useState } from 'react';
import { Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Auth } from 'firebase/auth';
import { signInGoogle, useSignIn } from "../model/Account";

export const SignIn = (props: {
	auth: Auth
}) => {
	const foundUser = useSignIn(props.auth);
	const navigate = useNavigate();

	useEffect(() => {
		if (foundUser) navigate("home");
	}, [foundUser]);

	return (<div className='container-fluid'>
		<div className="row">
			<h1 className='col mx-auto text-center'>Welcome to Mackenzie Fitness!</h1>
		</div>
		<div className='row'>
			<div className='d-flex justify-content-center'>
				<Button variant="contained"
					disabled={foundUser ?? true}
					onClick={() => signInGoogle(props.auth)}>
					Sign in with Google
				</Button>
			</div>
			{(foundUser === true) &&
				<div className="row mx-auto m-2 text-center">
					<p className='col'>Signing in now ...</p>
				</div>}
		</div>
	</div>);
}