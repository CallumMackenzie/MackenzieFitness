import React, { useCallback, useEffect, useState } from "react";
import './App.scss';
import { BodyStats, Distance, DistanceUnit, Mass, MassUnit, TimedEntry, UnitValue, bmi } from "./Model";
import { Firestore, collection, doc, getDoc, setDoc } from "firebase/firestore";
import {
	User, Timeline, ffmi as calculateFFMI, bmi as calculateBMI,
	ffmiNormalized as calculateFFMINormalized, leanMass as calculateLeanMass
} from "./Model";
import { Button, FormControl, InputLabel, MenuItem, Select, SelectChangeEvent, TextField } from "@mui/material";

const BODY_STATS_COLLECTION_NAME = "body-stats";


export const Home = (props: {
	firestore: Firestore,
	user: User
}) => {
	const [bodyStats, setBodyStats] = useState<BodyStats | undefined>(undefined);

	useEffect(() => {
		setBodyStats(undefined);
		fetchBodyStats(props.firestore, props.user)
			.then((result) => {
				setBodyStats(result);
			}).catch(e => {
				setBodyStats(undefined);
				console.error(e.message);
				props.user.signOut();
			});
	}, []);

	return (<>
		<div className="container d-">
			<div className="d-flex m-2">
				<h2 className="mx-auto">Welcome {props.user.user.displayName}!</h2>
				<Button className="col-2"
					variant="contained"
					onClick={() => props.user.signOut()}>
					Sign Out
				</Button>
			</div>
			{bodyStats == undefined && <div className="row spinner-border mx-auto" role="status" />}
			{bodyStats != undefined &&
				<BodyStatsOverview bodyStats={bodyStats!!}
					setBodyStats={setBodyStats} />}
		</div>
	</>);
}

const BodyStatsOverview = (props: {
	bodyStats: BodyStats,
	setBodyStats: (b: BodyStats | undefined) => any
}) => {
	const bodyStats = props.bodyStats;
	const [weight, setWeight] = useState(bodyStats.bodyweight.latest());
	const [weightUnit, setWeightUnit] = useState(MassUnit.kg);
	const [height, setHeight] = useState(bodyStats.height.latest());
	const [heightUnit, setHeightUnit] = useState(DistanceUnit.cm);
	const [bfPercent, setBfPercent] = useState(bodyStats.bfPercent.latest());

	const [statsChanged, setStatsChanged] = useState(false);
	const [ffmi, setFFMI] = useState<number | undefined>(undefined);
	const [normFFMI, setNormFFMI] = useState<number | undefined>(undefined);
	const [bmi, setBMI] = useState<number | undefined>(undefined);
	const [leanMass, setLeanMass] = useState<Mass | undefined>(undefined);

	useEffect(() => {
		if (!weight || !height || !bfPercent) {
			setFFMI(undefined);
			setNormFFMI(undefined);
		} else {
			const ffmiCalc = calculateFFMI(weight.value, height.value, bfPercent.value);
			const normFFMICalc = calculateFFMINormalized(weight.value, height.value, bfPercent.value);
			setFFMI(ffmiCalc);
			setNormFFMI(normFFMICalc);
		}
	}, [weight, weightUnit, height, heightUnit, bfPercent]);

	useEffect(() => {
		if (!weight || !height) {
			setBMI(undefined);
		} else {
			const bmiCalc = calculateBMI(weight.value, height.value);
			setBMI(bmiCalc);
		}
	}, [weight, weightUnit, height, heightUnit]);

	useEffect(() => {
		if (!weight || !bfPercent) {
			setLeanMass(undefined);
		} else {
			const leanMassCalc = calculateLeanMass(weight.value, bfPercent.value);
			setLeanMass(leanMassCalc);
		}
	}, [weight, weightUnit, bfPercent]);

	return (<>
		<div className="row">
			<h2>Body Statistics</h2>
		</div>
		<WeightView
			setStatsChanged={setStatsChanged}
			weight={weight}
			setWeight={setWeight}
			weightUnit={weightUnit}
			setWeightUnit={setWeightUnit}
			bodyStats={bodyStats}
			setBodyStats={props.setBodyStats} />
		<HeightView
			setStatsChanged={setStatsChanged}
			height={height}
			setHeight={setHeight}
			heightUnit={heightUnit}
			setHeightUnit={setHeightUnit} />
		<BodyFatView
			setStatsChanged={setStatsChanged}
			setBfPercent={setBfPercent} />
		<div className="row m-1">
			<p className="col">FFMI: {ffmi?.toFixed(2) ?? "NA"}</p>
			<p className="col">Normalized FFMI: {normFFMI?.toFixed(2) ?? "NA"}</p>
		</div>
		<div className="row m-1">
			<p className="col">BMI: {bmi?.toFixed(2) ?? "NA"}</p>
			<p className="col">Lean Mass: {leanMass?.to(weightUnit).toString() ?? "NA"}</p>
		</div>
		<div className="row mx-auto">
			<Button className="col"
				variant="contained"
				disabled={!statsChanged}
				onClick={() => {
				}}>
				{statsChanged ? "Save" : "No Changes"}
			</Button>
		</div>
	</>);
}

const BodyFatView = (props: {
	setStatsChanged: (n: boolean) => any,
	setBfPercent: (n: TimedEntry<number> | undefined) => any
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

	return (<div className="row m-2">
		<TextField className="col"
			label="Body Fat Percentage"
			type="number"
			onChange={onBfFieldChange} />
	</div>);
}

const WeightView = (props: {
	setStatsChanged: (n: boolean) => any,
	weight: TimedEntry<Mass> | undefined,
	setWeight: (w: TimedEntry<Mass> | undefined) => any,
	weightUnit: MassUnit,
	setWeightUnit: (u: MassUnit) => any,
	bodyStats: BodyStats,
	setBodyStats: (b: BodyStats) => any,
}) => {

	const onWeightFieldChange: React.ChangeEventHandler<HTMLInputElement> = v => {
		if (!v.target.value) {
			props.setWeight(undefined);
		} else {
			const value = parseFloat(v.target.value);
			const entry = TimedEntry.now(new Mass(props.weightUnit, value));
			props.setWeight(entry);
			props.setStatsChanged(true);
		}
	};

	const onWeightUnitChange: ((event: SelectChangeEvent<string>, child: React.ReactNode) => void) =
		v => {
			const newWeightUnit = MassUnit[v.target.value as keyof typeof MassUnit];
			props.setWeightUnit(newWeightUnit);
			if (props.weight) {
				props.setWeight(TimedEntry.now(new Mass(newWeightUnit, props.weight?.value.value)));
			}
		};

	return (<div className="row m-2">
		<TextField className="col"
			label="Weight"
			type="number"
			onChange={onWeightFieldChange} />
		<FormControl className="col">
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
	setStatsChanged: (n: boolean) => any,
	height: TimedEntry<Distance> | undefined,
	setHeight: (h: TimedEntry<Distance> | undefined) => any,
	heightUnit: DistanceUnit,
	setHeightUnit: (d: DistanceUnit) => any
}) => {
	const onHeightFieldChange: React.ChangeEventHandler<HTMLInputElement> = v => {
		if (!v.target.value) {
			props.setHeight(undefined);
		} else {
			const value = parseFloat(v.target.value);
			const entry = TimedEntry.now(new Distance(props.heightUnit, value));
			props.setHeight(entry);
			props.setStatsChanged(true);
		}
	};

	const onHeightUnitChange: ((event: SelectChangeEvent<string>, child: React.ReactNode) => void) =
		v => {
			const newHeightUnit = DistanceUnit[v.target.value as keyof typeof DistanceUnit];
			props.setHeightUnit(newHeightUnit);
			if (props.height) {
				props.setHeight(TimedEntry.now(new Distance(newHeightUnit, props.height.value.value)));
			}
		};

	return (<div className="row m-2">
		<TextField className="col"
			label="Height"
			type="number"
			onChange={onHeightFieldChange} />
		<FormControl className="col">
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
	const docRef = doc(firestore, "body-stats", user.user.uid);
	const docSnap = await getDoc(docRef);
	if (docSnap.exists()) {
		let data = docSnap.data();
		return {
			birthDate: data['birthDate'] ?? null,
			bfPercent: new Timeline(data['bfPercent']?.values ?? []),
			bodyweight: new Timeline(data['bodyweight']?.values ?? []),
			height: new Timeline(data['height']?.values ?? [])
		};
	}
	else return createUserBodyStats(firestore, user);
}

const saveBodyStats = async (firestore: Firestore, user: User, bodyStats: BodyStats): Promise<void> => {
	const bodyStatsRef = collection(firestore, BODY_STATS_COLLECTION_NAME);
	await setDoc(doc(bodyStatsRef, user.user.uid), JSON.parse(JSON.stringify(bodyStats)));
}

const createUserBodyStats = async (firestore: Firestore, user: User): Promise<BodyStats> => {
	const bodyStats = new BodyStats();
	await saveBodyStats(firestore, user, bodyStats);
	return bodyStats;
}