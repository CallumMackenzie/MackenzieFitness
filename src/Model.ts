
import { Auth, User as FirebaseUser } from "firebase/auth";
import { Moment } from "moment";

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
	birthDate: number | null = null;
	bfPercent: number | null = null;
	bodyweight: number | null = null;
	height: number | null = null;
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
}

export class Timeline<V> {
	private values: Array<TimedEntry<V>> = [];

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
}