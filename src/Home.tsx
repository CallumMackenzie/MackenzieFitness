import React, { useEffect, useState } from "react";
import {
	Timeline, FitnessCalculator, Unit,
	BodyStats, Distance, DistanceUnit, Mass, MassUnit, TimedEntry, TimedEntryData, UnitValue
} from "./model/Model";
import { Firestore, collection, doc, getDoc, setDoc } from "firebase/firestore";
import { Button, FormControl, InputLabel, MenuItem, Select, SelectChangeEvent, TextField } from "@mui/material";
import { Auth, User } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { useSignIn } from "./model/Account";
import IconButton from '@mui/material/IconButton';
import ShowChart from "@mui/icons-material/ShowChart";

const BODY_STATS_COLLECTION_NAME = "body-stats";

export const Home = (props: {
	auth: Auth,
	firestore: Firestore
}) => {
	const navigate = useNavigate();

	const foundUser = useSignIn(props.auth);
	const [user, setUser] = useState(props.auth.currentUser);
	const [bodyStats, setBodyStats] = useState<BodyStats | undefined>(undefined);

	useEffect(() => {
		setBodyStats(undefined);
		if (user)
			fetchBodyStats(props.firestore, user)
				.then((result) => {
					setBodyStats(result);
				}).catch(e => {
					setBodyStats(undefined);
					console.error(e.message);
					props.auth.signOut();
					navigate("/");
				});
	}, []);

	useEffect(() => {
		if (foundUser === false) navigate("/");
		else if (foundUser === true) setUser(props.auth.currentUser);
	}, [foundUser]);

	if (!user) {
		navigate("/");
		return (<></>);
	} else
		return (<>
			<div className="container d-">
				<div className="d-flex m-2">
					<h2 className="mx-auto">Welcome {user.displayName}!</h2>
					<Button className="col-2"
						variant="contained"
						onClick={() => props.auth.signOut()}>
						Sign Out
					</Button>
				</div>
				{bodyStats == undefined && <div className="row mx-auto m-1">
					<div className="row spinner-border mx-auto" role="status" />
				</div>}
				{bodyStats != undefined &&
					<BodyStatsOverview
						firestore={props.firestore}
						user={user}
						bodyStats={bodyStats!!}
						setBodyStats={setBodyStats} />}
			</div>
		</>);
}

const BodyStatsOverview = (props: {
	firestore: Firestore,
	user: User,
	bodyStats: BodyStats,
	setBodyStats: (b: BodyStats | undefined) => any
}) => {
	const bodyStats = props.bodyStats;
	const [weight, setWeight] = useState(Timeline.latest(bodyStats.bodyweight));
	const [weightUnit, setWeightUnit] = useState(MassUnit.kg);
	const [height, setHeight] = useState(Timeline.latest(bodyStats.height));
	const [heightUnit, setHeightUnit] = useState(DistanceUnit.cm);
	const [bfPercent, setBfPercent] = useState(Timeline.latest(bodyStats.bfPercent));

	const [statsChanged, setStatsChanged] = useState(false);
	const [ffmi, setFFMI] = useState<number | undefined>(undefined);
	const [normFFMI, setNormFFMI] = useState<number | undefined>(undefined);
	const [bmi, setBMI] = useState<number | undefined>(undefined);
	const [leanMass, setLeanMass] = useState<Mass | undefined>(undefined);

	useEffect(() => {
		setWeight(Timeline.latest(bodyStats.bodyweight));
		setHeight(Timeline.latest(bodyStats.height));
		setBfPercent(Timeline.latest(bodyStats.bfPercent));
	}, [bodyStats]);

	useEffect(() => {
		if (!weight || !height || !bfPercent) {
			setFFMI(undefined);
			setNormFFMI(undefined);
		} else {
			const ffmiCalc = FitnessCalculator.ffmi(weight.value, height.value, bfPercent.value);
			const normFFMICalc = FitnessCalculator.ffmiNormalized(weight.value, height.value, bfPercent.value);
			setFFMI(ffmiCalc);
			setNormFFMI(normFFMICalc);
		}
	}, [weight, weightUnit, height, heightUnit, bfPercent]);

	useEffect(() => {
		if (!weight || !height) {
			setBMI(undefined);
		} else {
			const bmiCalc = FitnessCalculator.bmi(weight.value, height.value);
			setBMI(bmiCalc);
		}
	}, [weight, weightUnit, height, heightUnit]);

	useEffect(() => {
		if (!weight || !bfPercent) {
			setLeanMass(undefined);
		} else {
			const leanMassCalc = FitnessCalculator.leanMass(weight.value, bfPercent.value);
			setLeanMass(leanMassCalc);
		}
	}, [weight, weightUnit, bfPercent]);

	return (<>
		<div className="row">
			<h2>Body Statistics</h2>
		</div>
		<WeightView
			bodyStats={bodyStats}
			setStatsChanged={setStatsChanged}
			weight={weight}
			setWeight={setWeight}
			weightUnit={weightUnit}
			setWeightUnit={setWeightUnit}
			setBodyStats={props.setBodyStats} />
		<HeightView
			bodyStats={bodyStats}
			setStatsChanged={setStatsChanged}
			height={height}
			setHeight={setHeight}
			heightUnit={heightUnit}
			setHeightUnit={setHeightUnit} />
		<BodyFatView
			bodyStats={bodyStats}
			setStatsChanged={setStatsChanged}
			setBfPercent={setBfPercent} />
		<div className="row m-1 text-left">
			<p className="col-4">FFMI: {ffmi?.toFixed(2) ?? "NA"}</p>
			<p className="col">Normalized FFMI: {normFFMI?.toFixed(2) ?? "NA"}</p>
		</div>
		<div className="row m-1 text-left">
			<p className="col-4">BMI: {bmi?.toFixed(2) ?? "NA"}</p>
			<p className="col">Lean Mass: {leanMass
				? UnitValue.toString(UnitValue.to(leanMass, weightUnit))
				: "NA"}</p>
		</div>
		<div className="row mx-auto my-1">
			<Button className="col"
				variant="contained"
				disabled={!statsChanged}
				onClick={() => {
					const nbs = new BodyStats(props.bodyStats as any);
					if (bfPercent)
						Timeline.add(nbs.bfPercent, bfPercent);
					if (weight)
						Timeline.add(nbs.bodyweight, weight);
					if (height)
						Timeline.add(nbs.height, height);
					props.setBodyStats(nbs);
					saveBodyStats(props.firestore, props.user, nbs)
						.then(() => console.log("Saved"));
				}}>
				{statsChanged ? "Save" : "No Changes"}
			</Button>
		</div>
		<div className="row mx-auto my-1">
			<Button className="col" variant="contained" >
				Body Stats Graphs
			</Button>
		</div>
	</>);
}

const BodyFatView = (props: {
	setStatsChanged: (n: boolean) => any,
	bodyStats: BodyStats,
	setBfPercent: (n: TimedEntryData<number> | undefined) => any
}) => {
	const onBfFieldChange: React.ChangeEventHandler<HTMLInputElement> = v => {
		if (!v.target.value) {
			props.setBfPercent(undefined);
		} else {
			props.setStatsChanged(true);
			const value = parseFloat(v.target.value);
			const entry = TimedEntry.now(value);
			props.setBfPercent(entry);
		}
	};

	return (<div className="row my-2">
		<TextField className="col mx-1"
			label="Body Fat Percentage"
			type="number"
			defaultValue={Timeline.latest(props.bodyStats.bfPercent)?.value ?? ""}
			onChange={onBfFieldChange} />
	</div>);
}

const WeightView = (props: {
	setStatsChanged: (n: boolean) => any,
	weight: TimedEntryData<Mass> | undefined,
	setWeight: (w: TimedEntryData<Mass> | undefined) => any,
	weightUnit: Unit,
	setWeightUnit: (u: Unit) => any,
	bodyStats: BodyStats,
	setBodyStats: (b: BodyStats) => any,
}) => {
	const onWeightFieldChange: React.ChangeEventHandler<HTMLInputElement> = v => {
		if (!v.target.value) {
			props.setWeight(undefined);
		} else {
			const value = parseFloat(v.target.value);
			const entry = TimedEntry.now({ unit: props.weightUnit, value });
			props.setWeight(entry);
			props.setStatsChanged(true);
		}
	};

	const onWeightUnitChange: ((event: SelectChangeEvent<string>, child: React.ReactNode) => void) =
		v => {
			const newWeightUnit = MassUnit[v.target.value as keyof typeof MassUnit];
			props.setWeightUnit(newWeightUnit);
			if (props.weight) {
				props.setWeight(TimedEntry.now({ unit: newWeightUnit, value: props.weight?.value.value }));
			}
		};

	return (<div className="row my-2">
		<TextField className="col mx-1"
			label="Weight"
			type="number"
			defaultValue={Timeline.latest(props.bodyStats.bodyweight)?.value.value ?? ""}
			onChange={onWeightFieldChange} />
		<FormControl className="col mx-1">
			<InputLabel id="weight-unit-select-label">Unit</InputLabel>
			<Select label="Unit"
				labelId="weight-unit-select-label"
				defaultValue={"kg"}
				onChange={onWeightUnitChange}>
				<MenuItem value={"lbs"}>lbs</MenuItem>
				<MenuItem value={"kg"}>kg</MenuItem>
			</Select>
		</FormControl>
	</div>);
}

const HeightView = (props: {
	bodyStats: BodyStats,
	setStatsChanged: (n: boolean) => any,
	height: TimedEntryData<Distance> | undefined,
	setHeight: (h: TimedEntryData<Distance> | undefined) => any,
	heightUnit: Unit,
	setHeightUnit: (d: Unit) => any
}) => {
	const onHeightFieldChange: React.ChangeEventHandler<HTMLInputElement> = v => {
		if (!v.target.value) {
			props.setHeight(undefined);
		} else {
			const value = parseFloat(v.target.value);
			const entry = TimedEntry.now({ unit: props.heightUnit, value });
			props.setHeight(entry);
			props.setStatsChanged(true);
		}
	};

	const onHeightUnitChange: ((event: SelectChangeEvent<string>, child: React.ReactNode) => void) =
		v => {
			const newHeightUnit = DistanceUnit[v.target.value as keyof typeof DistanceUnit];
			props.setHeightUnit(newHeightUnit);
			if (props.height) {
				props.setHeight(TimedEntry.now({ unit: newHeightUnit, value: props.height.value.value }));
			}
		};

	return (<div className="row my-2">
		<TextField className="col mx-1"
			label="Height"
			type="number"
			defaultValue={Timeline.latest(props.bodyStats.height)?.value.value ?? ""}
			onChange={onHeightFieldChange} />
		<FormControl className="col mx-1">
			<InputLabel id="height-unit-select-label">Unit</InputLabel>
			<Select label="Unit"
				labelId="height-unit-select-label"
				defaultValue={"cm"}
				onChange={onHeightUnitChange}>
				<MenuItem value={"cm"}>cm</MenuItem>
				<MenuItem value={"m"}>m</MenuItem>
			</Select>
		</FormControl>
	</div>);
}

const fetchBodyStats = async (firestore: Firestore, user: User): Promise<BodyStats> => {
	const docRef = doc(firestore, "body-stats", user.uid);
	const docSnap = await getDoc(docRef);
	if (docSnap.exists()) {
		let data = docSnap.data();
		return new BodyStats(data);
	}
	else return createUserBodyStats(firestore, user);
}

const saveBodyStats = async (firestore: Firestore, user: User, bodyStats: BodyStats): Promise<void> => {
	const bodyStatsRef = collection(firestore, BODY_STATS_COLLECTION_NAME);
	return await setDoc(doc(bodyStatsRef, user.uid), JSON.parse(JSON.stringify(bodyStats)));
}

const createUserBodyStats = async (firestore: Firestore, user: User): Promise<BodyStats> => {
	const bodyStats = new BodyStats();
	await saveBodyStats(firestore, user, bodyStats);
	return bodyStats;
}