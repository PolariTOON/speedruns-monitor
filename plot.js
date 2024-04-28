import fs from "fs";
import jsdom from "jsdom";
import serialize from "w3c-xmlserializer";
const {JSDOM} = jsdom;
const players = JSON.parse(await fs.promises.readFile("cache/players.json"));
const leaderboards = JSON.parse(await fs.promises.readFile("cache/leaderboards.json"));
const blocks = ["g", "path"];
function indent(element, level, block) {
	if (element == null) {
		return;
	}
	const nextSibling = element.nextElementSibling;
	const stack = [block];
	while (element != null && element !== nextSibling) {
		const block = stack[stack.length - 1];
		if (block) {
			element.before("\t".repeat(level));
			element.after("\n");
		}
		while (element.firstElementChild != null) {
			const block = blocks.includes(element.tagName);
			if (block) {
				++level;
				element.prepend("\n");
			}
			stack.push(block);
			element = element.firstElementChild;
			if (block) {
				element.before("\t".repeat(level));
				element.after("\n");
			}
		}
		while (stack.length !== 1 && element.nextElementSibling == null) {
			element = element.parentElement;
			const block = stack[stack.length - 1];
			if (block) {
				--level;
				element.append("\t".repeat(level));
			}
			stack.pop();
		}
		element = element.nextElementSibling;
	}
}
function sort(array, hash) {
	array.sort((a, b) => {
		const aHash = hash(a);
		const bHash = hash(b);
		if (aHash < bHash) {
			return -1;
		}
		if (aHash > bHash) {
			return 1;
		}
		return 0;
	});
	return array;
}
function sortData(data) {
	sort(data, (datum) => {
		return Object.keys(datum[1])[0];
	});
	return data;
}
function sortDatumDates(datumDates) {
	sort(datumDates, (datumDate) => {
		return datumDate[0];
	});
	return datumDates;
}
function plot(title, data, cumulative, extended, timed) {
	const sortedData = Object.fromEntries(sortData(Object.entries(data).map(([datum, dates]) => {
		return [
			datum,
			Object.fromEntries(sortDatumDates(Object.entries(dates))),
		];
	})));
	let minDate = null;
	let maxDate = null;
	let maxValue = 0;
	for (const datumDates of Object.values(sortedData)) {
		let currentValue = null;
		if (cumulative) {
			currentValue = 0;
		}
		for (const [date, dateValueOrDiff] of Object.entries(datumDates)) {
			if (minDate == null || date.length < minDate.length || date < minDate) {
				minDate = date;
			}
			if (maxDate == null || date.length > maxDate.length || date > maxDate) {
				maxDate = date;
			}
			if (!cumulative) {
				currentValue = dateValueOrDiff;
			} else {
				currentValue += dateValueOrDiff;
				datumDates[date] = currentValue;
			}
			if (currentValue > maxValue) {
				maxValue = currentValue;
			}
		}
	}
	const maxDuration = Math.round((Date.parse(maxDate) - Date.parse(minDate)) / 86400000);
	const {window} = new JSDOM(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${maxDuration} ${maxValue}" preserveAspectRatio="none" lang="en" style="color-scheme: dark light;">
		<title>${title}</title>
		<style>
			svg {
				background: var(--canvas-background);
				fill: var(--canvas-background);
				stroke: var(--canvas-foreground);
				stroke-linejoin: round;
				stroke-linecap: round;
			}
			g &gt; path[tabindex] {
				vector-effect: non-scaling-stroke;
				fill: none;
				stroke: hsl(calc(var(--index) / var(--count) * 360), 50%, 50%);
				cursor: help;
			}
			g:is(:hover, :focus-within) &gt; path[tabindex] {
				stroke: var(--canvas-foreground);
			}
			g &gt; path[tabindex]:is(:hover, :focus-within) {
				outline: 0;
			}
			g &gt; path[tabindex]:first-of-type {
				stroke-width: 2;
			}
			g &gt; path[tabindex]:first-of-type:is(:hover, :focus-within) {
				stroke-width: 4;
			}
			g &gt; path[tabindex]:first-of-type:not(:last-of-type) {
				stroke-dasharray: 4 8;
			}
			g &gt; rect {
				vector-effect: non-scaling-stroke;
				fill: none;
				stroke: none;
				pointer-events: none;
			}
			g &gt; path[tabindex]:first-of-type:is(:hover, :focus-within) + rect {
				fill: var(--highlighted);
			}
			g &gt; path[tabindex]:first-of-type ~ path[tabindex] {
				stroke-width: 8;
			}
			g &gt; path[tabindex]:first-of-type ~ path[tabindex]:is(:hover, :focus-within) {
				stroke-width: 16;
			}
			g &gt; line {
				vector-effect: non-scaling-stroke;
				fill: none;
				stroke: none;
				stroke-width: 2;
				stroke-dasharray: 4 8;
				pointer-events: none;
			}
			g &gt; path[tabindex]:first-of-type:is(:hover, :focus-within) + rect + path[tabindex] + line,
			g &gt; path[tabindex]:first-of-type:is(:hover, :focus-within) + rect + path[tabindex] + line + line,
			g &gt; path[tabindex]:first-of-type:is(:hover, :focus-within) ~ path[tabindex]:last-of-type + line,
			g &gt; path[tabindex]:first-of-type:is(:hover, :focus-within) ~ path[tabindex]:last-of-type + line + line,
			g &gt; path[tabindex]:first-of-type ~ path[tabindex]:is(:hover, :focus-within) + line,
			g &gt; path[tabindex]:first-of-type ~ path[tabindex]:is(:hover, :focus-within) + line + line {
				stroke: var(--faded);
			}
			@media (prefers-color-scheme: dark) {
				:root {
					--canvas-background: #000;
					--canvas-foreground: #ccc;
					--highlighted: #6663;
					--faded: #9993;
				}
			}
			@media (prefers-color-scheme: light) {
				:root {
					--canvas-background: #fff;
					--canvas-foreground: #333;
					--highlighted: #9993;
					--faded: #6663;
				}
			}
		</style>
	</svg>
	`, {
		contentType: "image/svg+xml",
	});
	const {document} = window;
	const svg = document.documentElement;
	const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
	const gCount = Object.keys(sortedData).length;
	g.setAttribute("style", `--count: ${gCount};`);
	let gIndex = 0;
	for (const [datum, datumDates] of Object.entries(sortedData)) {
		const subG = document.createElementNS("http://www.w3.org/2000/svg", "g");
		subG.setAttribute("style", `--index: ${gIndex};`);
		const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
		const d = [];
		let currentValue = null;
		if (extended) {
			currentValue = 0;
			d.push(`M0,${maxValue - currentValue}`);
		}
		const subPaths = [];
		for (const [date, dateValue] of Object.entries(datumDates)) {
			const duration = Math.round((Date.parse(date) - Date.parse(minDate)) / 86400000);
			if (currentValue != null) {
				d.push(`L${duration},${maxValue - currentValue}`);
				currentValue = dateValue;
				d.push(`L${duration},${maxValue - currentValue}`);
			} else {
				currentValue = dateValue;
				d.push(`M${duration},${maxValue - currentValue}`);
			}
			if (timed) {
				const subPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
				subPath.setAttribute("d", `M${duration},${maxValue - currentValue}L${duration},${maxValue - currentValue}`);
				subPath.setAttribute("tabindex", "0");
				const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
				const minutes = `${(currentValue - currentValue % 6000) / 6000}`.padStart(2, "0");
				const seconds = `${(currentValue - currentValue % 100) / 100 % 60}`.padStart(2, "0");
				const centiseconds = `${currentValue % 100}`.padStart(2, "0");
				const time = `${minutes}:${seconds}.${centiseconds}`;
				title.textContent = `${time} on ${date}`;
				subPath.append(title);
				subPaths.push(subPath);
				const horizontalLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
				horizontalLine.setAttribute("x1", "0");
				horizontalLine.setAttribute("y1", `${maxValue - currentValue}`);
				horizontalLine.setAttribute("x2", `${maxDuration}`);
				horizontalLine.setAttribute("y2", `${maxValue - currentValue}`);
				subPaths.push(horizontalLine);
				const verticalLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
				verticalLine.setAttribute("x1", `${duration}`);
				verticalLine.setAttribute("y1", `${maxValue}`);
				verticalLine.setAttribute("x2", `${duration}`);
				verticalLine.setAttribute("y2", "0");
				subPaths.push(verticalLine);
			}
		}
		if (extended) {
			d.push(`L${maxDuration},${maxValue - currentValue}`);
		}
		path.setAttribute("d", d.join(""));
		path.setAttribute("tabindex", "0");
		const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
		title.textContent = datum;
		path.append(title);
		subG.append(path);
		if (timed) {
			const datumDatesEntries = Object.entries(datumDates);
			const [firstDate, firstValue] = datumDatesEntries[0];
			const firstDuration = Math.round((Date.parse(firstDate) - Date.parse(minDate)) / 86400000);
			const [lastDate, lastValue] = datumDatesEntries[datumDatesEntries.length - 1];
			const lastDuration = Math.round((Date.parse(lastDate) - Date.parse(minDate)) / 86400000);
			const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
			rect.setAttribute("x", `${Math.min(firstDuration, lastDuration)}`);
			rect.setAttribute("y", `${maxValue - Math.max(firstValue, lastValue)}`);
			rect.setAttribute("width", `${Math.abs(lastDuration - firstDuration)}`);
			rect.setAttribute("height", `${Math.abs(lastValue - firstValue)}`);
			subG.append(rect);
		}
		for (const subPath of subPaths) {
			subG.append(subPath);
		}
		g.append(subG);
		++gIndex;
	}
	svg.append(g);
	indent(g, 1, true);
	const formattedData = serialize(svg, {
		requireWellFormed: true,
	});
	return formattedData;
}
function plotRunCountByDatum(title, data) {
	const newData = Object.create(null);
	for (const [datum, datumDates] of Object.entries(data)) {
		for (const [date, dateRuns] of Object.entries(datumDates)) {
			for (const run of dateRuns) {
				if (run.status !== "verified") {
					continue;
				}
				const newDatumDates = newData[datum] ??= Object.create(null);
				newDatumDates[date] ??= 0;
				++newDatumDates[date];
			}
		}
	}
	const formattedData = plot(title, newData, true, true, false);
	return formattedData;
}
function plotKeyCountByDatum(title, data, key) {
	const newData = Object.create(null);
	for (const [datum, datumDates] of Object.entries(data)) {
		const values = new Set();
		let currentSize = 0;
		for (const [date, dateRuns] of Object.entries(datumDates)) {
			for (const run of dateRuns) {
				if (run.status !== "verified") {
					continue;
				}
				values.add(run[key]);
				const newDatumDates = newData[datum] ??= Object.create(null);
				newDatumDates[date] ??= 0;
				newDatumDates[date] += values.size - currentSize;
				currentSize = values.size;
			}
		}
	}
	const formattedData = plot(title, newData, true, true, false);
	return formattedData;
}
function plotTimeByDatumKey(title, datumDates, key) {
	const keyData = Object.create(null);
	for (const [date, dateRuns] of Object.entries(datumDates)) {
		for (const run of dateRuns) {
			if (run.status !== "verified") {
				continue;
			}
			const time = run.time;
			const [minutes, seconds, centiseconds] = time.split(/:|\./).map((part) => {
				return Number(part);
			});
			const currentTime = minutes * 6000 + seconds * 100 + centiseconds;
			const minTime = run[key] in keyData ? keyData[run[key]][Object.keys(keyData[run[key]])[Object.keys(keyData[run[key]]).length - 1]] : null;
			if (minTime == null || currentTime < minTime) {
				const datumDates = keyData[run[key]] ??= Object.create(null);
				datumDates[date] ??= Number.POSITIVE_INFINITY;
				datumDates[date] = Math.min(datumDates[date], currentTime);
			}
		}
	}
	if (Object.keys(keyData).length === 0) {
		return null;
	}
	const formattedData = plot(title, keyData, false, false, true);
	return formattedData;
}
function plotRecordCountByPlayer(title, leaderboards) {
	const players = Object.create(null);
	for (const leaderboardDates of Object.values(leaderboards)) {
		let minTime = null;
		let minPlayer = null;
		for (const [date, dateRuns] of Object.entries(leaderboardDates)) {
			for (const run of dateRuns) {
				if (run.status !== "verified") {
					continue;
				}
				const time = run.time;
				const player = run.player;
				if (minTime == null || time.length < minTime.length || time < minTime) {
					if (minPlayer != null) {
						const playerDates = players[minPlayer] ??= Object.create(null);
						playerDates[date] ??= 0;
						--playerDates[date];
					}
					minTime = time;
					minPlayer = player;
					const playerDates = players[minPlayer] ??= Object.create(null);
					playerDates[date] ??= 0;
					++playerDates[date];
				}
			}
		}
	}
	const formattedPlayers = plot(title, players, true, true, false);
	return formattedPlayers;
}
function plotRecordTimeByLeaderboard(title, leaderboards) {
	const newLeaderboards = Object.create(null);
	for (const [leaderboard, leaderboardDates] of Object.entries(leaderboards)) {
		let minTime = null;
		for (const [date, dateRuns] of Object.entries(leaderboardDates)) {
			for (const run of dateRuns) {
				if (run.status !== "verified") {
					continue;
				}
				const time = run.time;
				const [minutes, seconds, centiseconds] = time.split(/:|\./).map((part) => {
					return Number(part);
				});
				const currentTime = minutes * 6000 + seconds * 100 + centiseconds;
				if (minTime == null || currentTime < minTime) {
					const newLeaderboardDates = newLeaderboards[leaderboard] ??= Object.create(null);
					newLeaderboardDates[date] ??= Number.POSITIVE_INFINITY;
					newLeaderboardDates[date] = Math.min(newLeaderboardDates[date], currentTime);
					minTime = currentTime;
				}
			}
		}
	}
	const formattedLeaderboards = plot(title, newLeaderboards, false, false, true);
	return formattedLeaderboards;
}
const formattedRunCountByPlayer = plotRunCountByDatum("Run count by player", players);
const formattedRunCountByLeaderboard = plotRunCountByDatum("Run count by leaderboard", leaderboards);
const formattedLeaderboardCountByPlayer = plotKeyCountByDatum("Leaderboard count by player", players, "leaderboard");
const formattedPlayerCountByLeaderboard = plotKeyCountByDatum("Player count by leaderboard", leaderboards, "player");
const formattedTimeByLeaderboardByPlayer = Object.create(null);
for (const [player, playerDates] of Object.entries(players)) {
	const formattedTimeByLeaderboard = plotTimeByDatumKey(`Time by leaderboard for player ${player}`, playerDates, "leaderboard");
	if (formattedTimeByLeaderboard == null) {
		continue;
	}
	formattedTimeByLeaderboardByPlayer[player] = formattedTimeByLeaderboard;
}
const formattedTimeByPlayerByLeaderboard = Object.create(null);
for (const [leaderboard, leaderboardDates] of Object.entries(leaderboards)) {
	const formattedTimeByPlayer = plotTimeByDatumKey(`Time by player for leaderboard ${leaderboard}`, leaderboardDates, "player");
	if (formattedTimeByPlayer == null) {
		continue;
	}
	formattedTimeByPlayerByLeaderboard[leaderboard] = formattedTimeByPlayer;
}
const formattedRecordCountByPlayer = plotRecordCountByPlayer("Record count by player", leaderboards);
const formattedRecordTimeByLeaderboard = plotRecordTimeByLeaderboard("Record time by leaderboard", leaderboards);
await fs.promises.mkdir("plot", {
	recursive: true,
});
await fs.promises.rm("plot/players", {
	force: true,
	recursive: true,
});
await fs.promises.mkdir("plot/players", {
	recursive: true,
});
await fs.promises.rm("plot/leaderboards", {
	force: true,
	recursive: true,
});
await fs.promises.mkdir("plot/leaderboards", {
	recursive: true,
});
await fs.promises.writeFile(`plot/player-leaderboards.svg`, `${formattedLeaderboardCountByPlayer}\n`);
await fs.promises.writeFile(`plot/leaderboard-players.svg`, `${formattedPlayerCountByLeaderboard}\n`);
await fs.promises.writeFile(`plot/player-runs.svg`, `${formattedRunCountByPlayer}\n`);
await fs.promises.writeFile(`plot/leaderboard-runs.svg`, `${formattedRunCountByLeaderboard}\n`);
for (const [player, formattedTimeByLeaderboard] of Object.entries(formattedTimeByLeaderboardByPlayer)) {
	await fs.promises.writeFile(`plot/players/${player}-leaderboard-times.svg`, `${formattedTimeByLeaderboard}\n`);
}
for (const [leaderboard, formattedTimeByPlayer] of Object.entries(formattedTimeByPlayerByLeaderboard)) {
	await fs.promises.writeFile(`plot/leaderboards/${leaderboard}-player-times.svg`, `${formattedTimeByPlayer}\n`);
}
await fs.promises.writeFile(`plot/player-records.svg`, `${formattedRecordCountByPlayer}\n`);
await fs.promises.writeFile(`plot/leaderboard-records.svg`, `${formattedRecordTimeByLeaderboard}\n`);
