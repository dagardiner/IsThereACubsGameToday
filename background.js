var inFanMode = false;
var timezone = "US/Central";

var gameCompleteIconSet = "20000101";
var gametimeDataRefreshTimer = false;
var gameTodayIcon = "cubs_color_nobg_128.png";
var noGameTodayIcon = "cubs_bw_nobg_128.png";

chrome.alarms.create("IsThereACubsGameUpdater", {
	when: Date.now() + 3000,
	periodInMinutes: 60
});
chrome.alarms.onAlarm.addListener(function(alarm) {
	if(alarm.name="IsThereACubsGameUpdater") {
		updateData();
	}
});
chrome.storage.sync.get([ 'cubsGameTodayFanMode','cubsTimeZone' ], function (result) {
	if(result.cubsGameTodayFanMode == true) {
		inFanMode = true;
		
	} else {
		inFanMode = false;
	}

	//This will add a duplicate context menu if the background is refreshed
	chrome.contextMenus.create({
		"documentUrlPatterns": [ window.location.protocol + "//" + window.location.hostname + "/*" ],
		"type":"checkbox",
		"checked":inFanMode,
		"title":"Enable Fan Mode",
		"contexts":["browser_action"],
		"onclick":function(info, tab) {
			inFanMode = info.checked;
			chrome.storage.sync.set({'cubsGameTodayFanMode': inFanMode });
			if(!inFanMode) {
				chrome.browserAction.setTitle({title: "Is There a Cubs Game Today?" });
				gameCompleteIconSet = "20000101";
				gameScoreBadgeSet = "20000101";
				updateData();
				if(gametimeDataRefreshTimer) {
					window.clearInterval(gametimeDataRefreshTimer);
					gametimeDataRefreshTimer = false;
				}
			}
			updateData();
		}
	});

	if(result.cubsTimeZone) {
		timezone = result.cubsTimeZone;
	}

	chrome.contextMenus.create({
		"documentUrlPatterns": [ window.location.protocol + "//" + window.location.hostname + "/*" ],
		"type":"separator"
	});

	chrome.contextMenus.create({
		"documentUrlPatterns": [ window.location.protocol + "//" + window.location.hostname + "/*" ],
		"type":"radio",
		"checked": timezone == "US/Pacific",
		"title":"Pacific Time",
		"contexts":["browser_action"],
		"onclick":function(info, tab) {
			saveTimeZone("US/Pacific");
		}
	});
	chrome.contextMenus.create({
		"documentUrlPatterns": [ window.location.protocol + "//" + window.location.hostname + "/*" ],
		"type":"radio",
		"checked": timezone == "US/Mountain",
		"title":"Mountain Time",
		"contexts":["browser_action"],
		"onclick":function(info, tab) {
			saveTimeZone("US/Mountain");
		}
	});
	chrome.contextMenus.create({
		"documentUrlPatterns": [ window.location.protocol + "//" + window.location.hostname + "/*" ],
		"type":"radio",
		"checked": timezone == "US/Central",
		"title":"Central Time",
		"contexts":["browser_action"],
		"onclick":function(info, tab) {
			saveTimeZone("US/Central");
		}
	});
	chrome.contextMenus.create({
		"documentUrlPatterns": [ window.location.protocol + "//" + window.location.hostname + "/*" ],
		"type":"radio",
		"checked": timezone == "US/Eastern",
		"title":"Eastern Time",
		"contexts":["browser_action"],
		"onclick":function(info, tab) {
			saveTimeZone("US/Eastern");
		}
	});
});
chrome.browserAction.onClicked.addListener(function() {
	if(inFanMode) {
		chrome.tabs.create({url: "http://m.mlb.com/scoreboard/"});
	} else {
		chrome.tabs.create({url: "http://www.isthereacubsgametoday.com"});
	}
});
function saveTimeZone(newzone) {
	timezone = newzone;
	chrome.storage.sync.set({'cubsTimeZone': newzone });
	//console.log("Timezone updated to " + newzone);
	updateData();
}

function updateData() {
	var today = new Date();
	var dd = today.getDate();
	var mm = today.getMonth() + 1; //January is 0
	var yyyy = today.getFullYear();
	if(mm < 10){
	    mm = '0' + mm
	}
	if(dd < 10){
	    dd = '0' + dd
	} 
	updateIcon(yyyy, mm, dd);
	if(inFanMode){
		updateCubsGameData(yyyy, mm, dd);
	}
}
function updateIcon(yyyy, mm, dd) {
  //We do not get a response if there is no game, so reset before the request
  if(!inFanMode) {
    chrome.browserAction.setBadgeText({text:""});
  }
  console.log("Icon last updated from game completion " + gameCompleteIconSet + ", it is currently " + (yyyy + mm + dd))
  if(gameCompleteIconSet != (yyyy + mm + dd)) {
    chrome.browserAction.setIcon({path: noGameTodayIcon});
  }
  
	var xmlHttp = new XMLHttpRequest();
	xmlHttp.open("GET", "http://isthereacubsgametoday.com/" + yyyy + "-" + mm + "-" + dd, true); // false for synchronous request
	xmlHttp.onreadystatechange = function() {
		if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
      var gameData = JSON.parse(xmlHttp.responseText)[0];
			if(!gameData) gameData = JSON.parse(xmlHttp.responseText);
			//TODO: support if we get more than one game (ie if there's a double-header)
			//TODO: support concerts and whatnot.  The API doesn't yet support that information.
			
			//Expected Returns:
			//[{"eventDate":"2016-08-29","eventTime":"7:05 PM","eventType":"game"}]
			//[]

			if(gameData && gameData.eventType == "game" && gameData.eventTime != "¯_(ツ)_/¯") {
				if(!inFanMode) {
					var gameTime = gameData.eventTime;
					gameTime = getTzAdjustedTime(yyyy, mm, dd, gameTime.replace(' PM', '').replace(' AM', ''));
					//chrome.browserAction.setBadgeText({text:gameData.eventTime.replace(' PM', '').replace(' AM', 'am')});
					chrome.browserAction.setBadgeText({text:gameTime});
				}
				console.log("Icon last updated from game completion " + gameCompleteIconSet + ", it is currently " + (yyyy + mm + dd))
				if(gameCompleteIconSet != (yyyy + mm + dd)) {
					chrome.browserAction.setIcon({path: gameTodayIcon});
				}
			}
		}
	}
	xmlHttp.send(null);
}
function updateCubsGameData(yyyy, mm, dd) {
	//http://riccomini.name/posts/game-time-baby/2012-09-29-streaming-live-sports-schedule-scores-stats-api/
	var xmlHttp = new XMLHttpRequest();
	xmlHttp.open("GET", "http://gd2.mlb.com/components/game/mlb/year_" + yyyy + "/month_" + mm + "/day_" + dd + "/master_scoreboard.json", true); // false for synchronous 
	xmlHttp.send(null);
	xmlHttp.onreadystatechange = function() {
		if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
			var gameInfo = JSON.parse(xmlHttp.responseText);
			var cubsGames;

			if(gameInfo.data.games.game) {
				cubsGames = $.grep(gameInfo.data.games.game, function(game){ 
					return ( game.home_team_name == "Cubs" || game.away_team_name == "Cubs" ) && game.original_date == (yyyy + "/" + mm + "/" + dd) ; 
				});
			}

			//If there's only one game, game is an object rather than an array, and grep fails
			if(cubsGames && cubsGames.length == 0 && (gameInfo.data.games.game.home_team_name == "Cubs" || gameInfo.data.games.game.away_team_name == "Cubs" ) && gameInfo.data.games.game.original_date == (yyyy + "/" + mm + "/" + dd)) {
				cubsGames[0] = gameInfo.data.games.game;
			}

			var tagText = "No Cubs game today";
			var badgeText = "";

			if(cubsGames && cubsGames.length > 0) {
				//TODO: support if we get more than one game (ie if there's a double-header)
				game = cubsGames[0];
				//console.log(game);
				var cubsScore = 0;
				var otherScore = 0;
				var otherName = "other guys";
				var gameTime = "game time";
				var pitcher = { name_display_roster: "the pitcher" };
				var venue = game.venue;

				if(game.home_team_name == "Cubs") {
					if(game.linescore) {
						cubsScore = game.linescore.r.home;
						otherScore = game.linescore.r.away;
					}
					otherName = game.away_team_name;
					gameTime = game.home_time;
					pitcher = game.home_probable_pitcher;
				} else if (game.away_team_name == "Cubs") {
					if(game.linescore) {
						cubsScore = game.linescore.r.away;
						otherScore = game.linescore.r.home;
					}
					otherName = game.home_team_name;
					gameTime = game.away_time;
					pitcher = game.away_probable_pitcher;
				}

				if(pitcher == null) {
					pitcher = game.pitcher
				}

				if(game.status.status == "Preview") {
					var localGameTime = getTzAdjustedTime(yyyy, mm, dd, gameTime);
					tagText = "Cubs vs " + otherName + " at " + venue + " will start at " + localGameTime + " " + moment.tz(timezone).format('z') + " with " + pitcher.name_display_roster + " pitching";
					badgeText = localGameTime;
					//gameCompleteIconSet = "20000101"; //in case we haven't reset the icon when the day rolls over
				} else if(game.status.status == "Postponed") {
					if(game.status.reason)
            tagText = "Cubs vs " + otherName + " at " + venue + " is postponed because of " + game.status.reason;
          else
            tagText = "Cubs vs " + otherName + " at " + venue + " is postponed";
					badgeText = "PPD";
					currentlyPreGame = true;
					//gameCompleteIconSet = "20000101"; //in case we haven't reset the icon when the day rolls over
				} else if (game.status.status == "Pre-Game" || game.status.status == "Warmup"){
					var localGameTime = getTzAdjustedTime(yyyy, mm, dd, gameTime);
					tagText = "Cubs vs " + otherName + " at " + venue + " will start shortly at " + localGameTime + " " + moment.tz(timezone).format('z') + " with " + pitcher.name_display_roster + " pitching";
					badgeText = localGameTime;

					if(gametimeDataRefreshTimer == false) {
						//console.log("Setting data refresh interval for a game that will be starting shortly");
						gametimeDataRefreshTimer = setInterval(updateData, 120000); //2 minutes
					}
				} else if(game.status.status == "Final" || game.status.status == "Game Over") {
					var gameResult;
					if(Number(cubsScore) > Number(otherScore)) {
						scoreStatus = "beat";
						chrome.browserAction.setIcon({path: "win.png" });
						gameCompleteIconSet = (yyyy + mm + dd);
						console.log("Set game win icon at " + gameCompleteIconSet)
					} else if(Number(cubsScore) < Number(otherScore)) {
						scoreStatus = "lost to";
						chrome.browserAction.setIcon({path: "loss.png" });
						gameCompleteIconSet = (yyyy + mm + dd);
						console.log("Set game loss icon at " + gameCompleteIconSet)
					} else if(cubsScore == otherScore) {
						scoreStatus = "tied";
					}

					tagText = "The Cubs " + scoreStatus + " the " + otherName + " " + cubsScore + "-" + otherScore + " at " + venue;
					badgeText = cubsScore + "-" + otherScore;

					if(gametimeDataRefreshTimer) {
						//console.log("Clearing data refresh interval for a completed game");
						window.clearInterval(gametimeDataRefreshTimer);
						gametimeDataRefreshTimer = false;
					}
				} else if(game.status.status == "In Progress" || game.status.status == "Manager Challenge") {
					var scoreStatus;
					if(cubsScore > otherScore) {
						scoreStatus = "leading";
					} else if(cubsScore < otherScore) {
						scoreStatus = "trailing";
					} else if(cubsScore == otherScore) {
						scoreStatus = "tied with";
					}

					var inningString = game.status.inning;
					if (inningString == 1) {
						inningString += "st";
					} else if (inningString == 2) {
						inningString += "nd";
					} else if (inningString == 3) {
						inningString += "rd";
					} else {
						inningString += "th";
					}

					tagText = "The Cubs are " + scoreStatus + " the " + otherName + " " + cubsScore + "-" + otherScore + " in the " + game.status.inning_state.toLowerCase() + " of the " + inningString + " with " + pitcher.name_display_roster + " pitching at " + venue + " (updated " + (new Date()).toLocaleTimeString() + ")";
					badgeText = cubsScore + "-" + otherScore;

					if(gametimeDataRefreshTimer == false) {
						//console.log("Setting data refresh interval for an active game");
						gametimeDataRefreshTimer = setInterval(updateData, 120000); //2 minutes
					}
				} else {
					console.log("Unknown game status of " + game.status.status);
					tagText = false; //if it's an unknown state, don't change anything - this is a bug
					badgeText = false;
				}
			} else {
				tagText = "No Cubs game today";
				badgeText = "";
			}

			//console.log(tagText);
			if(tagText) {
				chrome.browserAction.setTitle({title: tagText });
				/*
				chrome.browserAction.getTitle({}, function(title) {
					if(tagText.substring(0, Math.max(0, (tagText.length - 15))) !== title.substring(0, Math.max(0, (title.length - 15)))) {
						chrome.browserAction.setTitle({title: tagText });
					} else {
						console.log("no change to title");
					}
				})
			*/
			}
			if(badgeText !== false) {
				chrome.browserAction.setBadgeText({text: badgeText});
			}
		}
	}
}
function getTzAdjustedTime(yyyy, mm, dd, time) {
	if(time.split(':')[0].length == 1) {
		time = "0" + time;
	}
	var centralTime = moment.tz(yyyy + "-" + mm + "-" + dd + " " + time + ":00PM", "US/Central");
	var localTime = centralTime.tz(timezone).format('hh:mm'); //HH:mm
	if(localTime[0] == '0')
		localTime = localTime.substring(1);
	return localTime;
}