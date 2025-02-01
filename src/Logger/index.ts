import type { FileSink } from "bun";
import stripAnsi from "strip-ansi";

/**
 * An object to help log data.
 * The logger always writes to the process output. */
export default class Logger {
	private errorMirror: FileSink;
	private standardMirror: FileSink;

	constructor(errorLogPath: string, standardLogPath: string) {
		this.errorMirror = Bun.file(errorLogPath).writer();
		this.standardMirror = Bun.file(standardLogPath).writer();
	}

	private intoString(prefix: string, ...data: unknown[]): string {
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

	info(...data: unknown[]) {
		console.log(...data);
		this.standardMirror.write(this.intoString("info", ...data));
	}

	error(...data: unknown[]) {
		console.error(...data);
		this.errorMirror.write(this.intoString("err", ...data));
	}

	warn(...data: unknown[]) {
		console.warn(...data);
		this.errorMirror.write(this.intoString("warn", ...data));
	}

	debug(...data: unknown[]) {
		console.debug(...data);
		this.standardMirror.write(this.intoString("debug", ...data));
	}

	trace() {
		console.trace();
		this.errorMirror.write(this.intoString("trace", new Error().stack));
	}

	end() {
		this.errorMirror.end();
		this.standardMirror.end();
	}
}
