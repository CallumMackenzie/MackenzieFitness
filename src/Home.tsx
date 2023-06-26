import React, { useCallback, useEffect, useState } from "react";
import './App.scss';
import { BodyStats, Distance, DistanceUnit, Mass, MassUnit, TimedEntry, UnitValue, bmi } from "./Model";
import { Firestore, collection, doc, getDoc, setDoc } from "firebase/firestore";
import {
	User, Timeline, ffmi as calculateFFMI, bmi as calculateBMI,
	ffmiNormalized as calculateFFMINormalized
} from "./Model";
import { Button, FormControl, IconButton, InputLabel, MenuItem, Select, SelectChangeEvent, TextField } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import moment from "moment";

const BODY_STATS_COLLECTION_NAME = "body-stats";

const PlusButton = (props: any) => {
	return (<>
		<div {...props}>
			<IconButton aria-label="add" >
				<AddIcon />
			</IconButton>
		</div>
	</>);
};

export const Home = (props: {
	firestore: Firestore,
	user: User
}) => {
	const [bodyStats, setBodyStats] = useState<BodyStats | undefined>(undefined);

	useEffect(() => {
		if (bodyStats) saveBodyStats(props.firestore, props.user, bodyStats);
	}, [bodyStats]);

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
				<Button className="col-2" variant="contained" onClick={() => props.user.signOut()}>
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
	setBodyStats: (b: BodyStats) => any
}) => {
	const bodyStats = props.bodyStats;
	const [weight, setWeight] = useState(bodyStats.bodyweight.latest());
	const [weightUnit, setWeightUnit] = useState(MassUnit.kg);

	const [height, setHeight] = useState(bodyStats.height.latest());
	const [heightUnit, setHeightUnit] = useState(DistanceUnit.cm);
	const [bfPercent, setBfPercent] = useState(bodyStats.bfPercent.latest());
	const [ffmi, setFFMI] = useState<TimedEntry<number> | undefined>(undefined);
	const [normFFMI, setNormFFMI] = useState<TimedEntry<number> | undefined>(undefined);
	const [bmi, setBMI] = useState<TimedEntry<number> | undefined>(undefined);

	// useEffect(() => {
	// 	setHeight(bodyStats.height.latest());
	// 	setWeight(bodyStats.bodyweight.latest());
	// 	setBfPercent(bodyStats.bfPercent.latest());

	// 	const latestHeight = bodyStats.height.latest();
	// 	if (latestHeight) setHeightUnit(latestHeight.value.unit);
	// 	const latestWeight = bodyStats.bodyweight.latest();
	// 	if (latestWeight) setWeightUnit(latestWeight.value.unit);
	// }, [bodyStats]);

	useEffect(() => {
		if (!weight || !height || !bfPercent) {
			setFFMI(undefined);
			setNormFFMI(undefined);
		} else {
			const ffmiCalc = calculateFFMI(weight.value, height.value, bfPercent.value);
			const normFFMICalc = calculateFFMINormalized(weight.value, height.value, bfPercent.value);
			setFFMI(TimedEntry.now(ffmiCalc));
			setNormFFMI(TimedEntry.now(normFFMICalc));
		}
	}, [weight, weightUnit, height, heightUnit, bfPercent]);

	useEffect(() => {
		if (!weight || !height) {
			setBMI(undefined);
		} else {
			const bmiCalc = calculateBMI(weight.value, height.value);
			setBMI(TimedEntry.now(bmiCalc));
		}
	}, [weight, weightUnit, height, heightUnit]);

	return (<>
		<div className="row">
			<h2>Body Statistics</h2>
		</div>
		<WeightView
			weight={weight}
			setWeight={setWeight}
			weightUnit={weightUnit}
			setWeightUnit={setWeightUnit}
			bodyStats={bodyStats}
			setBodyStats={props.setBodyStats} />
		<HeightView
			height={height}
			setHeight={setHeight}
			heightUnit={heightUnit}
			setHeightUnit={setHeightUnit} />
		<BodyFatView setBfPercent={setBfPercent} />
		<div className="row m-1">
			<p className="col">Calculated FFMI: {ffmi?.value.toFixed(2) ?? "N/A"}</p>
			<p className="col">Normalized FFMI: {normFFMI?.value.toFixed(2) ?? "NA"}</p>
		</div>
		<div className="row m-1">
			<p className="col">Calculated BMI: {bmi?.value.toFixed(2) ?? "N/A"}</p>
		</div>
	</>);
}

const BodyFatView = (props: {
	setBfPercent: (n: TimedEntry<number> | undefined) => any
}) => {
	const onBfFieldChange: React.ChangeEventHandler<HTMLInputElement> = v => {
		if (!v.target.value) {
			props.setBfPercent(undefined);
		} else {
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
		<PlusButton className="col-1" />
	</div>);
}

const WeightView = (props: {
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
			const entry = TimedEntry.now(new UnitValue(props.weightUnit, value));
			props.setWeight(entry);
		}
	};

	const onWeightUnitChange: ((event: SelectChangeEvent<string>, child: React.ReactNode) => void) =
		v => {
			const newWeightUnit = MassUnit[v.target.value as keyof typeof MassUnit];
			props.setWeightUnit(newWeightUnit);
			if (props.weight) {
				props.setWeight(TimedEntry.now(new UnitValue(newWeightUnit, props.weight?.value.value)));
			}
		};

	const saveWeight = () => {
		if (props.weight) {
			const nbs = new BodyStats(props.bodyStats);
			nbs.bodyweight.add(props.weight);
			props.setBodyStats(nbs);
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
		<Button className="col-3 mx-2"
			variant="contained"
			disabled={props.weight == undefined}
			onClick={saveWeight}>
			Save
		</Button>
	</div>);
}

const HeightView = (props: {
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
			const entry = TimedEntry.now(new UnitValue(props.heightUnit, value));
			props.setHeight(entry);
		}
	};


	const onHeightUnitChange: ((event: SelectChangeEvent<string>, child: React.ReactNode) => void) =
		v => {
			const newHeightUnit = DistanceUnit[v.target.value as keyof typeof DistanceUnit];
			props.setHeightUnit(newHeightUnit);
			if (props.height) {
				props.setHeight(TimedEntry.now(new UnitValue(newHeightUnit, props.height.value.value)));
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
		<PlusButton className="col-1" />
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