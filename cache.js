import fs from "fs";
import fetch from "node-fetch";
const dates = Object.create(null);
const players = Object.create(null);
const games = ["9d3rrxyd", "w6jl2ned"];
const platforms = {
	"lq60nl94": "android",
	"gde3xgek": "ios",
};
for (const gameId of games) {
	const response = await fetch(`https://www.speedrun.com/api/v1/games/${gameId}/variables`);
	const {data} = await response.json();
	const version = data.find((variable) => {
		return variable.name === "Version";
	});
	console.log(`Got versions`);
	await new Promise((resolve) => {
		setTimeout(resolve, 800);
	});
	const slice = 200;
	for (let offset = 0;; offset += slice) {
		const response = await fetch(`https://www.speedrun.com/api/v1/runs?game=${gameId}&status=verified&orderby=date&direction=asc&offset=${offset}&max=${slice}`);
		const {data, pagination} = await response.json();
		const {size} = pagination;
		if (size === 0) {
			break;
		}
		for (const run of data) {
			dates[run.date] ??= Object.create(null);
			const player = (() => {
				const player = run.players[0].rel === "user" ? run.players[0].id : "814p2558";
				return players[player] ??= {
					arrival: null,
					dates: Object.create(null),
				};
			})();
			const date = (() => {
				const {date} = run;
				const {dates} = player;
				if (player.arrival == null || player.arrival > date) {
					player.arrival = date;
				}
				return dates[date] ??= [];
			})();
			const href = run.weblink;
			const textContent = version.values.values[run.values[version.id]].label;
			const platform = platforms[run.system.platform];
			date.push({
				href: href,
				textContent: textContent !== "< 1.9.6" && textContent !== "Select or add one!" ? textContent : "",
				platform: platform,
			});
		}
		console.log(`Got runs ${offset}-${offset + size - 1}`);
		await new Promise((resolve) => {
			setTimeout(resolve, 800);
		});
	}
}
const response = await fetch(`https://raw.githubusercontent.com/SuperBearAdventure/shicka/master/src/bindings/updates.json`);
const updates = await response.json();
for (const update of updates) {
	const {date, name} = update;
	const {android, ios} = date;
	if (android != null) {
		(dates[android] ??= Object.create(null)).android ??= name
	}
	if (ios != null) {
		(dates[ios] ??= Object.create(null)).ios ??= name
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
function sortDates(dates) {
	sort(dates, (date) => {
		return date[0];
	});
	return dates;
}
function sortPlayers(players) {
	sort(players, (player) => {
		return player[1].arrival;
	});
	return players;
}
const sortedDates = Object.fromEntries(sortDates(Object.entries(dates)));
const sortedPlayers = Object.fromEntries(sortPlayers(Object.entries(players)));
await fs.promises.mkdir("cache", {
	recursive: true,
});
await fs.promises.writeFile(`cache/dates.json`, `${JSON.stringify(sortedDates, null, "\t")}\n`);
await fs.promises.writeFile(`cache/players.json`, `${JSON.stringify(sortedPlayers, null, "\t")}\n`);
