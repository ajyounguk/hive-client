var express = require('express')
var app = express()

var port = process.env.PORT || 3000

// configure assets and views
app.use('/assets', express.static(__dirname+'/public'))
app.set('views', __dirname+'/views');
app.set('view engine', 'ejs')

var hiveController = require('./controllers/hiveController')

hiveController(app)

console.log("Hive client listening on port", port)

app.listen(port)

