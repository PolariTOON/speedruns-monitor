import fs from "fs";
import fetch from "node-fetch";
import jsdom from "jsdom";
const {JSDOM} = jsdom;
const blocks = ["body", "table", "colgroup", "thead", "tbody", "tr", "td"];
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
async function getAll() {
	const dates = new Map();
	const players = new Map();
	for (const gameId of ["9d3rrxyd", "w6jl2ned"]) {
		const response = await fetch(`https://www.speedrun.com/api/v1/games/${gameId}/variables`);
		const {data} = await response.json();
		const version = data.find((variable) => (variable.name === "Version"));
		const slice = 200;
		await new Promise((resolve) => setTimeout(resolve, 800));
		for (let offset = 0;; offset += slice) {
			const response = await fetch(`https://www.speedrun.com/api/v1/runs?game=${gameId}&status=verified&orderby=date&direction=asc&offset=${offset}&max=${slice}`);
			const {data, pagination} = await response.json();
			if (pagination.size === 0) {
				break;
			}
			for (const run of data) {
				if (!dates.has(run.date)) {
					dates.set(run.date, Object.create(null));
				}
				const player = (() => {
					const player = run.players[0].rel === "user" ? run.players[0].id : "814p2558";
					if (!players.has(player)) {
						players.set(player, {
							arrival: null,
							dates: new Map(),
						});
					}
					return players.get(player);
				})();
				const date = (() => {
					const {date} = run;
					const {dates} = player;
					if (!dates.has(date)) {
						dates.set(date, new Set());
					}
					if (player.arrival == null || player.arrival > date) {
						player.arrival = date;
					}
					return dates.get(date);
				})();
				const href = run.weblink;
				const textContent = version.values.values[run.values[version.id]].label;
				const platform = run.system.platform;
				date.add({
					href: href,
					textContent: textContent !== "< 1.9.6" && textContent !== "Select or add one!" ? textContent : "",
					platform: platform,
				});
			}
			console.log(`Got runs ${offset}-${offset + slice - 1}`);
			await new Promise((resolve) => setTimeout(resolve, 800));
		}
	}
	const response = await fetch(`https://raw.githubusercontent.com/SuperBearAdventure/shicka/master/data/updates.json`);
	const updates = await response.json();
	for (const update of updates) {
		const {date, name} = update;
		const {android, ios} = date;
		if (android != null) {
			if (!dates.has(android)) {
				dates.set(android, Object.create(null));
			}
			dates.get(android).android = name;
		}
		if (ios != null) {
			if (!dates.has(ios)) {
				dates.set(ios, Object.create(null));
			}
			dates.get(ios).ios = name;
		}
	}
	const sortedDates = new Map(Array.from(dates).sort(([a], [b]) => {
		if (a < b) {
			return -1;
		}
		if (a > b) {
			return 1;
		}
		return 0;
	}));
	const sortedPlayers = new Map(Array.from(players).sort(([, {arrival: a}], [, {arrival: b}]) => {
		if (a < b) {
			return -1;
		}
		if (a > b) {
			return 1;
		}
		return 0;
	}));
	const dom = new JSDOM("<html xmlns=\"http://www.w3.org/1999/xhtml\">\n\t<head>\n\t\t<style>\n\t\t\t* {\n\t\t\t\tbox-sizing: border-box;\n\t\t\t}\n\t\t\ttable {\n\t\t\t\ttable-layout: fixed;\n\t\t\t\tborder-collapse: collapse;\n\t\t\t\ttext-align: center;\n\t\t\t\tvertical-align: middle;\n\t\t\t}\n\t\t\tcol {\n\t\t\t\tbackground: repeating-linear-gradient(45deg, var(--android, #0000) 0 2px, var(--ios, #0000) 0 4px);\n\t\t\t}\n\t\t\tcol[data-android] {\n\t\t\t\t--android: #ffc;\n\t\t\t}\n\t\t\tcol[data-ios] {\n\t\t\t\t--ios: #ccf;\n\t\t\t}\n\t\t\tthead {\n\t\t\t\twriting-mode: sideways-lr;\n\t\t\t}\n\t\t\tth,\n\t\t\ttd {\n\t\t\t\tmin-width: 40px;\n\t\t\t\tmin-height: 40px;\n\t\t\t\tpadding: 0;\n\t\t\t\tborder: 1px solid #000;\n\t\t\t}\n\t\t\tth {\n\t\t\t\tpadding: 10px;\n\t\t\t}\n\t\t\tth[data-android]::after {\n\t\t\t\tcontent: \" (\" attr(data-android) \")\";\n\t\t\t}\n\t\t\tth[data-ios]::after {\n\t\t\t\tcontent: \" (\" attr(data-ios) \")\";\n\t\t\t}\n\t\t\tth[data-android][data-ios]::after {\n\t\t\t\tcontent: \" (\" attr(data-android) \", \" attr(data-ios) \")\";\n\t\t\t}\n\t\t\ttd:not(:first-of-type:empty, :last-of-type:empty) {\n\t\t\t\tbackground: #3333;\n\t\t\t}\n\t\t\ta {\n\t\t\t\tdisplay: block;\n\t\t\t\tpadding: 10px;\n\t\t\t\tbackground: #6f6;\n\t\t\t\tcolor: #000;\n\t\t\t}\n\t\t\ta[data-platform=\"gde3xgek\"] {\n\t\t\t\toutline: 5px solid #66f;\n\t\t\t\toutline-offset: -5px;\n\t\t\t}\n\t\t\ta:empty {\n\t\t\t\tbackground: #f66;\n\t\t\t}\n\t\t\ta:empty::before {\n\t\t\t\tcontent: \"?\";\n\t\t\t}\n\t\t</style>\n\t</head>\n</html>\n", {
		contentType: "application/xhtml+xml",
	});
	const {document} = dom.window;
	const html = document.documentElement;
	const body = document.createElement("body");
	const table = document.createElement("table");
	const colgroup = document.createElement("colgroup");
	const col = document.createElement("col");
	const thead = document.createElement("thead");
	const tr = document.createElement("tr");
	const th = document.createElement("th");
	colgroup.append(col);
	tr.append(th);
	for (const [date, platforms] of sortedDates) {
		const col = document.createElement("col");
		const th = document.createElement("th");
		th.textContent = date;
		for (const platform in platforms) {
			col.setAttribute(`data-${platform}`, platforms[platform]);
			th.setAttribute(`data-${platform}`, platforms[platform]);
		}
		colgroup.append(col);
		tr.append(th);
	}
	thead.append(tr);
	table.append(colgroup);
	table.append(thead);
	const tbody = document.createElement("tbody");
	for (const [player, {dates: playerDates}] of sortedPlayers) {
		const tr = document.createElement("tr");
		const th = document.createElement("th");
		th.textContent = player;
		tr.append(th);
		let span = 0;
		for (const [date] of sortedDates) {
			if (playerDates.has(date)) {
				if (span > 0) {
					const td = document.createElement("td");
					td.colSpan = span;
					tr.append(td);
				}
				const td = document.createElement("td");
				for (const run of playerDates.get(date) ?? []) {
					const p = document.createElement("p");
					const a = document.createElement("a");
					a.href = run.href;
					a.textContent = run.textContent;
					a.setAttribute("data-platform", run.platform);
					p.append(a);
					td.append(p);
				}
				tr.append(td);
				span = 0;
			} else {
				++span;
			}
		}
		if (span > 0) {
			const td = document.createElement("td");
			td.colSpan = span;
			tr.append(td);
		}
		tbody.append(tr);
	}
	table.append(tbody);
	body.append(table);
	html.append(body);
	indent(body, 1, true);
	await fs.promises.writeFile("table.xhtml", dom.serialize());
}
getAll();
