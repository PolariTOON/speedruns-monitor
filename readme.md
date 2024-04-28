# Super Bear Adventure speedruns monitor

Tool used by the community to visualize the chronology of Super Bear Adventure speedruns

## Scripts

### `cache`

- Retrieves, pseudonymizes, aggregates, indexes, sorts and stores JSON snapshots for all the verified or rejected speedruns

### `plot`

- Generates SVG charts showing the run count and leaderboard count for each player over time, the run count and player count for each leaderboard over time, the time for each leaderboard for each player over time, the time for each player for each leaderboard over time, the record count for each player over time, and the record time for each leaderboard over time based on the cache
- Displays the activity period for each player or leaderboard

### `watch`

- Generates XHTML tables including all the speedruns with dates as columns and players or leaderboards as rows based on the cache
- Displays the activity period for each player or leaderboard
- Displays the moderator notes for both verified and rejected speedruns
