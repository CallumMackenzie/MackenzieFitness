
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
	readonly convert: number;
	readonly fullName: string;
	readonly shortName: string;
	protected constructor(fullName: string, shortName: string, convert: number) {
		this.convert = convert;
		this.fullName = fullName;
		this.shortName = shortName;
	}

	toString(): string {
		return this.shortName;
	}
}

export class MassUnit extends Unit {
	static kg = new MassUnit("kilograms", "kg", 1);
	static lbs = new MassUnit("pounds", "lbs", 1 / 2.20462);

	private constructor(fullName: string,
		shortName: string,
		convert: number) {
		super(fullName, shortName, convert);
	}
}

export class DistanceUnit extends Unit {
	static cm = new DistanceUnit("centimeters", "cm", 1);
	static m = new DistanceUnit("meters", "m", 100);
	static in = new DistanceUnit("inches", "in", 2.54);
	static feet = new DistanceUnit("feet", "ft", 30.48);

	private constructor(fn: string, sn: string, c: number) {
		super(fn, sn, c);
	}
}

export abstract class UnitValue<S extends UnitValue<S, U>, U extends Unit> {
	readonly unit: U;
	readonly value: number;

	constructor(unit: U, value: number) {
		this.unit = unit;
		this.value = value;
	}

	equals(other: S): boolean {
		const o = other.to(this.unit);
		return this.value - o.value< 0.001;
	}

	toString(): string {
		return this.value.toFixed(2) + " " + this.unit;
	}

	abstract new(unit: U, value: number): S;

	to(other: U): S {
		return this.new(other, this.value * this.unit.convert / other.convert);
	}

	add(other: S): S {
		return this.new(this.unit, this.value + other.to(this.unit).value);
	}

	sub(other: S): S {
		return this.new(this.unit, this.value - other.to(this.unit).value);
	}

	mult(other: S): S {
		return this.new(this.unit, this.value * other.to(this.unit).value);
	}

	div(other: S): S {
		return this.new(this.unit, this.value * other.to(this.unit).value);
	}
}


export class Mass extends UnitValue<Mass, MassUnit> {
	constructor(u: MassUnit, n: number) {
		super(u, n);
	}

	new: (u: MassUnit, n: number) => Mass = (u, n) => new Mass(u, n);

	kg(): Mass { return this.to(MassUnit.kg); }

	lbs(): Mass { return this.to(MassUnit.lbs); }

	static kg(n: number): Mass { return new Mass(MassUnit.kg, n) };
}

export class Distance extends UnitValue<Distance, DistanceUnit> {
	constructor(u: DistanceUnit, n: number) {
		super(u, n);
	}

	m(): Distance { return this.to(DistanceUnit.m); }

	new: (u: DistanceUnit, n: number) => Distance = (u, n) => new Distance(u, n);
}

export const ffmi = (bodyweight: Mass, height: Distance, bodyFatPercent: number): number => {
	const h = height.m().value;
	const leanMassKg = leanMass(bodyweight, bodyFatPercent).kg().value;
	const ffmi = (leanMassKg / 2.2) * 2.20462 / (h * h);
	return ffmi;
}

export const ffmiNormalized = (bodyweight: Mass, height: Distance, bodyFatPercent: number): number => {
	let h = height.m().value;
	const _ffmi = ffmi(bodyweight, height, bodyFatPercent);
	const ffmiNormalized = _ffmi + (6.1 * (1.8 - h));
	return ffmiNormalized;
}

export const bmi = (bodyweight: Mass, height: Distance): number => {
	const bw = bodyweight.kg().value;
	const h = height.m().value;
	const bmi = bw / (h * h);
	return bmi;
}

export const leanMass = (bodyweight: Mass, bfPercent: number): Mass => {
	const bwKg = bodyweight.kg().value;
	const leanMass = bwKg * (1 - bfPercent / 100);
	return Mass.kg(leanMass);
}

export const fatMass = (bodyweight: Mass, bfPercent: number): Mass => {
	const bwKg = bodyweight.kg().value;
	const fatMass = bwKg * bfPercent / 100;
	return Mass.kg(fatMass);
}