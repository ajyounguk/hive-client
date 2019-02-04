# hive-access - a hive thermostat web app


## What is this?
A Node.js web app that integrates with the Hive Thermostat API, provides functionality to view Hive data and export temperature history to .csv file.

![Alt text](/screenshots/history.png)

## Contains
- /config = sample config file for hive credentials (rename it to hive-config.json)
- /controllers = hive UI HTTP endpoints + Hive API integration controller 
- /views = UI views and partials (html + ejs)
- /public = css stylesheet for UI
- /screenshots = screenshots!
- /csv = location for .csv export files
- app.js main webserver code


## Functionality:

### done:
Simple HMTL UI supporting:
- Login
- View nodes
- View channels
- View events
- View users
- View topology 
- View temperature history
- Export temperature history to .csv file

### todo :
- temperature and water boost control
- refactor UI; it's a tech app needs to be a user friendly app
- graphs!?

## Acknowledgements
Based on James Saunders API reference at:
http://www.smartofthehome.com/2016/05/hive-rest-api-v6/

## Installation overview

### 1. Clone Repo an install module dependencies
```
https://github.com/ajyounguk/hive-client
cd hive-client
npm install
```

### 2. Hive Config:
Copy /config/hive-config-sample.json to hive-config.json
```
cp config-sample.json config.json
```
edit hive-config.json to include your Hive (web) login details


## How to run it
node app.js

### Launch the app:
point your browser at the local/remoteIP port 3000 (http://0.0.0.0:3000) to load the HTML app

#### CSV - if you use the .csv export function, files are stored in the /csv directory

### EOL Readme..
