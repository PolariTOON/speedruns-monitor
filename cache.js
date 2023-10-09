import fs from "fs";
import fetch from "node-fetch";
const dates = Object.create(null);
const players = Object.create(null);
const names = Object.create(null);
const games = ["9d3rrxyd", "w6jl2ned"];
const platforms = {
	"lq60nl94": "android",
	"gde3xgek": "ios",
};
for (const gameId of games) {
	try {
		const response = await fetch(`https://www.speedrun.com/api/v1/games/${gameId}/variables`);
		if (!response.ok) {
			throw new Error(response.statusText);
		}
		const {data} = await response.json();
		const versions = data.find((variable) => {
			return variable.name === "Version";
		});
		console.log(`Got versions`);
		await new Promise((resolve) => {
			setTimeout(resolve, 800);
		});
		const slice = 200;
		for (let offset = 0;; offset += slice) {
			const response = await fetch(`https://www.speedrun.com/api/v1/runs?game=${gameId}&orderby=date&direction=asc&embed=players&offset=${offset}&max=${slice}`);
			if (!response.ok) {
				throw new Error(response.statusText);
			}
			const {data, pagination} = await response.json();
			const {size} = pagination;
			if (size === 0) {
				break;
			}
			for (const run of data) {
				const status = run.status.status;
				if (status == null || status === "new") {
					continue;
				}
				dates[run.date] ??= Object.create(null);
				const playerDates = (() => {
					const player = run.players.data[0].rel === "user" ? run.players.data[0].id : "814p2558";
					const name = run.players.data[0].rel === "user" ? run.players.data[0].names.international : "anonymous";
					names[name] ??= player;
					return players[player] ??= Object.create(null);
				})();
				const playerDateRuns = (() => {
					const date = run.date;
					return playerDates[date] ??= [];
				})();
				const gui = run.weblink ?? null;
				const api = run.links[0].uri ?? null;
				const version = versions.values.values[run.values[versions.id]].label ?? null;
				const platform = platforms[run.system.platform] ?? null;
				const comment = (run.comment ?? "").replaceAll("\r\n", "\n").replaceAll(/^\n+|\n+$/g, "").split(/\n{2,}/).filter((paragraph) => {
					return paragraph.startsWith("Moderator's note: ") || paragraph.startsWith("Moderator's note:\n");
				}).map((paragraph) => {
					return paragraph.slice(18);
				}).map((paragraph) => {
					const characters = [...paragraph];
					const firstCharacter = characters.slice(0, 1).join("").toUpperCase();
					const lastCharacters = characters.slice(1).join("");
					return `${firstCharacter}${lastCharacters}`;
				}).join("\n\n") || null;
				const reason = (run.status.reason ?? "").replaceAll("\r\n", "\n").replaceAll(/^\n+|\n+$/g, "").replaceAll(/\n{2,}/g, "\n\n") || null;
				playerDateRuns.push({
					href: status !== "rejected" ? gui : api,
					version: version !== "Select or add one!" ? version : null,
					platform: platform,
					status: status,
					annotation: status !== "rejected" ? comment : reason,
				});
			}
			console.log(`Got runs ${offset}-${offset + size - 1}`);
			await new Promise((resolve) => {
				setTimeout(resolve, 800);
			});
		}
	} catch (error) {
		console.warn(`Error while getting game ${gameId}`);
		throw error;
	}
}
for (const playerDates of Object.values(players)) {
	for (const dateRuns of Object.values(playerDates)) {
		for (const run of dateRuns) {
			if (run.annotation != null) {
				run.annotation = run.annotation.replaceAll(/@[-.0-9A-Z_a-z]+/g, (mention) => {
					return `@${names[mention.slice(1)] ?? "814p2558"}`;
				});
			}
		}
	}
}
try {
	const response = await fetch(`https://raw.githubusercontent.com/SuperBearAdventure/shicka/master/src/bindings/updates.json`);
	if (!response.ok) {
		throw new Error(response.statusText);
	}
	const updates = await response.json();
	for (const update of updates) {
		const {date, name} = update;
		const {android, ios} = date;
		if (android != null) {
			(dates[android] ??= Object.create(null)).android = name
		}
		if (ios != null) {
			(dates[ios] ??= Object.create(null)).ios = name
		}
	}
	console.log(`Got updates`);
	await new Promise((resolve) => {
		setTimeout(resolve, 800);
	});
} catch (error) {
	console.warn(`Error while getting updates`);
	throw error;
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
function sortDatePlatforms(datePlatforms) {
	sort(datePlatforms, (datePlatform) => {
		return datePlatform[0];
	});
	return datePlatforms;
}
function sortPlayers(players) {
	sort(players, (player) => {
		return Object.keys(player[1])[0];
	});
	return players;
}
function sortPlayerDates(playerDates) {
	sort(playerDates, (playerDate) => {
		return playerDate[0];
	});
	return playerDates;
}
function sortPlayerDateRuns(playerDateRuns) {
	sort(playerDateRuns, (playerDateRun) => {
		return playerDateRun.href;
	});
	return playerDateRuns;
}
const sortedDates = Object.fromEntries(sortDates(Object.entries(dates).map(([date, platforms]) => {
	return [
		date,
		Object.fromEntries(sortDatePlatforms(Object.entries(platforms))),
	];
})));
const sortedPlayers = Object.fromEntries(sortPlayers(Object.entries(players).map(([player, dates]) => {
	return [
		player,
		Object.fromEntries(sortPlayerDates(Object.entries(dates).map(([date, runs]) => {
			return [
				date,
				Array.from(sortPlayerDateRuns(Array.from(runs))),
			];
		}))),
	];
})));
await fs.promises.mkdir("cache", {
	recursive: true,
});
await fs.promises.writeFile(`cache/dates.json`, `${JSON.stringify(sortedDates, null, "\t")}\n`);
await fs.promises.writeFile(`cache/players.json`, `${JSON.stringify(sortedPlayers, null, "\t")}\n`);
