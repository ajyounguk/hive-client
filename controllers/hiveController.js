module.exports = function (app) {

    var bodyParser = require('body-parser')
    var urlencodedParser = bodyParser.urlencoded({
        extended: false
    })

    var sessionToken = ""
    var fs = require('fs');
    var https = require('https')

    // menuitem = drives the ui menu options
    // data array = hive data for ui, array index corresponds to the relevant menu item/screen/function
    // channels = list of channels
    // 

    var ui = {
        menuitem: 1,
        data: [],
        nodes: {},
        channels: [],
        csv: 'disabled'
    }


    // 0. helper - hive http POST 
    function hive_http_post(postURL, postBody, callback) {

        // api response
        var apiResponse = {
            "status": "",
            "hivedata": {},
        }


        // Hive loign POST options & headers
        var hive_post_options = {
            host: 'api-prod.bgchprod.info',
            port: '443',
            path: '/omnia/' + postURL,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Omnia-Client': "Hive Web Dashboard",
                'Accept': 'application/vnd.alertme.zoo-6.1+json'
            }
        }

        // Set up the request - the callback function is where the action happens...
        var post_req = https.request(hive_post_options, function (http_response) {

            var chunk = ""
            var response = ""

            // following the post request, the response is returned to this callback
            http_response.setEncoding('utf8');

            http_response.on('data', function (chunk) {
                response += chunk
            })

            http_response.on('end', function () {

                var responseData = JSON.parse(response)

                if (responseData.errors) {
                    apiResponse.status = "ERROR"
                } else {
                    // setup JSON response
                    apiResponse.status = "SUCCESS"
                }

                apiResponse.hivedata = responseData
                callback(apiResponse)
            })
        })

        // check for POST errors
        post_req.on('error', function (err) {
            apiResponse.status = "ERROR"
            apiResponse.hivedata = "http post request for (" + postURL + ") failed:" + err
            callback(apiResponse)
        })

        // issue the POST request
        post_req.write(postBody)
        post_req.end()

    }



    // 0. helper - hive http GET 
    function hive_http_get(getUrl, callback) {

        var chunk = ""
        var response = ""

        var hive_get_options = {
            host: 'api-prod.bgchprod.info',
            port: '443',
            path: '/omnia/' + getUrl,
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Omnia-Client': "Hive Web Dashboard",
                'Accept': 'application/vnd.alertme.zoo-6.1+json',
                'X-Omnia-Access-Token': sessionToken
            }
        }

        var apiResponse = {
            "status": "",
            "hivedata": {},
        }

        // Set up the request
        var get_req = https.request(hive_get_options, function (http_res) {



            http_res.setEncoding('utf8');

            // concat the get response chunks
            http_res.on('data', function (chunk) {
                response += chunk
            })

            // when http response compolete parse it and return it
            http_res.on('end', function () {
                var responseData = JSON.parse(response)

                // hive API error?
                if (responseData.error) {
                    apiResponse.status = "ERROR"
                } else { // jobs'a'gud'on - setup JSON response
                    apiResponse.status = "SUCCESS"
                }

                apiResponse.hivedata = responseData
                callback(apiResponse)
            })
        })

        // handle get errors
        get_req.on('error', function (err) {
            apiResponse.status = "ERROR"
            apiResponse.hivedata = err
            callback(apiResponse)
        })
        // run the request
        get_req.end()
    }



    // 0. login and serve up index
    app.get('/', function (req, res) {

        ui = {
            menuitem: 1,
            data: [],
            nodes: {},
            channels: [],
            csv: 'disabled'
        }

        // log in and get session token (if not set)
        if (sessionToken == "") {

            // load config file
            var configFile = {}
            var hiveCreds = {}

            try {
                configFile = fs.readFileSync(__dirname + '/../config/hive-config.json', 'utf8');
            } catch (err) {
                if (err.code === 'ENOENT') {
                    res.status(500)
                    console.log("Error, can't read the hive.config.json file with credentials, check your /config directory \nand readme instructions at https://github.com/ajyounguk/hive-client")
                    res.send("Error, can't read the hive.config.json file with credentials, check your /config directory and instructions at https://github.com/ajyounguk/hive-client")
                } else {
                    throw err;
                }
            } 
                
            if (configFile.length > 0) {

                // parse config
                hiveCreds = JSON.parse(configFile)

                // setup remote POST body for Hive login
                var postData = {
                    "sessions": [{
                        "username": hiveCreds.username,
                        "password": hiveCreds.password,
                        "caller": "WEB"
                    }]
                }

                var postBody = JSON.stringify(postData)

                hive_http_post('auth/sessions', postBody, function (apiResponse) {
                    if (apiResponse.status == "SUCCESS") {
                        // set global sessionToken
                        sessionToken = apiResponse.hivedata.sessions[0].sessionId
                        console.log('Hive login success')
                    } else {
                        console.log('Hive login problem:\n', JSON.stringify(apiResponse, null, 3))
                    }
                })
            

                res.setHeader('Content-Type', 'text/html');
                res.render('./index', {
                    ui: ui
                })
            }
        }
    })



    // 1. get users
    app.post('/ui/users', function (req, res) {

        // call the GET helper
        hive_http_get('users', function (apiResponse) {
            ui.menuitem = 1
            ui.data[ui.menuitem] = apiResponse
            res.render('./index', {
                ui: ui
            })
        })
    })



    // 2. get nodes 
    app.post('/ui/nodes', function (req, res) {

        // call the GET helper
        hive_http_get('nodes', function (apiResponse) {

            ui.menuitem = 2
            ui.data[ui.menuitem] = apiResponse

            var nodes = {
                node: []
            }

            if (apiResponse.status == 'SUCCESS') {

                for (i = 0; i < apiResponse.hivedata.nodes.length; i++) {


                    nodes.node[i] = {
                        nodeID: '',
                        nodeName: '',
                        nodeType: '',
                        parentID: '',
                        child: []
                    }

                    nodes.node[i].nodeID = apiResponse.hivedata.nodes[i].id
                    nodes.node[i].nodeName = apiResponse.hivedata.nodes[i].name
                    nodes.node[i].parentID = apiResponse.hivedata.nodes[i].parentNodeId
                    nodes.node[i].nodeType = apiResponse.hivedata.nodes[i].nodeType

                    // lets find the children
                    var child = 0
                    for (x = 0; x < apiResponse.hivedata.nodes.length; x++) {

                        if (apiResponse.hivedata.nodes[i].id == apiResponse.hivedata.nodes[x].parentNodeId) {

                            nodes.node[i].child[child] = {
                                id: '',
                                name: '',
                                nodeType: '',
                                parentNodeId: ''
                            }

                            nodes.node[i].child[child].id = apiResponse.hivedata.nodes[x].id
                            nodes.node[i].child[child].name = apiResponse.hivedata.nodes[x].name
                            nodes.node[i].child[child].parentNodeId = apiResponse.hivedata.nodes[x].parentNodeId
                            nodes.node[i].child[child].nodeType = apiResponse.hivedata.nodes[x].nodeType

                            child++
                        }
                    }
                }

                ui.nodes = nodes
            }

            res.render('./index', {
                ui: ui
            })

        })
    })



    // 3. get channels
    app.post('/ui/channels', function (req, res) {

        // call the GET helper
        hive_http_get('channels', function (apiResponse) {

            ui.menuitem = 3
            ui.data[ui.menuitem] = apiResponse

            // this code is a bit messy - todo = refactor with helper functions..


            if (apiResponse.status == 'SUCCESS') {

                // build the channels list (to be used in the History function drop down selection)
                var channel = ''
                var id = ''
                var name = ''
                var el = 0
                var found = false


                // 1. loop through available channels 
                for (ch = 0; ch < ui.data[3].hivedata.channels.length; ch++) {

                    channel = ui.data[3].hivedata.channels[ch].id
                    id = ui.data[3].hivedata.channels[ch].links.node[0]


                    // 2. if these are temperature channels add them to the ui.channels list
                    if ((channel.indexOf('temperature@') > -1)) {

                        // 3. keep them unique though, only add if not found in array yet
                        found = false
                        for (uniq = 0; uniq < ui.channels.length; uniq++) {
                            if (ui.channels[uniq].channel == channel) {
                                found = true
                                break
                            }
                        }

                        // 4. add the channel if it's a new one
                        if (!found) {

                            // 5. lets find the node name for this channel
                            for (nn = 0; nn < ui.nodes.node.length; nn++) {

                                // 6. did we find it in nodes?
                                if (ui.nodes.node[nn].nodeID == id) {

/* dirty fix - API no longer supports type
                                    var str = ui.nodes.node[nn].nodeType
                                    var start = str.indexOf('.class') + 7
                                    var cut = str.substr(start)
                                    var end = cut.indexOf('.')
                                    var type = cut.substr(0, end)
*/

                                    // added to ui channels array
                                    ui.channels[el] = {
                                        id: id,
                                        name: ui.nodes.node[nn].nodeName,

/* dirty fis - API no longer support type
                                        type: type,
*/
                                        type: "none",
                                        channel: channel
                                    }
                                }
                            }

                            // next element / channel
                            el++
                        }
                    }
                } // main loop

            } // success if


            res.render('./index', {
                ui: ui
            })

        })
    })


    // 4. get events
    app.post('/ui/events', function (req, res) {

        // call the GET helper
        hive_http_get('events', function (apiResponse) {
            ui.menuitem = 4
            ui.data[ui.menuitem] = apiResponse
            res.render('./index', {
                ui: ui
            })
        })
    })



    // 5. get topology
    app.post('/ui/topology', function (req, res) {

        // call the GET helper
        hive_http_get('topology', function (apiResponse) {
            ui.menuitem = 5
            ui.data[ui.menuitem] = apiResponse
            res.render('./index', {
                ui: ui
            })
        })
    })



    // 6. get temperature history
    app.post('/ui/history', urlencodedParser, function (req, res) {


        // convert datetargetime to milliseconds since epoch
        var fromdate = new Date(req.body.fromdate)
        var todate = new Date(req.body.todate)
        var fromdate_m = fromdate.getTime();
        var todate_m = todate.getTime();


        var timeunit = req.body.timeunit
        var rate = req.body.rate
        var operation = req.body.operation
        var channel = req.body.channel

        var i = 0

        // little hack...
        // each temperature channel has also a target temperature equivalent, lets create the channel
        // name so we can request it's data during the temperature query / API call (we add it to the API URL)
        var targetChannel = 'targetTemperature' + channel.substring(11)

        getUrl =
            'channels/' +
            channel +
            ',' + targetChannel +
            '?start=' + fromdate_m +
            '&end=' + todate_m +
            '&rate=' + rate +
            '&TimeUnit=' + timeunit +
            '&operation=' + operation

        // call the GET helper    
        hive_http_get(getUrl, function (apiResponse) {
            // return results
            ui.menuitem = 6
            ui.data[ui.menuitem] = apiResponse

            // if we got data back enable the csv
            if (apiResponse.status == 'SUCCESS') {
                ui.csv = ''
            }


            res.render('./index', {
                ui: ui
            })
        })
    })



    // 7. get history to .csv
    app.get('/csv', urlencodedParser, function (req, res) {


        // generate csv filename helper function
        function unique_filename() {

            var date = new Date(Date.now())
            var filename = ''

            // helper padding function
            function pad(number) {
                if (number < 10) {
                    return '0' + number
                } else {
                    return number
                }
            }

            // create filename in /csv called hive_export_YYYYMMDD_HHMISS_MSS.csv
            filename =
                './csv/hive_export_' +
                date.getUTCFullYear() +
                pad(date.getUTCMonth() + 1) +
                pad(date.getUTCDate()) + '_' +
                pad(date.getUTCHours()) +
                pad(date.getUTCMinutes()) +
                pad(date.getUTCSeconds()) + '_' +
                (date.getUTCMilliseconds() / 1000).toFixed(3).slice(2, 5) + '.csv'

            return filename
        }

        // createfilename
        var filename = unique_filename()

        // load hive temperature data into array
        var hiveTimes = Object.keys(ui.data[6].hivedata.channels[0].values)
        var hiveTemps = Object.values(ui.data[6].hivedata.channels[0].values)

        // load hive target temperature data into array
        var hiveTargetTimes = Object.keys(ui.data[6].hivedata.channels[1].values)
        var hiveTargetTemps = Object.values(ui.data[6].hivedata.channels[1].values)

        var els = 0

        // which array has more data?
        if (hiveTimes.length >= hiveTargetTimes.length) {
            els = hiveTimes.length
        } else {
            els = hiveTargetTimes.length
        }


        // open file
        var fileStream = fs.createWriteStream(filename, {
            flags: 'a'
        })

        // csv labels/header
        fileStream.write('ISODate,Date,Time,Temperature,Target Temperature\n')

        var idx = 0
        var idxt = 0
        var num = 0
        var date = {}
        var numtarget = 0
        var datetarget = {}
        var csv = ''
        var tempcsv = ''
        var targetcsv = ''


        // loop through largest set (els)
        for (i = 0; i < els; i++) {

            num = Number(hiveTimes[idx])
            date = new Date(num).toISOString()

            numtarget = Number(hiveTargetTimes[idxt])
            datetarget = new Date(num).toISOString()


            // some logic below to interleave the temperature data with the target temperature data, 
            // as sometimes we get gaps in the data on either side, if there is something missing, we just add 
            // an empty ',' to the csv.. to keep the data output in sync

            // do we have the same timestamp? no gaps in temps
            if (num == numtarget) {

                tempcsv =
                    date + ',' +
                    date.substring(0, 10) + ',' +
                    date.substring(11, 19) + ',' +
                    hiveTemps[idx] + ','

                targetcsv =
                    hiveTargetTemps[idxt] + '\n'

                idx++
                idxt++
            }

            // theres a gap in the temperature
            if (num > numtarget) {

                tempcsv =
                    datetarget + ',' +
                    datetarget.substring(0, 10) + ',' +
                    datetarget.substring(11, 19) + ',' +
                    ','

                targetcsv =
                    hiveTargetTemps[i] + '\n'

                idxt++
            }


            // gap is in the target temperature
            if (num < numtarget) {

                tempcsv =
                    date + ',' +
                    date.substring(0, 10) + ',' +
                    date.substring(11, 19) + ',' +
                    hiveTemps[idx] + ','

                targetcsv =
                    '\n'

                idx++

            }

            // wirte to file
            csv = tempcsv + targetcsv
            fileStream.write(csv)
        }

        // close file
        fileStream.end()

        res.render('./index', {
            ui: ui
        })

    })

   
} // end of module

// EOL