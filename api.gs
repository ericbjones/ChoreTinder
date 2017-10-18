/// Creates JSON to assign chore. Should be sent to Slack
function createJSONForAssignChore(userName, weekday, time, chore) {
    var payload = {
      "username": userName,
      "text": "<" + userName + "> You've been matched with a new chore :satiger:",
        "attachments": [{
            "title": chore + " on " + weekday + " at " + time,
            "title_link": settings.googleSpreadsheet,
            "fallback": "You are unable to select an option",
            "callback_id": "choreId",
            "color": "#3AA3E3",
            "attachment_type": "default",
            "actions": [{
                    "name": "yes" + " " + weekday, // couldn't add metaData (weekday, time, chore) as properies to JSON. value is also string limited so split between name and value. very hacky but works
                    "text": "Yes",
                    "type": "button",
                    "value": time + " " + chore,
                    "style": "primary"
                },
                {
                    "name": "no" + " " + weekday, // couldn't add metaData (weekday, time, chore) as properies to JSON. value is also string limited so split between name and value. very hacky but works
                    "text": "No",
                    "type": "button",
                    "value": time + " " + chore,
                    "style": "danger"
                }
            ]
        }]
    };
    return payload;
}

/// Posts message to slack
function postResponse(userName, weekday, time, chore) {
    var payload = createJSONForAssignChore(userName, weekday, time, chore);
    var options = {
        'method': 'post',
        'payload': JSON.stringify(payload)
    };

    var response = UrlFetchApp.fetch(slackWebookURL, options);
}


/// Receives incoming post requests from client
function doPost(req) {
    var payload = JSON.parse(req.parameter.payload)
    var userId = payload.user.id;
    var userName = payload.user.name;
    var action = payload.actions[0]
    var actionList = action.name.split(" ")
    var valueList = action.value.split(" ")
    var actionName = actionList[0]
    var weekday = actionList[1]
    var time = valueList[0] + " " + valueList[1]
    var chore = valueList[2];
    for (var i = 3; i < valueList.length; i++) {
        chore += " " + valueList[i];
    }
    return respondToUserSelectionActionFromSlack(userId, userName, actionName, weekday, time, chore);
};

/// Receives incoming get requests from client
function doGet(e) {
    return HtmlService.createHtmlOutputFromFile('Index');
}

/// Posts message to slack regarding error for finding a chore
function postSlackChoreError(weekday, time, chore) {
    var payload = {
        "text": "_Unable to find someone_ for *" + chore + "* this *" + weekday + "* at *" + time + "* " + ":sad-panda:",
    };
    var options = {
        'method': 'post',
        'payload': JSON.stringify(payload)
    };
    var response = UrlFetchApp.fetch(slackWebookURL, options);
}

/// Hits Slack Reminder API to create a reminder for the user
function postReminder(user, text, time) {

    var payload = {
        "token": settings.slackToken,
        "text": text,
        "time": time,
        "user": user
    };

    var options = {
        'method': 'post',
        'payload': payload
    };

    var response = UrlFetchApp.fetch(settings.slackRemindersURL, options);
}

/// Responds to user making an action selection on Slack
function respondToUserSelectionActionFromSlack(userId, userName, actionName, weekday, time, chore) {
    peopleData = JSON.parse(PropertiesService.getScriptProperties().getProperty('peopleData'));
    var personChoreCountCell = choreCellForUser("@" + userName)
    if (actionName == "yes") {
        var payload = {
            "username": "Chore Tinder",
            "attachments": [{
                "title": chore + " on " + weekday + " at " + time,
                "title_link": settings.googleSpreadsheet,
                "text": ":white_check_mark: Reminder created for " + userName,
                "fallback": "You are unable to select an option",
                "callback_id": "choreId",
                "color": "#3AA3E3",
                "attachment_type": "default"
            }]
        }
        personChoreCountCell.setValue(personChoreCountCell.getValue() + 1)
        /// if app runs on monday, reminder API creates reminder for next Monday instead. This resolves issue by explictly stating today instead of using "Monday" string.
        var todayDate = new Date()
        if (getDayOfWeek(todayDate) == weekday) {
            weekday = "today"
        }
        postReminder(userId, chore, weekday + " " + time)
        return ContentService.createTextOutput(JSON.stringify(payload))
            .setMimeType(ContentService.MimeType.JSON);
    } else {
        personChoreCountCell.setValue(personChoreCountCell.getValue() - 1)
        var row = rowForUserInPeopleData("@" + userName)
        var col = columnForWeekday(weekday)
        if (row == undefined) {
            // update existing slack interactive message to update
            assignChore(weekday, time, chore)
            return ContentService.createTextOutput(userName + " has already been assigned a chore or does not exist in chore list.")
                .setMimeType(ContentService.MimeType.JSON);
        } else if (col == undefined) {
            return ContentService.createTextOutput("Cannot find " + weekday + " in chore list weekdays.")
                .setMimeType(ContentService.MimeType.JSON);
        } else {
            // PeopleData marks X so next person can be chosen. Does not affect actual spreadsheet.
            peopleData[row][col] = 'X'
            var rand_person = randPerson(weekday);
            var payload = createJSONForAssignChore(rand_person, weekday, time, chore);
            return ContentService.createTextOutput(JSON.stringify(payload))
                .setMimeType(ContentService.MimeType.JSON);
        }
    }
}
