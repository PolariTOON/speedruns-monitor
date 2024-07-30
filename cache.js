import fs from "fs";
import fetch from "node-fetch";
const dates = Object.create(null);
const players = Object.create(null);
const playersById = Object.create(null);
const playersByName = Object.create(null);
const leaderboards = Object.create(null);
const leaderboardsById = Object.create(null);
const leaderboardsByName = Object.create(null);
const games = ["9d3rrxyd", "w6jl2ned"];
const platforms = {
	"lq60nl94": "android",
	"gde3xgek": "ios",
	"7m6ylw9p": "switch"
};
for (const gameId of games) {
	try {
		const response = await fetch(`https://www.speedrun.com/api/v1/games/${gameId}?embed=categories,levels,variables`);
		if (!response.ok) {
			throw new Error(response.statusText);
		}
		const {data} = await response.json();
		const versions = data.variables.data.find((variable) => {
			return variable.name === "Version";
		});
		const levels = Object.fromEntries(data.levels.data.map((level) => {
			return [level.id, level];
		}));
		const categories = Object.fromEntries(data.categories.data.map((category) => {
			return [category.id, category];
		}));
		const variables = Object.fromEntries(data.variables.data.map((variable) => {
			return [variable.id, variable];
		}));
		console.log(`Got game`);
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
				const date = run.date;
				dates[date] ??= Object.create(null);
				const [player, playerDates] = (() => {
					const player = run.players.data[0].rel === "user" ? run.players.data[0].id : "814p2558";
					const playerName = run.players.data[0].rel === "user" ? run.players.data[0].names.international : "anonymous";
					playersById[player] ??= playerName;
					playersByName[playerName] ??= player;
					return [player, players[player] ??= Object.create(null)];
				})();
				const playerDateRuns = playerDates[date] ??= [];
				const gui = run.weblink ?? null;
				const api = run.links[0].uri ?? null;
				const minutes = run.times.primary_t != null ? `${run.times.primary_t / 60 | 0}`.padStart(2, "0") : null;
				const seconds = run.times.primary_t != null ? `${run.times.primary_t % 60 | 0}`.padStart(2, "0") : null;
				const centiseconds = run.times.primary_t != null ? `${run.times.primary_t * 100 % 100 | 0}`.padStart(2, "0") : null;
				const time = `${minutes ?? "--"}:${seconds ?? "--"}.${centiseconds ?? "--"}`;
				const version = versions.values.values[run.values[versions.id]].label ?? null;
				const platform = platforms[run.system.platform] ?? null;
				const [leaderboard, leaderboardDates] = (() => {
					const level = run.level;
					const category = run.category;
					const values = Object.entries(run.values).filter(([variable]) => {
						return variables[variable]?.["is-subcategory"] ?? false;
					}).map(([variable, value]) => {
						return `-${variable}.${value}`;
					});
					const leaderboard = `${level != null ? `l_${level}-` : ""}${category}${values.join("")}`;
					const levelName = run.level != null ? levels[run.level]?.name ?? null : null;
					const categoryName = categories[run.category]?.name ?? null;
					const valueNames = Object.entries(run.values).filter(([variable]) => {
						return variables[variable]?.["is-subcategory"] ?? false;
					}).map(([variable, value]) => {
						return variables[variable]?.values.values[value]?.label ?? null;
					}).filter((valueName) => {
						return valueName != null;
					});
					const leaderboardName = `${levelName != null ? `${levelName}: ` : ""}${categoryName ?? ""}${values.length !== 0 ? ` - ${valueNames.join(", ")}` : ""}`;
					leaderboardsById[leaderboard] ??= leaderboardName;
					leaderboardsByName[leaderboardName] ??= leaderboard;
					return [leaderboard, leaderboards[leaderboard] ??= Object.create(null)];
				})();
				const leaderboardDateRuns = leaderboardDates[date] ??= [];
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
				const playerDateRun = {
					href: status !== "rejected" ? gui : api,
					time: time,
					leaderboard: leaderboard,
					version: version != null && version !== "Select or add one!" ? version : "?",
					platform: platform,
					status: status,
					annotation: status !== "rejected" ? comment : reason,
				};
				playerDateRuns.push(playerDateRun);
				const leaderboardDateRun = {
					href: status !== "rejected" ? gui : api,
					time: time,
					player: player,
					version: version != null && version !== "Select or add one!" ? version : "?",
					platform: platform,
					status: status,
					annotation: status !== "rejected" ? comment : reason,
				};
				leaderboardDateRuns.push(leaderboardDateRun);
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
					return `@${playersByName[mention.slice(1)] ?? "814p2558"}`;
				});
			}
		}
	}
}
for (const leaderboardDates of Object.values(leaderboards)) {
	for (const dateRuns of Object.values(leaderboardDates)) {
		for (const run of dateRuns) {
			if (run.annotation != null) {
				run.annotation = run.annotation.replaceAll(/@[-.0-9A-Z_a-z]+/g, (mention) => {
					return `@${playersByName[mention.slice(1)] ?? "814p2558"}`;
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
		const {android, ios, switch: _switch} = date;
		if (android != null) {
			(dates[android] ??= Object.create(null)).android = name
		}
		if (ios != null) {
			(dates[ios] ??= Object.create(null)).ios = name
		}
		if (_switch != null) {
			(dates[_switch] ??= Object.create(null)).switch = name
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
function sortLeaderboards(leaderboards) {
	sort(leaderboards, (leaderboard) => {
		return Object.keys(leaderboard[1])[0];
	});
	return leaderboards;
}
function sortLeaderboardDates(leaderboardDates) {
	sort(leaderboardDates, (leaderboardDate) => {
		return leaderboardDate[0];
	});
	return leaderboardDates;
}
function sortLeaderboardDateRuns(leaderboardDateRuns) {
	sort(leaderboardDateRuns, (leaderboardDateRun) => {
		return leaderboardDateRun.href;
	});
	return leaderboardDateRuns;
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
const sortedLeaderboards = Object.fromEntries(sortLeaderboards(Object.entries(leaderboards).map(([leaderboard, dates]) => {
	return [
		leaderboard,
		Object.fromEntries(sortLeaderboardDates(Object.entries(dates).map(([date, runs]) => {
			return [
				date,
				Array.from(sortLeaderboardDateRuns(Array.from(runs))),
			];
		}))),
	];
})));
await fs.promises.mkdir("cache", {
	recursive: true,
});
await fs.promises.writeFile(`cache/dates.json`, `${JSON.stringify(sortedDates, null, "\t")}\n`);
await fs.promises.writeFile(`cache/players.json`, `${JSON.stringify(sortedPlayers, null, "\t")}\n`);
await fs.promises.writeFile(`cache/players-by-id.json`, `${JSON.stringify(playersById, null, "\t")}\n`);
await fs.promises.writeFile(`cache/players-by-name.json`, `${JSON.stringify(playersByName, null, "\t")}\n`);
await fs.promises.writeFile(`cache/leaderboards.json`, `${JSON.stringify(sortedLeaderboards, null, "\t")}\n`);
await fs.promises.writeFile(`cache/leaderboards-by-id.json`, `${JSON.stringify(leaderboardsById, null, "\t")}\n`);
await fs.promises.writeFile(`cache/leaderboards-by-name.json`, `${JSON.stringify(leaderboardsByName, null, "\t")}\n`);
