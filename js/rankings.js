let rankingsPromise;

export function loadGameRankings() {
    if (!rankingsPromise) {
        rankingsPromise = fetch("game_ranking.csv?v=a8d45964ab16").then(async response => {
            if (!response.ok) throw new Error("Could not load game rankings. Please reload to try again.");
            const csv = await response.text();
            return csv.trim().split(/\r?\n/).slice(1).map(row => {
                const [score, title, movement] = row.split(",");
                return { minimumScore: Number(score), title: title.trim(), movementPoints: Number(movement) };
            }).sort((a, b) => b.minimumScore - a.minimumScore);
        }).catch(error => {
            rankingsPromise = null;
            throw error;
        });
    }
    return rankingsPromise;
}

export function findGameRanking(totalScore, rankings) {
    return rankings.find(ranking => totalScore >= ranking.minimumScore);
}
