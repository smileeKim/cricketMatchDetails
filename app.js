const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());

const databasePath = path.join(__dirname, "cricketMatchDetails.db");
let database = null;

const initializeDatabaseServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () =>
      console.log("Server Running at http://localhost:3000/")
    );
  } catch (error) {
    console.log(`Database Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDatabaseServer();

const convertPlayerDbObjectToResponseObject = (dbObject) => {
  return {
    playerId: dbObject.player_id,
    playerName: dbObject.player_name,
  };
};

//Returns a list of all the players in the player table
app.get("/players/", async (request, response) => {
  const getAllPlayers = `SELECT * FROM player_details;`;
  const playerName = await database.all(getAllPlayers);
  response.send(
    playerName.map((eachPlayer) =>
      convertPlayerDbObjectToResponseObject(eachPlayer)
    )
  );
});

//Returns a specific player based on the player ID
app.get("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerBaseOnPlayerIdQuery = `SELECT * FROM player_details WHERE player_id=${playerId};`;
  const playerDetails = await database.get(getPlayerBaseOnPlayerIdQuery);
  response.send(convertPlayerDbObjectToResponseObject(playerDetails));
});

//Updates the details of a specific player based on the player ID
app.put("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const { playerName } = request.body;
  const updatePlayerDetailsQuery = `
                   UPDATE 
                      player_details
                   SET
                      player_name = '${playerName}'
                   WHERE
                      player_id = ${playerId};
                   `;
  await database.run(updatePlayerDetailsQuery);
  response.send("Player Details Updated");
});

const convertMatchDetailsDbObjectToResponseObject = (dbObject) => {
  return {
    matchId: dbObject.match_id,
    match: dbObject.match,
    year: dbObject.year,
  };
};

//Returns the match details of a specific match
app.get("/matches/:matchId/", async (request, response) => {
  const { matchId } = request.params;
  const matchDetailsQuery = `
    SELECT
      *
    FROM
      match_details
    WHERE
      match_id = ${matchId};`;
  const matchDetails = await database.get(matchDetailsQuery);
  response.send(convertMatchDetailsDbObjectToResponseObject(matchDetails));
});

//Returns a list of all the matches of a player
app.get("/players/:playerId/matches/", async (request, response) => {
  const { playerId } = request.params;
  const getAllTheMatchesQuery = `
            SELECT 
                *
            FROM 
               player_match_score
               NATURAL JOIN
               match_details
            WHERE 
               player_id = ${playerId};
            `;
  const allMatchesPlayedByPlayer = await database.all(getAllTheMatchesQuery);
  response.send(
    allMatchesPlayedByPlayer.map((eachMatch) =>
      convertMatchDetailsDbObjectToResponseObject(eachMatch)
    )
  );
});

//Returns a list of players of a specific match
app.get("/matches/:matchId/players/", async (request, response) => {
  const { matchId } = request.params;
  const getAListOfPlayersQuery = `
            SELECT 
                 *
            FROM 
                player_details
                NATURAL JOIN
                player_match_score
            WHERE
                match_id = ${matchId};
            `;
  const allPlayersList = await database.all(getAListOfPlayersQuery);
  response.send(
    allPlayersList.map((eachPlayer) =>
      convertPlayerDbObjectToResponseObject(eachPlayer)
    )
  );
});

//Returns the statistics of the total score, fours, sixes of a specific player based on the player ID
app.get("/players/:playerId/playerScores/", async (request, response) => {
  const { playerId } = request.params;
  const getMatchPlayersQuery = `
             SELECT
                 player_id AS playerId,
                 player_name AS playerName,
                 SUM(score) AS totalScore,
                 SUM(fours) AS totalFours,
                 SUM(sixes) AS totalSixes
             FROM
                 player_match_score 
                 NATURAL JOIN
                 player_details
            WHERE 
                 player_id = ${playerId};
             `;
  const matchPlayerStat = await database.get(getMatchPlayersQuery);
  response.send(matchPlayerStat);
});

module.exports = app;
