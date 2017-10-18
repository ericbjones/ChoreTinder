settings = {
    prodSlackWebhookURL: 'WEBHOOK URL FOR SLACK CHANNEL',
    slackRemindersURL: 'https://slack.com/api/reminders.add',
    slackToken: 'TOKEN INSERT HERE',
    googleSpreadsheet: 'GOOGLE SPREADSHEET TO REFERENCE'
};

/// Sorted list of people information (so rows are rearranged from spreadsheet)
var peopleData = undefined;

/// Slack Webook URL to use (changing this will affect which slack channel is notified)
var slackWebookURL = settings.prodSlackWebhookURL

/// Entry point of application when run is pressed from menu
function myFunction() {
    removeAllTimers()
    createTimer()
}

// Accepts a Date object or date string that is recognized by the Date.parse() method
function getDayOfWeek(date) {
  var dayOfWeek = new Date(date).getDay();    
  return isNaN(dayOfWeek) ? null : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];
}

/// Reads Spreadsheet and assigns chores
function startProgram() {
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    peopleData = readPeopleSheet(doc);
    PropertiesService.getScriptProperties().setProperty('peopleData', JSON.stringify(peopleData));
    var choreData = doc.getSheetByName('chores').getDataRange().getValues();
    assignChores(choreData);
}

/// Reads people sheet and sorts by chore count
function readPeopleSheet(doc) {
    var peopleSheet = doc.getSheetByName('people').getDataRange().getValues();
    var peopleSorted = peopleSheet.sort(function(x, y) {
        return x[1] <= y[1] ? -1 : 1;
    });
    return peopleSorted;
}

/// Returns row where user is stored in peopleData
function rowForUserInPeopleData(userName) {
    for (var row = 1; row < peopleData.length; row++) {
        if (peopleData[row][0] == userName) {
            return row;
        }
    }
    return undefined;
}

// Returns chore cell associated with userName
function choreCellForUser(userName) {
    var peopleSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('people');
    var dataList = peopleSheet.getDataRange().getValues();
    for (var row = 1; row < dataList.length; row++) {
        if (dataList[row][0] == userName) {
            return peopleSheet.getRange("B" + (row + 1));
        }
    }
    return undefined;
}

// Removes all timers
function removeAllTimers() {
    var allTriggers = ScriptApp.getProjectTriggers();
    for (var i = 0; i < allTriggers.length; i++) {
        ScriptApp.deleteTrigger(allTriggers[i]);
    }
}

// Creates timer
function createTimer() {
    // Trigger startProgram every Monday around 11:15 AM
    ScriptApp.newTrigger("startProgram")
        .timeBased()
        .onWeekDay(ScriptApp.WeekDay.MONDAY)
        .atHour(11)
        .nearMinute(15)
        .everyWeeks(1) // The frequency
        .create();

    //  ScriptApp.newTrigger("startProgram")
    //   .timeBased()
    //   .everyMinutes(1)
    //   .create();
}

/// Assigns chores to people provided
function assignChores(chores) {
    for (var row = 0; row < chores.length; row++) {
        for (var col = 0; col < chores[row].length; col++) {
            if (chores[row][col] == 'X') {
                var chore = chores[row][0];
                var weekday = chores[0][col]
                var time = formatTime(chores[row][1]);
                assignChore(weekday, time, chore);
                assignChore(weekday, time, chore);
            }
        }
    }
}

function assignChore(weekday, time, chore) {
    var rand_person = randPerson(weekday);
    (rand_person == undefined) ? postSlackChoreError(weekday, time, chore): postResponse(rand_person, weekday, time, chore);
}

/// Formats into readable string
function formatTime(timeDate) {
    var date = new Date(timeDate);
    var hours = date.getHours() > 12 ? date.getHours() - 12 : date.getHours();
    var am_pm = date.getHours() >= 12 ? "PM" : "AM";
    hours = hours < 10 ? "0" + hours : hours;
    var minutes = date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes();
    time = hours + ":" + minutes + " " + am_pm;
    return time
};

// Return person with lowest chore count and removes them from peopleData
function randPerson(weekday) {
    var col = columnForWeekday(weekday);
    if (col == undefined) {
        return undefined;
    }
    for (var row = 1; row < peopleData.length; row++) {
        if (peopleData[row][col] == 'X') {
            continue;
        }
        var person = peopleData.splice(row, 1); // removes entire row from peopleData and returns removed row
        PropertiesService.getScriptProperties().setProperty('peopleData', JSON.stringify(peopleData));
        return person[0][0];
    }
    return undefined;
}

/// Finds Column for a weekday. e.g. Monday outputs 2
function columnForWeekday(weekday) {
    for (var col = 2; col < 7; col++) {
        if (String(peopleData[0][col]).indexOf(weekday) !== -1) {
            return col
        }
    }
    return undefined
}
