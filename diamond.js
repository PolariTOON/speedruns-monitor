import {writeFile} from "node:fs/promises";
import bears from "./cache/bears.json" with {type: "json"};
import sublevels from "./cache/sublevels.json" with {type: "json"};
import leaderboards from "./cache/leaderboards.json" with {type: "json"};
function computeNewTiers(oldTiers, leaderboards) {
	const newTiers = Object.create(null);
	for (const [leaderboard, oldTimes] of Object.entries(oldTiers)) {
		const newTimes = newTiers[leaderboard] = Object.assign(Object.create(null), oldTimes);
		if (!("diamond" in oldTimes) || !("gold" in oldTimes)) {
			continue;
		}
		if (!(leaderboard in leaderboards)) {
			continue;
		}
		let minTime = null;
		for (const dateRuns of Object.values(leaderboards[leaderboard])) {
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
					minTime = currentTime;
				}
			}
		}
		if (minTime == null) {
			continue;
		}
		const gold = oldTimes.gold;
		const [goldMinutes, goldSeconds, goldCentiseconds] = gold.split(/:|\./).map((part) => {
			return Number(part);
		});
		const goldTime = goldMinutes * 6000 + goldSeconds * 100 + goldCentiseconds;
		const diamondTime = Math.ceil((Math.ceil(minTime / 100) * 3 + goldTime / 100) / 4) * 100;
		const diamondMinutes = `${(diamondTime - diamondTime % 6000) / 6000}`.padStart(2, "0");
		const diamondSeconds = `${(diamondTime - diamondTime % 100) / 100 % 60}`.padStart(2, "0");
		const diamondCentiseconds = `${diamondTime % 100}`.padStart(2, "0");
		const diamond = `${diamondMinutes}:${diamondSeconds}.${diamondCentiseconds}`;
		newTimes.diamond = diamond;
	}
	return newTiers;
}
function formatTiersDiff(oldTiers, newTiers) {
	const tiers = Object.create(null);
	for (const [leaderboard, oldTimes] of Object.entries(oldTiers)) {
		const times = tiers[leaderboard] = Object.assign(Object.create(null), oldTimes);
		if (!(leaderboard in newTiers)) {
			continue;
		}
		const newTimes = newTiers[leaderboard];
		for (const [tier, oldTime] of Object.entries(oldTimes)) {
			if (!(tier in newTimes)) {
				continue;
			}
			const newTime = newTimes[tier];
			if (newTime === oldTime) {
				continue;
			}
			const time = `${oldTime} -> ${newTime}`;
			times[tier] = time;
		}
	}
	const formattedTiers = Object.entries(tiers).map(([leaderboard, times]) => {
		return `\
${leaderboard}:
${Object.entries(times).map(([tier, time]) => {
			return `\
- ${tier}: ${time}
`;
		}).join("")}\
`;
	}).join("");
	return formattedTiers;
}
const newBears = computeNewTiers(bears, leaderboards);
const formattedBears = formatTiersDiff(bears, newBears);
const newSublevels = computeNewTiers(sublevels, leaderboards);
const formattedSublevels = formatTiersDiff(sublevels, newSublevels);
await writeFile(`diamond.txt`, [formattedBears, formattedSublevels].join(""));
