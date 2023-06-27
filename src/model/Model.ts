
import { Auth, User as FirebaseUser } from "firebase/auth";
import moment from "moment";

export class User {
	user: FirebaseUser;
	auth: Auth;
	setUser: (user: User | undefined) => any;

	constructor(auth: Auth, user: FirebaseUser, setUser: (user: User | undefined) => any) {
		this.user = user;
		this.auth = auth;
		this.setUser = setUser;
	}

	signOut() {
		this.auth.signOut();
		this.setUser(undefined);
	}
}

export class BodyStats {
	birthDate: number | null;
	readonly bfPercent: TimelineData<number>;
	readonly bodyweight: TimelineData<Mass>;
	readonly height: TimelineData<Distance>;

	constructor(bs: {
		birthDate?: number,
		bfPercent?: TimelineData<number>,
		bodyweight?: TimelineData<Mass>,
		height?: TimelineData<Distance>
	} | any = {}) {
		this.birthDate = bs.birthDate ?? null;
		this.bfPercent = bs.bfPercent ?? {};
		this.bodyweight = bs.bodyweight ?? {};
		this.height = bs.height ?? {};
	}
}

/* Adapted from https://stackoverflow.com/questions/22697936/binary-search-in-javascript */
const binarySearch = <T>(arr: Array<T>, el: T, compare_fn: (a: T, b: T) => number): number => {
	let m = 0;
	let n = arr.length - 1;
	while (m <= n) {
		let k = (n + m) >> 1;
		let cmp = compare_fn(el, arr[k]);
		if (cmp > 0) {
			m = k + 1;
		} else if (cmp < 0) {
			n = k - 1;
		} else {
			return k;
		}
	}
	return ~m;
}

export type TimedEntryData<V> = {
	moment: string,
	value: V
}

export const TimedEntry = {
	comparator<V>(a: TimedEntryData<V>, b: TimedEntryData<V>): number {
		return moment(a.moment).diff(b.moment, 'seconds');
	},
	now<V>(value: V): TimedEntryData<V> {
		return { moment: moment().toJSON(), value };
	}
}

export type TimelineData<V> = {
	values: Array<TimedEntryData<V>>;
}

export const Timeline = {
	size<V>(data: TimelineData<V>): number {
		if (!data.values)
			return 0;
		return data.values.length;
	},
	add<V>(data: TimelineData<V>, entry: TimedEntryData<V>) {
		if (!data.values) {
			data.values = [entry];
			return;
		}
		let index = binarySearch(data.values, entry, TimedEntry.comparator<V>);
		if (index < 0) {
			let insertion = -index - 1;
			data.values = [...data.values.slice(0, insertion),
				entry,
			...data.values.slice(insertion)];
		}
	},
	entries<V>(data: TimelineData<V>, count: number): Array<TimedEntryData<V>> {
		return data.values.slice(data.values.length - count);
	},
	latest<V>(data: TimelineData<V>): TimedEntryData<V> | undefined {
		if (!Timeline.isEmpty(data))
			return Timeline.entries(data, 1)[0];
		else return undefined;
	},
	isEmpty<V>(data: TimelineData<V>): boolean {
		return Timeline.size(data) == 0;
	}
}

export type Unit = {
	convert: number,
	fullName: string,
	shortName: string
}

export const MassUnit: { kg: Unit, lbs: Unit } = {
	kg: { convert: 1, fullName: "kilograms", shortName: "kg" },
	lbs: { convert: 1 / 2.20462, fullName: "pounds", shortName: "lbs" }
}

export const DistanceUnit: { cm: Unit, m: Unit, in: Unit, feet: Unit } = {
	cm: { fullName: "centimeters", shortName: "cm", convert: 1 },
	m: { fullName: "meters", shortName: "m", convert: 100 },
	in: { fullName: "inches", shortName: "in", convert: 2.54 },
	feet: { fullName: "feet", shortName: "ft", convert: 30.48 }
}

export type UnitValue = {
	unit: Unit,
	value: number
}

export const UnitValue = {
	to(x: UnitValue, other: Unit): UnitValue {
		return { unit: other, value: x.value * x.unit.convert / other.convert };
	},
	toString(x: UnitValue): string {
		return x.value.toFixed(2) + " " + x.unit.shortName;
	}
}

export type Mass = UnitValue;

export const Mass = {
	toKg(x: Mass): Mass { return UnitValue.to(x, MassUnit.kg); },
	toLbs(x: Mass): Mass { return UnitValue.to(x, MassUnit.lbs); },
	kg(n: number): Mass { return { unit: MassUnit.kg, value: n } },
	lbs(n: number): Mass { return { unit: MassUnit.lbs, value: n } }
}

export type Distance = UnitValue;

export const Distance = {
	toM(x: Distance): Distance { return UnitValue.to(x, DistanceUnit.m); }
}

export const FitnessCalculator = {
	ffmi(bodyweight: Mass, height: Distance, bodyFatPercent: number): number {
		const h = Distance.toM(height).value;
		const leanMassKg = Mass.toKg(FitnessCalculator.leanMass(bodyweight, bodyFatPercent)).value;
		const ffmi = (leanMassKg / 2.2) * 2.20462 / (h * h);
		return ffmi;
	},
	ffmiNormalized(bodyweight: Mass, height: Distance, bodyFatPercent: number): number {
		let h = Distance.toM(height).value;
		const _ffmi = FitnessCalculator.ffmi(bodyweight, height, bodyFatPercent);
		const ffmiNormalized = _ffmi + (6.1 * (1.8 - h));
		return ffmiNormalized;
	},
	bmi(bodyweight: Mass, height: Distance): number {
		const bw = Mass.toKg(bodyweight).value;
		const h = Distance.toM(height).value;
		const bmi = bw / (h * h);
		return bmi;
	},
	leanMass(bodyweight: Mass, bfPercent: number): Mass {
		const bwKg = Mass.toKg(bodyweight).value;
		const leanMass = bwKg * (1 - bfPercent / 100);
		return Mass.kg(leanMass);
	},
	fatMass(bodyweight: Mass, bfPercent: number): Mass {
		const bwKg = Mass.toKg(bodyweight).value;
		const fatMass = bwKg * bfPercent / 100;
		return Mass.kg(fatMass);
	}
}
