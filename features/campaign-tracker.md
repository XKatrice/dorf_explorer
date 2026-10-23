# Campaign tracker

The **Game History** navigation item opens `campaign.html`. The new **Campaign** item opens `campaign-tracker.html`.

Saving a new score opens Campaign so the player can spend their movement points. Editing a saved score returns to Game History. Existing games contribute automatically.

Movement earned is calculated from each saved game's current total using `game_ranking.csv`. Movement spent is the number of circles recorded in the campaign. There is no separate award counter, so reloading or saving an edit cannot duplicate movement points. Editing or deleting a game recalculates earnings. If earnings fall below spending, existing progress remains visible and further spending is blocked until enough moves are undone or more points are earned.

The tree follows the supplied printed sheet: Box 1, Box 2, the branching achievement-card paths, and three Red Heart circles. Only circles cost movement points. A circle is selectable when connected to the explored tree, including when approaching a path from its far end. The path buttons provide the same actions as the map for keyboard and mobile use.

Default circle counts match the player's confirmed campaign sheet (map revision 2). The three heart markers sit on the fourth circle of their respective paths. Older campaigns retain valid connected moves and custom path counts; obsolete defaults are corrected, and any moves made invalid by the corrected tree are refunded to the available balance with an on-screen explanation. Loading alone does not overwrite the saved record. The former path-length editor has been removed from the page.

Campaign progress and player names are saved automatically under `dorfExplorerCampaign` in local storage, separately from the existing `dorfExplorerGames` history. Undo removes the latest move and refunds its point. There is one active campaign per browser, plus previous campaigns saved under `dorfExplorerCampaignArchives`.

Each scorecard captures the active campaign ID when it opens. Saving checks that this campaign is still active, and every saved game records its campaign ID. Older games without an association are retained and associated with the current campaign on the next successful save. A stale scorecard cannot write into a replacement campaign; the entered scores stay on the page and an error explains how to continue.

`js/data-store.js` centralises storage reads, writes, validation and multi-record updates. Missing records receive defaults, but malformed or inconsistent records are preserved and reported rather than replaced. Failed score saves retain the entered values and do not redirect, allowing a retry. Campaign reset attempts roll back completed writes if a later write fails; if rollback itself fails, the archive is kept as a recovery copy and the user is told what happened.

**Save campaign to file** downloads a JSON snapshot with campaign start/completion dates, players, all game details and rankings, achievement unlock dates, movement allocation, number of games, combined score, and the highest-scoring game's ID, date and score. Older campaigns use their earliest saved game date as the start date; unknown historic unlock dates remain empty.

**Mark campaign complete** records the completion timestamp; **Reopen campaign** clears it. Exporting an ongoing campaign leaves the completion date empty. **Start new campaign** archives a complete snapshot of the current campaign before clearing its active games, players and movement progress. Archived campaigns can be downloaded from the sidebar. Archive/reset write failures restore the previous active data. Exporting or archiving alone does not mark a campaign complete.

Completed campaigns reject score saves, game deletion, player-name changes and movement changes until reopened. Export, starting a new campaign and importing a file remain available. Unreadable archives display an error in the archive panel without hiding the valid active campaign; archive-dependent replacement operations still stop safely rather than overwrite unreadable data.

**Import campaign file** accepts a downloaded JSON file, validates its records and replays its progress before changing anything, and asks for confirmation with the players and game count. The current campaign is archived before replacement. Games, players, start/completion dates, unlock dates and movement progress are restored; derived totals are recalculated from the restored games. A fresh active campaign ID prevents already-open scorecards from writing into the restored campaign. Invalid files and failed storage writes leave the previous active campaign intact. Imports are limited to 10 MB.

Validation:

```powershell
& 'C:\Program Files\nodejs\node.exe' --test tests/editing.test.cjs tests/campaign.test.cjs tests/data-store.test.cjs
& 'C:\Program Files\nodejs\node.exe' tests/browser-smoke.cjs
```

The browser check uses a temporary, isolated Microsoft Edge profile and a temporary local server. It does not read or alter the user's browser data. It checks the map and path controls, saving, editing, deleting, balance changes, persistence, and mobile overflow, and writes screenshots to the temporary QA directory printed at completion.
