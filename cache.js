import {mkdir, writeFile} from "node:fs/promises";
const dates = Object.create(null);
const players = Object.create(null);
const playersById = Object.create(null);
const playersByName = Object.create(null);
const leaderboards = Object.create(null);
const leaderboardsById = Object.create(null);
const leaderboardsByName = Object.create(null);
const bearTiers = Object.create(null);
const missionTiers = Object.create(null);
const raceTiers = Object.create(null);
const sublevelTiers = Object.create(null);
const games = {
	"9d3rrxyd": "sba",
	"w6jl2ned": "sbace",
};
const statuses = {
	1: "verified",
	2: "rejected",
};
const platforms = {
	"lq60nl94": "android",
	"gde3xgek": "ios",
	"7m6ylw9p": "switch",
};
for (const [gameId, game] of Object.entries(games)) {
	try {
		const response = await fetch(`https://www.speedrun.com/api/v2/GetGameData?gameId=${gameId}`);
		if (!response.ok) {
			throw new Error(response.statusText);
		}
		const data = await response.json();
		const levels = Object.fromEntries(data.levels.map((level) => {
			return [
				level.id,
				{
					id: level.id,
					name: level.name,
				},
			];
		}));
		const categories = Object.fromEntries(data.categories.map((category) => {
			return [
				category.id,
				{
					id: category.id,
					name: category.name,
					isArchived: category.archived,
				},
			];
		}));
		const values = Object.fromEntries(data.values.map((value) => {
			return [
				value.id,
				{
					id: value.id,
					name: value.name,
					variableId: value.variableId,
				},
			];
		}));
		const variables = Object.fromEntries(data.variables.map((variable) => {
			return [
				variable.id,
				{
					id: variable.id,
					name: variable.name,
					isSubcategory: variable.isSubcategory,
				},
			];
		}));
		const versionVariable = Object.values(variables).find((variable) => {
			return variable.name === "Version";
		}) ?? null;
		console.log(`Got game ${gameId}`);
		await new Promise((resolve) => {
			setTimeout(resolve, 800);
		});
		for (const [verified, status] of Object.entries(statuses)) {
			const slice = 200;
			for (let offset = 0;; offset += slice) {
				const response = await fetch(`https://www.speedrun.com/api/v1/runs?game=${gameId}&status=${status}&orderby=date&direction=asc&embed=players&offset=${offset}&max=${slice}`);
				if (!response.ok) {
					throw new Error(response.statusText);
				}
				const {data, pagination} = await response.json();
				const {size} = pagination;
				if (size === 0) {
					await new Promise((resolve) => {
						setTimeout(resolve, 800);
					});
					break;
				}
				for (const run of data) {
					const categoryId = run.category;
					const category = categories[categoryId];
					if (!category.isArchived) {
						continue;
					}
					const date = run.date;
					dates[date] ??= Object.create(null);
					const playerId = run.players.data[0].rel === "user" ? run.players.data[0].id : "814p2558";
					const playerName = run.players.data[0].rel === "user" ? run.players.data[0].names.international : "anonymous";
					playersById[playerId] ??= playerName;
					playersByName[playerName] ??= playerId;
					const playerDates = players[playerId] ??= Object.create(null);
					const playerDateRuns = playerDates[date] ??= [];
					const runId = run.id;
					const gui = `https://www.speedrun.com/${game}/run/${runId}`;
					const api = `https://www.speedrun.com/api/v1/runs/${runId}`;
					const minutes = run.times.primary_t != null ? `${run.times.primary_t / 60 | 0}`.padStart(2, "0") : null;
					const seconds = run.times.primary_t != null ? `${run.times.primary_t % 60 | 0}`.padStart(2, "0") : null;
					const centiseconds = run.times.primary_t != null ? `${run.times.primary_t * 100 % 100 | 0}`.padStart(2, "0") : null;
					const time = `${minutes ?? "--"}:${seconds ?? "--"}.${centiseconds ?? "--"}`;
					const versionId = versionVariable != null ? run.values[versionVariable.id] ?? null : null;
					const version = versionId != null ? values[versionId].name : null;
					const platform = platforms[run.system.platform] ?? null;
					const levelId = run.level;
					const valueIds = Object.entries(run.values).filter(([variableId]) => {
						return variables[variableId].isSubcategory;
					}).map(([variableId, valueId]) => {
						return `-${variableId}.${valueId}`;
					});
					const leaderboardId = `${levelId != null ? `l_${levelId}-` : ""}${categoryId}${valueIds.join("")}`;
					const levelName = levelId != null ? levels[levelId].name : null;
					const categoryName = categories[categoryId].name;
					const valueNames = Object.entries(run.values).filter(([variableId]) => {
						return variables[variableId].isSubcategory;
					}).map(([variableId, valueId]) => {
						return values[valueId].name;
					}).filter((valueName) => {
						return valueName != null;
					});
					const leaderboardName = `${levelName != null ? `${levelName}: ` : ""}${categoryName ?? ""}${valueNames.length !== 0 ? ` - ${valueNames.join(", ")}` : ""}`;
					leaderboardsById[leaderboardId] ??= leaderboardName;
					leaderboardsByName[leaderboardName] ??= leaderboardId;
					const leaderboardDates = leaderboards[leaderboardId] ??= Object.create(null);
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
						leaderboard: leaderboardId,
						version: version != null && version !== "Select or add one!" ? version : "?",
						platform: platform,
						status: status,
						annotation: status !== "rejected" ? comment : reason,
					};
					playerDateRuns.push(playerDateRun);
					const leaderboardDateRun = {
						href: status !== "rejected" ? gui : api,
						time: time,
						player: playerId,
						version: version != null && version !== "Select or add one!" ? version : "?",
						platform: platform,
						status: status,
						annotation: status !== "rejected" ? comment : reason,
					};
					leaderboardDateRuns.push(leaderboardDateRun);
				}
				console.log(`Got ${status} runs ${offset}-${offset + size - 1}`);
				await new Promise((resolve) => {
					setTimeout(resolve, 800);
				});
			}
			console.log(`Got archived categories`);
			for (const [categoryId, category] of Object.entries(categories)) {
				if (category.isArchived) {
					continue;
				}
				for (let page = 1, pages = 1; page <= pages; ++page) {
					const response = await fetch(`https://www.speedrun.com/api/v2/GetGameLeaderboard2?params={"gameId":"${gameId}","categoryId":"${categoryId}","verified":${verified},"obsolete":1,"video":0}&page=${page}`);
					if (!response.ok) {
						throw new Error(response.statusText);
					}
					const {pagination, playerList, runList} = await response.json();
					pages = pagination.pages;
					const offset = (page - 1) * pagination.per;
					const size = runList.length;
					if (size === 0) {
						await new Promise((resolve) => {
							setTimeout(resolve, 800);
						});
						break;
					}
					for (const player of playerList) {
						const playerId = player.id;
						const playerName = player.name;
						playersById[playerId] ??= playerName;
						playersByName[playerName] ??= playerId;
						players[playerId] ??= Object.create(null);
					}
					for (const run of runList) {
						const timestamp = run.date;
						const datetime = new Date(timestamp * 1000);
						const year = `${datetime.getUTCFullYear()}`.padStart(4, "0");
						const month = `${datetime.getUTCMonth() + 1}`.padStart(2, "0");
						const day = `${datetime.getUTCDate()}`.padStart(2, "0");
						const date = `${year}-${month}-${day}`;
						dates[date] ??= Object.create(null);
						const playerId = run.playerIds[0] ?? "814p2558";
						const playerName = run.playerIds[0] != null ? playersById[run.playerIds[0]] : "anonymous";
						playersById[playerId] ??= playerName;
						playersByName[playerName] ??= playerId;
						const playerDates = players[playerId] ??= Object.create(null);
						const playerDateRuns = playerDates[date] ??= [];
						const runId = run.id;
						const gui = `https://www.speedrun.com/${game}/run/${runId}`;
						const api = `https://www.speedrun.com/api/v1/runs/${runId}`;
						const minutes = (run.igt ?? run.time) != null ? `${(run.igt ?? run.time) / 60 | 0}`.padStart(2, "0") : null;
						const seconds = (run.igt ?? run.time) != null ? `${(run.igt ?? run.time) % 60 | 0}`.padStart(2, "0") : null;
						const centiseconds = (run.igt ?? run.time) != null ? `${(run.igt ?? run.time) * 100 % 100 | 0}`.padStart(2, "0") : null;
						const time = `${minutes ?? "--"}:${seconds ?? "--"}.${centiseconds ?? "--"}`;
						const versionId = versionVariable != null ? run.valueIds.find((valueId) => {
							return values[valueId].variableId === versionVariable.id;
						}) ?? null : null;
						const version = versionId != null ? values[versionId].name : null;
						const platform = platforms[run.platformId] ?? null;
						const levelId = run.levelId ?? null;
						const valueIds = run.valueIds.filter((valueId) => {
							return variables[values[valueId].variableId].isSubcategory;
						}).map((valueId) => {
							return `-${values[valueId].variableId}.${valueId}`;
						});
						const leaderboardId = `${levelId != null ? `l_${levelId}-` : ""}${categoryId}${valueIds.join("")}`;
						const levelName = levelId != null ? levels[levelId].name : null;
						const categoryName = categories[categoryId].name;
						const valueNames = run.valueIds.filter((valueId) => {
							return variables[values[valueId].variableId].isSubcategory;
						}).map((valueId) => {
							return values[valueId].name;
						});
						const leaderboardName = `${levelName != null ? `${levelName}: ` : ""}${categoryName ?? ""}${valueNames.length !== 0 ? ` - ${valueNames.join(", ")}` : ""}`;
						leaderboardsById[leaderboardId] ??= leaderboardName;
						leaderboardsByName[leaderboardName] ??= leaderboardId;
						const leaderboardDates = leaderboards[leaderboardId] ??= Object.create(null);
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
						const reason = (run.reason ?? "").replaceAll("\r\n", "\n").replaceAll(/^\n+|\n+$/g, "").replaceAll(/\n{2,}/g, "\n\n") || null;
						const playerDateRun = {
							href: status !== "rejected" ? gui : api,
							time: time,
							leaderboard: leaderboardId,
							version: version != null && version !== "Select or add one!" ? version : "?",
							platform: platform,
							status: status,
							annotation: status !== "rejected" ? comment : reason,
						};
						playerDateRuns.push(playerDateRun);
						const leaderboardDateRun = {
							href: status !== "rejected" ? gui : api,
							time: time,
							player: playerId,
							version: version != null && version !== "Select or add one!" ? version : "?",
							platform: platform,
							status: status,
							annotation: status !== "rejected" ? comment : reason,
						};
						leaderboardDateRuns.push(leaderboardDateRun);
					}
					console.log(`Got ${status} runs ${offset}-${offset + size - 1}`);
					await new Promise((resolve) => {
						setTimeout(resolve, 800);
					});
				}
				console.log(`Got category ${categoryId}`);
			}
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
	const response = await fetch(`https://raw.githubusercontent.com/SuperBearAdventure/shicka/master/src/bindings/bears.json`);
	if (!response.ok) {
		throw new Error(response.statusText);
	}
	const bears = await response.json();
	for (const bear of bears) {
		const {diamond, gold, name} = bear;
		const silver = Math.ceil(gold * 4 / 3);
		const bronze = gold * 2;
		const goals = {
			diamond,
			gold,
			silver,
			bronze,
		};
		const times = Object.fromEntries(Object.entries(goals).map(([tier, goal]) => {
			const minutes = `${goal / 60 | 0}`.padStart(2, "0");
			const seconds = `${goal % 60 | 0}`.padStart(2, "0");
			const centiseconds = `${goal * 100 % 100 | 0}`.padStart(2, "0");
			const time = `${minutes}:${seconds}.${centiseconds}`;
			return [tier, time];
		}));
		const englishName = name["en-US"];
		const leaderboardName = Object.keys(leaderboardsByName).find((leaderboardName) => {
			return (leaderboardName === englishName || leaderboardName.startsWith(`${englishName} `) || leaderboardName.endsWith(` ${englishName}`) || leaderboardName.includes(` ${englishName} `)) && (!leaderboardName.includes("(") && !leaderboardName.includes(")") || leaderboardName.includes("+"));
		});
		if (leaderboardName != null) {
			const leaderboard = leaderboardsByName[leaderboardName];
			bearTiers[leaderboard] ??= times;
		}
	}
	console.log(`Got bears`);
	await new Promise((resolve) => {
		setTimeout(resolve, 800);
	});
} catch (error) {
	console.warn(`Error while getting bears`);
	throw error;
}
try {
	const challengeResponse = await fetch(`https://raw.githubusercontent.com/SuperBearAdventure/shicka/master/src/bindings/challenges.json`);
	if (!challengeResponse.ok) {
		throw new Error(challengeResponse.statusText);
	}
	const challenges = await challengeResponse.json();
	console.log(`Got challenges`);
	await new Promise((resolve) => {
		setTimeout(resolve, 800);
	});
	const levelResponse = await fetch(`https://raw.githubusercontent.com/SuperBearAdventure/shicka/master/src/bindings/levels.json`);
	if (!levelResponse.ok) {
		throw new Error(levelResponse.statusText);
	}
	const levels = await levelResponse.json();
	console.log(`Got levels`);
	await new Promise((resolve) => {
		setTimeout(resolve, 800);
	});
	const response = await fetch(`https://raw.githubusercontent.com/SuperBearAdventure/shicka/master/src/bindings/missions.json`);
	if (!response.ok) {
		throw new Error(response.statusText);
	}
	const missions = await response.json();
	for (const mission of missions) {
		const {challenge, level} = mission;
		const challengeName = challenges[challenge].name;
		const englishChallengeName = challengeName["en-US"];
		const levelName = levels[level].name;
		const englishLevelName = levelName["en-US"];
		const englishName = `${englishChallengeName} in ${englishLevelName}`;
		const leaderboardName = Object.keys(leaderboardsByName).find((leaderboardName) => {
			return leaderboardName.startsWith("Missions: ") && (leaderboardName.endsWith(` ${englishName}`) || leaderboardName.includes(` ${englishName} `)) && (!leaderboardName.includes("(") && !leaderboardName.includes(")") || leaderboardName.includes("+"));
		});
		if (leaderboardName != null) {
			const leaderboard = leaderboardsByName[leaderboardName];
			missionTiers[leaderboard] ??= Object.create(null);
		}
	}
	console.log(`Got missions`);
	await new Promise((resolve) => {
		setTimeout(resolve, 800);
	});
} catch (error) {
	console.warn(`Error while getting missions`);
	throw error;
}
try {
	const response = await fetch(`https://raw.githubusercontent.com/SuperBearAdventure/shicka/master/src/bindings/races.json`);
	if (!response.ok) {
		throw new Error(response.statusText);
	}
	const races = await response.json();
	for (const race of races) {
		const {name} = race;
		const englishName = name["en-US"];
		const leaderboardName = Object.keys(leaderboardsByName).find((leaderboardName) => {
			return leaderboardName.startsWith("Races: ") && (leaderboardName.endsWith(` ${englishName}`) || leaderboardName.includes(` ${englishName} `)) && (!leaderboardName.includes("(") && !leaderboardName.includes(")") || leaderboardName.includes("+"));
		});
		if (leaderboardName != null) {
			const leaderboard = leaderboardsByName[leaderboardName];
			raceTiers[leaderboard] ??= Object.create(null);
		}
	}
	console.log(`Got races`);
	await new Promise((resolve) => {
		setTimeout(resolve, 800);
	});
} catch (error) {
	console.warn(`Error while getting races`);
	throw error;
}
try {
	const response = await fetch(`https://raw.githubusercontent.com/SuperBearAdventure/shicka/master/src/bindings/sublevels.json`);
	if (!response.ok) {
		throw new Error(response.statusText);
	}
	const sublevels = await response.json();
	for (const sublevel of sublevels) {
		const {diamond, gold, name} = sublevel;
		const silver = Math.ceil(gold * 4 / 3);
		const bronze = gold * 2;
		const goals = {
			diamond,
			gold,
			silver,
			bronze,
		};
		const times = Object.fromEntries(Object.entries(goals).map(([tier, goal]) => {
			const minutes = `${goal / 60 | 0}`.padStart(2, "0");
			const seconds = `${goal % 60 | 0}`.padStart(2, "0");
			const centiseconds = `${goal * 100 % 100 | 0}`.padStart(2, "0");
			const time = `${minutes}:${seconds}.${centiseconds}`;
			return [tier, time];
		}));
		const englishName = name["en-US"];
		const leaderboardName = Object.keys(leaderboardsByName).find((leaderboardName) => {
			return leaderboardName.startsWith(`${englishName}: `) && (leaderboardName.endsWith(" Escape") || leaderboardName.includes(" Escape ")) && (!leaderboardName.includes("(") && !leaderboardName.includes(")") || leaderboardName.includes("+"));
		});
		if (leaderboardName != null) {
			const leaderboard = leaderboardsByName[leaderboardName];
			sublevelTiers[leaderboard] ??= times;
		}
	}
	console.log(`Got sublevels`);
	await new Promise((resolve) => {
		setTimeout(resolve, 800);
	});
} catch (error) {
	console.warn(`Error while getting sublevels`);
	throw error;
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
const sortedBears = bearTiers;
const sortedMissions = missionTiers;
const sortedRaces = raceTiers;
const sortedSublevels = sublevelTiers;
await mkdir("cache", {
	recursive: true,
});
await writeFile(`cache/dates.json`, `${JSON.stringify(sortedDates, null, "\t")}\n`);
await writeFile(`cache/players.json`, `${JSON.stringify(sortedPlayers, null, "\t")}\n`);
await writeFile(`cache/players-by-id.json`, `${JSON.stringify(playersById, null, "\t")}\n`);
await writeFile(`cache/players-by-name.json`, `${JSON.stringify(playersByName, null, "\t")}\n`);
await writeFile(`cache/leaderboards.json`, `${JSON.stringify(sortedLeaderboards, null, "\t")}\n`);
await writeFile(`cache/leaderboards-by-id.json`, `${JSON.stringify(leaderboardsById, null, "\t")}\n`);
await writeFile(`cache/leaderboards-by-name.json`, `${JSON.stringify(leaderboardsByName, null, "\t")}\n`);
await writeFile(`cache/bears.json`, `${JSON.stringify(sortedBears, null, "\t")}\n`);
await writeFile(`cache/missions.json`, `${JSON.stringify(sortedMissions, null, "\t")}\n`);
await writeFile(`cache/races.json`, `${JSON.stringify(sortedRaces, null, "\t")}\n`);
await writeFile(`cache/sublevels.json`, `${JSON.stringify(sortedSublevels, null, "\t")}\n`);
await writeFile(`cache/readme.md`, `\
# Cache

- [Dates](dates.json)
- [Players](players.json)
- [Leaderboards](leaderboards.json)
- [Bears](bears.json)
- [Missions](missions.json)
- [Races](races.json)
- [Sublevels](sublevels.json)
`);
