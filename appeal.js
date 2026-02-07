import {writeFile} from "node:fs/promises";
import players from "./cache/players.json" with {type: "json"};
const normalizedAnnotations = Object.assign(Object.create(null), {
	"DUPLICATE": "Duplicate",
	"UNAVAILABLE_VIDEO": "The video is not available.",
	"DIRECT_UPLOAD": "This site does not support direct upload.",
	"NO_VIDEO": "A video record of the full run is required to appear on these leaderboards.",
	"CROPPED_VIDEO": "Videos should not be cropped.",
	"SPAM": "Spam",
	"PRIVATE_VIDEO": "This video is private.",
	"BETA_VERSION": "Runs done in beta versions are not allowed.",
	"MODDED_VERSION": "Runs should be done in an unmodded version of the game.",
	"OLDER_VERSION": "Runs should be done in the latest version available.",
	"BOSS_MISSING_AFTER_STICKERS": "In this category, you also need to beat the boss and rescue Barry after collecting all the stickers.",
	"MUSCLE_CAR": "The muscle car is not allowed in speedruns as it is pay to win.",
	"NO_SPEEDRUN": "This is not a speedrun.",
	"FINAL_TIME_MISSING": "Make sure the final time is included at the end.",
	"NO_OWNERSHIP": "This is not your run.",
	"MULTIPLAYER_MODE": "Multiplayer runs are not allowed.",
	"BEGINNING_MISSING": "The beginning of the run is missing.",
	"CUTSCENE_EXPLOIT": "The cutscene bug this speedrun exploits has been fixed in a later version.",
	"FINAL_PAUSE_MISSING": "You have to pause the game after meeting Shicka to end the run",
	"WALL_RUNNING_ON_VINES_EXPLOIT": "Wall running on vines is preventively disallowed in this category to keep the competition going in case it gets fixed.",
	"DISCORD_VIDEO": "Please upload your video on a dedicated hosting platform (not Discord), then resubmit with a link leading to it.",
	"NO_SPEEDRUN_MODE": "Runs in this category should be done in speedrun mode, starting from the beginning of the game.",
	"WHISTLE_EMOTE": "The whistle emote is not allowed.",
	"MOVED_RUN": "Moved to https://www.speedrun.com/xxx/runs/xxx",
	"NEWER_VERSION": "In this category, the latest versions allowed are 1.9.9.1 and 1.9.10. Newer versions are not allowed.",
	"VACUUM_CLEANER": "As per the rules, going out of bounds by getting pushed by the robotic vacuum cleaner is not allowed.",
	"SEGMENTED_RUN": "According to the rules, in this category, you should \"Save bears without dying, restarting or exiting the level.\"",
	"END_MISSING": "The end of the run is missing.",
	"HIDING_EMOTE_EXPLOIT": "The bug this speedrun exploits has been quickly fixed in the next version, 12.0.4. This run is thus rejected to keep the competition going",
	"DIVE_BOOST_EXPLOIT": "One of the bug this speedrun exploits has been quickly fixed in the next version, 12.0.2. This run is thus rejected to keep the competition going",
	"PART_MISSING": "Parts of the runs are missing.",
	"ESCAPE_MISSING": "In this category you have to escape to end the run.",
	"BOSS_MISSING_AFTER_COINS": "In this category, you also need to beat the boss and rescue Barry after collecting all the coins.",
	"ALEXANDER_MISSING": "You forgot to rescue Alexander.",
	"NUMEROBIS_MISSING": "You forgot to rescue Numerobis.",
	"BOB_AND_MADELINE_MISSING": "You forgot to rescue Bob and Madeline.",
	"SHICKA_CUTSCENE_SKIP": "Skipping Shicka cutscene by pausing the game is not allowed in this category.",
	"INVISIBLE_TIMER": "The in-game timer is required for runs in this category. Please consider using another emulator that supports it. Also new runs have to be done in the latest version allowed by the category, which is xxx.",
	"TELEPORTER_SKIP": "In this category, you have to use teleporters only to travel between levels.",
	"CUTSCENE_SKIP": "Cutscenes should not be skipped in this category.",
	"CORRUPTED_VIDEO": "The video is corrupted.",
	"KEY_EXPLOIT": "As per the rules, pausing while waiting for Dr Christopher's key is not allowed.",
	"DESERT_RACE_EXPLOIT": "This version is not allowed in this category.",
	"BLOSSOM_MISSING": "You forgot to rescue Blossom.",
});
const knownReasons = Object.assign(Object.create(null), {
	"Duplicate": "DUPLICATE",
	"The video is not available.": "UNAVAILABLE_VIDEO",
	"A video record of the full run is required to appear on these leaderboards.": "NO_VIDEO",
	"This site does not support direct upload. Please upload your video on a dedicated hosting platform then resubmit with a link leading to it.": "DIRECT_UPLOAD",
	"Spam": "SPAM",
	"Videos should not be cropped.": "CROPPED_VIDEO",
	"Runs done in beta versions are not allowed.": "BETA_VERSION",
	"This video is private. Please make it public or unlisted then resubmit.": "PRIVATE_VIDEO",
	"Runs should be done in an unmodded version of the game.": "MODDED_VERSION",
	"The muscle car is not allowed in speedruns as it is pay to win": "MUSCLE_CAR",
	"Runs should be done in the latest version available.": "OLDER_VERSION",
	"In this category, you also need to beat the boss and rescue Barry after collecting all the stickers.": "BOSS_MISSING_AFTER_STICKERS",
	"The video is private. Please make it public then resubmit.": "PRIVATE_VIDEO",
	"This is not a speedrun.": "NO_SPEEDRUN",
	"This site does not support direct upload. Please upload you video on a dedicated hosting platform then resubmit with a link leading to it.": "DIRECT_UPLOAD",
	"This is not your run.": "NO_OWNERSHIP",
	"Multiplayer runs are not allowed.": "MULTIPLAYER_MODE",
	"The beginning of the run is missing.": "BEGINNING_MISSING",
	"The cutscene bug this speedrun exploits has been fixed in a later version.": "CUTSCENE_EXPLOIT",
	"Wall running on vines is preventively disallowed in this category to keep the competition going in case it gets fixed.": "WALL_RUNNING_ON_VINES_EXPLOIT",
	"This leaderboard uses the in-game timer only. Please enable the in-game timer and make sure the final time is included at the end.": "FINAL_TIME_MISSING",
	"You have to pause the game after meeting Shicka to end the run": "FINAL_PAUSE_MISSING",
	"Please upload your video on a dedicated hosting platform (not Discord), then resubmit with a link leading to it.": "DISCORD_VIDEO",
	"Videos should not be cropped": "CROPPED_VIDEO",
	"Please upload your video on a dedicated hosting platform then resubmit with a link leading to it.": "DIRECT_UPLOAD",
	"The whistle emote is not allowed.": "WHISTLE_EMOTE",
	"Videos have to be publicly available. Please host your video on a dedicated hosting platform then resubmit.": "UNAVAILABLE_VIDEO",
	"Runs have to me made in the latest version available.": "OLDER_VERSION",
	"In this category, you also have to beat the boss and rescue Barry after collecting all the stickers.": "BOSS_MISSING_AFTER_STICKERS",
	"The screen should not be cropped": "CROPPED_VIDEO",
	"Runs should be done in the latest version available that is allowed by the (sub)category, which is 10.3.0 here.": "OLDER_VERSION",
	"According to the rules, in this category, you should \"Save bears without dying, restarting or exiting the level.\"": "SEGMENTED_RUN",
	"Please enable the in-game timer and make sure the final time is included at the end.": "FINAL_TIME_MISSING",
	"The end of the run is missing.": "END_MISSING",
	"The bug this speedrun exploits has been quickly fixed in the next version, 12.0.4. This run is thus rejected to keep the competition going": "HIDING_EMOTE_EXPLOIT",
	"The video is not available. Please submit the run again with a link to a public or unlisted video.": "UNAVAILABLE_VIDEO",
	"The final time is not visible after opening the cage.": "FINAL_TIME_MISSING",
	"One of the bug this speedrun exploits has been quickly fixed in the next version, 12.0.2. This run is thus rejected to keep the competition going": "DIVE_BOOST_EXPLOIT",
	"The video is not availlable.": "UNAVAILABLE_VIDEO",
	"A video record is required to appear on these leaderboards.": "NO_VIDEO",
	"Runs done in beta versions are not allowed (also going out of bounds is not allowed).": "BETA_VERSION",
	"duplicate submission": "DUPLICATE",
	"A video record of the full run is required to appear on these leaderboards": "NO_VIDEO",
	"As per the rules, going out of bounds by getting pushed by the robotic vacuum cleaner is not allowed.": "VACUUM_CLEANER",
	"In this category, you also have to beat the boss and rescue Barry after collecting the stickers.": "BOSS_MISSING_AFTER_STICKERS",
	"The video is not available. Please host your video on another platform then resubmit.": "UNAVAILABLE_VIDEO",
	"Speedruns should be done in an unmodded version of the game.": "MODDED_VERSION",
	"A video record of the full run is required to appear on these leaderboards. Please upload your video on a dedicated hosting platform then resubmit with a link leading to it.": "NO_VIDEO",
	"The video is not available": "UNAVAILABLE_VIDEO",
	"Runs in this category should be done in speedrun mode, starting from the beginning of the game..": "NO_SPEEDRUN_MODE",
	"Runs in this category should be done in speedrun mode, starting from the beginning of the game.": "NO_SPEEDRUN_MODE",
	"Moved to https://www.speedrun.com/sbace/runs/zq5ww5xz": "MOVED_RUN",
	"Parts of the runs are missing.": "PART_MISSING",
	"The video is not available. Please upload your video on a dedicated hosting platform then resubmit with a link leading to it.": "UNAVAILABLE_VIDEO",
	"In this category, you also need to beat the boss and rescue Barry after collecting all the coins.": "BOSS_MISSING_AFTER_COINS",
	"Any% speedruns have to be done in a new save file with speedrun mode enabled.": "NO_SPEEDRUN_MODE",
	"You forgot to rescue Alexander.": "ALEXANDER_MISSING",
	"You forgot to rescue Numerobis.": "NUMEROBIS_MISSING",
	"You forgot to rescue Bob and Madeline.": "BOB_AND_MADELINE_MISSING",
	"Runs should be done in the latest version available that is allowed by the (sub)category, which is 1.3.4.2 here..": "OLDER_VERSION",
	"Skipping Shicka cutscene by pausing the game is not allowed in this category. Also runs should be done in 10.3.0.": "SHICKA_CUTSCENE_SKIP",
	"The in-game timer is required for runs in this category. Please consider using another emulator that supports it. Also new runs have to be done in the latest version allowed by the category, which is 1.8.2.": "INVISIBLE_TIMER",
	"In this category, you have to use teleporters only to travel between levels.": "TELEPORTER_SKIP",
	"Cutscenes should not be skipped in this category.": "CUTSCENE_SKIP",
	"Runs done in beta versions are not allowed. Also in this category, you also have to beat the boss and rescue Barry after collecting all the stickers.": "BETA_VERSION",
	"The video is not available. Please upload it on a dedicated hosting platform then resubmit with a link leading to it.": "UNAVAILABLE_VIDEO",
	"Videos have to be publicly available. Please upload your video on a dedicated hosting platform then resubmit.": "UNAVAILABLE_VIDEO",
	"This video is private. Please make it public then resubmit.": "PRIVATE_VIDEO",
	"Runs have to be done in an unmodded version of the game.": "MODDED_VERSION",
	"This side does not support direct upload. Please upload your video on a dedicated hosting platform then resubmit with a link leading to it.": "DIRECT_UPLOAD",
	"This site does not support direct upload. Please upload your video on a dedicated hosting platform then resubmiting with a link leading to it.": "DIRECT_UPLOAD",
	"A few minutes are missing between the recorded parts.": "PART_MISSING",
	"The game has to be fully paused for the run to end.": "FINAL_PAUSE_MISSING",
	"The screen should not be cropped.": "CROPPED_VIDEO",
	"The video is not available. Please make it public then resubmit.": "UNAVAILABLE_VIDEO",
	"A video record of the full run is required to appear on these leaderbards.": "NO_VIDEO",
	"The video is not available anymore": "UNAVAILABLE_VIDEO",
	"Unfortunately, the latest version allowed in this category is 1.9.9.1/1.9.10.": "NEWER_VERSION",
	"Moved to https://www.speedrun.com/sbace/runs/m7eo7j9z": "MOVED_RUN",
	"The video is corrupted.": "CORRUPTED_VIDEO",
	"Please upload your video on a dedicated hosting platform and resubmit with a link leading to it": "DIRECT_UPLOAD",
	"Moved to https://www.speedrun.com/sba/runs/ydv2nqxy": "MOVED_RUN",
	"In this category, you also have to beat the boss and rescue Barry after collecting stickers.": "BOSS_MISSING_AFTER_STICKERS",
	"Please upload your video on an dedicated hosting platform then resubmit with a link leading to it.": "DIRECT_UPLOAD",
	"A record of the full run is required to appear on these leaderboards.": "NO_VIDEO",
	"In this category, the latest versions allowed are 1.9.9.1 and 1.9.10. Newer versions are not allowed.": "NEWER_VERSION",
	"The muscle car is not allowed in speedruns as it is pay to win.": "MUSCLE_CAR",
	"A video of the full run is required to appear on these leaderboards": "NO_VIDEO",
	"In this category, you should also beat the boss and save Barry at the end. Also in this category versions after 1.9.10 are not allowed.": "NEWER_VERSION",
	"Speedruns should be done in an unmodded version of the game": "MODDED_VERSION",
	"As per the rules, pausing while waiting for Dr Christopher's key is not allowed.": "KEY_EXPLOIT",
	"Runs done in beta versions are not allowed (also this is multiplayer).": "BETA_VERSION",
	"In this category you have to escape to end the run.": "ESCAPE_MISSING",
	"In this category you have to escape to end the run. This category won't be kept though due to it being too similar to newer Backrooms% categories.": "ESCAPE_MISSING",
	"This version is not allowed in this category.": "DESERT_RACE_EXPLOIT",
	"You forgot to rescue Blossom.": "BLOSSOM_MISSING",
	"Going out of bounds with the vacuum cleaner is not allowed in this category.": "VACUUM_CLEANER",
});
function computeReasons(players) {
	const reasons = Object.create(null);
	for (const playerDates of Object.values(players)) {
		for (const [date, dateRuns] of Object.entries(playerDates)) {
			if (!date.startsWith("2025-")) {
				continue;
			}
			for (const run of dateRuns) {
				const {annotation, status} = run;
				if (status !== "rejected" || annotation == null) {
					reasons[""] ??= 0
					++reasons[""];
					continue;
				}
				const knownReason = knownReasons[annotation] ?? "XXX";
				// const normalizedAnnotation = normalizedAnnotations[knownReason] ?? "xxx";
				reasons[knownReason] ??= 0
				++reasons[knownReason];
			}
		}
	}
	return reasons;
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
function sortReasons(reasons) {
	sort(reasons, (reason) => {
		return reason[1];
	});
	return reasons;
}
const reasons = computeReasons(players);
const sortedReasons = Object.fromEntries(sortReasons(Object.entries(reasons)).reverse());
await writeFile(`appeal.json`, `${JSON.stringify(sortedReasons, null, "\t")}\n`);
