import { AssertionError } from "assert";

require("dotenv").config();

export const assert = <T>(value: T, errorMessage: string): NonNullable<T> => {
	if (value) return value as NonNullable<T>;
	throw new AssertionError({ message: errorMessage });
};

const ensureEnv = (key: string): string => {
	return assert(
		process.env[key],
		`${key} is not defined in environment variables`
	);
};

export default {
	EMAIL_USERNAME: ensureEnv("EMAIL_USERNAME"),
	EMAIL_PASSWORD: ensureEnv("EMAIL_PASSWORD"),
};
