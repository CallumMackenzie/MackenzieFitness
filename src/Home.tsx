import React, { useCallback, useEffect, useState } from "react";
import './App.scss';
import { BodyStats } from "./Model";
import { Firestore, collection, doc, getDoc, setDoc } from "firebase/firestore";
import { Auth } from "firebase/auth";
import { User } from "./Model";

const BODY_STATS_COLLECTION_NAME = "body-stats";

export const Home = (props: {
	firestore: Firestore,
	user: User
}) => {
	const [loading, setLoading] = useState(false);
	const [bodyStats, setBodyStats] = useState<BodyStats | undefined>(undefined);

	useEffect(() => {
		setLoading(true);
		fetchBodyStats(props.firestore, props.user)
			.then((result) => {
				setLoading(false);
				setBodyStats(result);
			}).catch(e => {
				console.error(e.message);
				props.user.signOut();
			});
	}, []);

	return (<>
		<div className="container d-">
			<div className="d-flex m-2">
				<h2 className="mx-auto">Welcome {props.user.user.displayName}!</h2>
				<button className="col-2 btn btn-primary" onClick={() => props.user.signOut()}>Sign Out</button>
			</div>
			{loading && <div className="row spinner-border mx-auto" role="status" />}
			{!loading && <BodyStatsOverview bodyStats={bodyStats} />}
		</div>
	</>);
}

const BodyStatsOverview = (props: {
	bodyStats: BodyStats | undefined
}) => {
	if (props.bodyStats === undefined) return (<></>);
	else
		return (<>
			<div className="row">
				<h2>Body Statistics</h2>
			</div>
			<div className="row mx-auto">
				{props.bodyStats.bodyweight ? props.bodyStats.bodyweight + " kg" : "No bodyweight set."}
			</div>
			<div className="row mx-auto">
				{props.bodyStats.height ? props.bodyStats.height + " cm" : "No height set."}
			</div>
			<div className="row mx-auto">
				{props.bodyStats.bfPercent ? props.bodyStats.bfPercent + "%" : "No body fat percentage set."}
			</div>
		</>);
}

const fetchBodyStats = async (firestore: Firestore, user: User): Promise<BodyStats> => {
	const docRef = doc(firestore, "body-stats", user.user.uid);
	const docSnap = await getDoc(docRef);
	if (docSnap.exists())
		return docSnap.data() as BodyStats;
	else
		return createUserBodyStats(firestore, user);
}

const createUserBodyStats = async (firestore: Firestore, user: User): Promise<BodyStats> => {
	const bodyStatsRef = collection(firestore, BODY_STATS_COLLECTION_NAME);
	const bodyStats = new BodyStats();
	await setDoc(doc(bodyStatsRef, user.user.uid), JSON.parse(JSON.stringify(bodyStats)));
	return bodyStats;
}