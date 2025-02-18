/**
 * The logger always writes to the process output. */

import stripAnsi from "strip-ansi";

const ERROR_LOG_FILENAME = "err.log";
const STANDARD_LOG_FILENAME = "out.log";

const errorMirror = Bun.file(ERROR_LOG_FILENAME).writer();
const standardMirror = Bun.file(STANDARD_LOG_FILENAME).writer();

function intoString(prefix: string, ...data: unknown[]): string {
	const content = (() => {
		if (data.length === 1 && typeof data[0] === "string") {
			return stripAnsi(data[0]);
		}
		return String(data);
	})();

	const lines = content.split("\n");
	const formatted = lines
		.map((line) => `[${prefix}] [${new Date().toLocaleString()}] ${line}\n`)
		.join("\n");
	return formatted;
}

export function info(...data: unknown[]) {
	console.log(...data);
	standardMirror.write(intoString("info", ...data));
}

export function error(...data: unknown[]) {
	console.error(...data);
	errorMirror.write(intoString("err", ...data));
}

export function warn(...data: unknown[]) {
	console.warn(...data);
	errorMirror.write(intoString("warn", ...data));
}

export function debug(...data: unknown[]) {
	console.debug(...data);
	standardMirror.write(intoString("debug", ...data));
}

export function trace() {
	console.trace();
	errorMirror.write(intoString("trace", new Error().stack));
}

export function end() {
	errorMirror.end();
	standardMirror.end();
}
