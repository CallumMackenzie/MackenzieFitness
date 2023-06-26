
import { Auth, User as FirebaseUser } from "firebase/auth";
import moment, { Moment } from "moment";

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
	readonly bfPercent: Timeline<number>;
	readonly bodyweight: Timeline<Mass>;
	readonly height: Timeline<Distance>;

	constructor(bs: {
		birthDate: number | undefined,
		bfPercent: Timeline<number> | undefined,
		bodyweight: Timeline<Mass> | undefined,
		height: Timeline<Distance> | undefined
	} | any = {}) {
		this.birthDate = bs.birthDate ?? null;
		this.bfPercent = bs.bfPercent ?? new Timeline();
		this.bodyweight = bs.bodyweight ?? new Timeline();
		this.height = bs.height ?? new Timeline();
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

export class TimedEntry<V> {
	moment: Moment;
	value: V;

	constructor(moment: Moment, value: V) {
		this.moment = moment;
		this.value = value;
	}

	static comparator<V>(a: TimedEntry<V>, b: TimedEntry<V>): number {
		return a.moment.diff(b.moment, 'minutes');
	}

	static now<V>(value: V): TimedEntry<V> {
		return new TimedEntry(moment(), value);
	}
}

export class Timeline<V> {
	private values: Array<TimedEntry<V>>;

	constructor(values: Array<TimedEntry<V>> = []) {
		this.values = values;
	}

	length(): number {
		return this.values.length;
	}

	add(entry: TimedEntry<V>) {
		let index = binarySearch(this.values, entry, TimedEntry.comparator);
		if (index < 0) {
			let insertion = -index - 1;
			this.values = [...this.values.slice(0, insertion),
				entry,
			...this.values.slice(insertion)];
		}
	}

	entries(count: number): Array<TimedEntry<V>> {
		return this.values.slice(this.values.length - count);
	}

	latest(): TimedEntry<V> | undefined {
		if (!this.isEmpty())
			return this.entries(1)[0];
		else return undefined;
	}

	isEmpty(): boolean {
		return this.length() == 0;
	}
}

export class Unit {
	convert: number;
	protected constructor(convert: number) {
		this.convert = convert;
	}
}

export class MassUnit extends Unit {
	static kg = new MassUnit(1);
	static lbs = new MassUnit(1 / 2.20462);

	private constructor(convert: number) {
		super(convert);
	}
}

export class DistanceUnit extends Unit {
	static cm = new DistanceUnit(1);
	static m = new DistanceUnit(100);
	static in = new DistanceUnit(2.54);
	static feet = new DistanceUnit(30.48);

	private constructor(c: number) {
		super(c);
	}
}

export class UnitValue<U extends Unit> {
	readonly unit: U;
	readonly value: number;

	constructor(unit: U, value: number) {
		this.unit = unit;
		this.value = value;
	}

	toString(): string {
		return this.value + "";
	}

	to(other: U): UnitValue<U> {
		return new UnitValue(other, this.value * this.unit.convert / other.convert);
	}

	add(other: UnitValue<U>): UnitValue<U> {
		return new UnitValue(this.unit, this.value + other.to(this.unit).value);
	}

	sub(other: UnitValue<U>): UnitValue<U> {
		return new UnitValue(this.unit, this.value - other.to(this.unit).value);
	}

	mult(other: UnitValue<U>): UnitValue<U> {
		return new UnitValue(this.unit, this.value * other.to(this.unit).value);
	}

	div(other: UnitValue<U>): UnitValue<U> {
		return new UnitValue(this.unit, this.value * other.to(this.unit).value);
	}
}

export type Mass = UnitValue<MassUnit>;
export type Distance = UnitValue<DistanceUnit>;

export const ffmi = (bodyweight: Mass, height: Distance, bodyFatPercent: number): number => {
	const bw = bodyweight.to(MassUnit.kg).value;
	const h = height.to(DistanceUnit.m).value;
	const totalBodyFat = bw * bodyFatPercent / 100;
	const leanMass = bw * (1 - bodyFatPercent / 100);
	const ffmi = (leanMass / 2.2) * 2.20462 / (h * h);
	return ffmi;
}

export const ffmiNormalized = (bodyweight: Mass, height: Distance, bodyFatPercent: number): number => {
	let h = height.to(DistanceUnit.m).value;
	const _ffmi = ffmi(bodyweight, height, bodyFatPercent);
	const ffmiNormalized = _ffmi + (6.1 * (1.8 - h));
	return ffmiNormalized;
}

export const bmi = (bodyweight: Mass, height: Distance): number => {
	const bw = bodyweight.to(MassUnit.kg).value;
	const h = height.to(DistanceUnit.m).value;
	const bmi = bw / (h * h);
	return bmi;
}


