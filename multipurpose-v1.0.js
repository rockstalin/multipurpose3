var express = require('express');
var cookieSession = require('cookie-session')
var slashes = require("connect-slashes");
var ParseServer = require('parse-server').ParseServer;
var ParseDashboard = require('parse-dashboard');
var bodyParser = require('body-parser');
var path = require('path');
var cons = require('./constants.js');


var fs = require('fs');
var iosPushArray = JSON.parse(fs.readFileSync(path.resolve(__dirname,'push_iOS.json'), 'utf8'));


for (var i = 0; i < iosPushArray.length; i++) {
  var obj = iosPushArray[i];

  obj.pfx = path.resolve(__dirname, './p12/'+obj.pfx)
    

}


var androidPushArray = JSON.parse(fs.readFileSync(path.resolve(__dirname,'push_android.json'), 'utf8'));
var push = {}
if(androidPushArray.length>0){
  if(androidPushArray.length>1)
    push.android = androidPushArray
  else{
    push.android = androidPushArray[0]
  }
}
if(iosPushArray.length>0){
  if(iosPushArray.length>1)
    push.ios = iosPushArray
  else{
    push.ios = iosPushArray[0]
  }
}


/*
var adapter = require('parse-server-push-adapter-token-based').ParsePushAdapter;

var pushAdapter = new adapter(push);
*/

/*
var apn = require('apn');

// Set up apn with the APNs Auth Key
var apnProvider = new apn.Provider({
                                   
//     token: {
//        key: path.join(__dirname, './p12/AuthKey_VUXWXPVZYQ.p8'), // Path to the key p8 file
//        keyId: 'VUXWXPVZYQ', // The Key ID of the p8 file (available at https://developer.apple.com/account/ios/certificate/key)
//        teamId: 'LBS8X8MJQF', // The Team ID of your Apple Developer Account (available at https://developer.apple.com/account/#/membership/)
//    },
                                   
                                   bundleId: 'com.k7computing.virussecurity',
                                   pfx:path.join(__dirname, './p12/DevCertificates_20171030_101610_20171030_112241.p12'),
    production: false // Set to true if sending a notification to a production iOS app
});

// Enter the device token from the Xcode console
var deviceToken = '647c95382d9cdf08c84bf928a68a22cea62f30ea1ecc96bb73d620b1769de22e';

// Prepare a new notification
var notification = new apn.Notification();

// Specify your iOS app's Bundle ID (accessible within the project editor)
notification.topic = 'com.k7computing.virussecurity';

// Set expiration to 1 hour from now (in case device is offline)
notification.expiry = Math.floor(Date.now() / 1000) + 3600;

// Set app badge indicator
notification.badge = 3;

// Play ping.aiff sound when the notification is received
notification.sound = 'ping.aiff';

// Display the following message (the actual notification text, supports emoji)
notification.alert = 'Hello World \u270C';

// Send any extra payload data with the notification which will be accessible to your app in didReceiveRemoteNotification
notification.payload = {id: 123};

// Actually send the notification
apnProvider.send(notification, deviceToken).then(function(result) {  
    // Check the result for any failed devices
    console.log("Result", result);
});
*/




var api = new ParseServer({
  databaseURI: cons.DATABASE_URI,
  cloud: cons.CLOUD_DIR_PATH,
  appId: cons.APP_ID,
  masterKey: cons.MASTER_KEY,
  serverURL: cons.SERVER_URL,
  publicServerURL:cons.SERVER_URL,
  verbose: cons.VERBOSE,
  maxUploadSize : '1000mb',
                          push: push
});

var app = express();

app.use (function (req, res, next) {

  if(req.headers['x-parse-application-id'] === cons.APP_ID && !req.headers['ignore_me']){
    Parse.Cloud.httpRequest({
      url: cons.BASE_URL_LOCAL_Functions+"addHit",
      headers: {
          'X-Parse-Application-Id': cons.APP_ID,
          'ignore_me':true
      },
      method:'POST',
      body: {}
    }).then(function(httpResponse){
        next();
    },function(error){
      response.error(error)
    })
  }else{
    next();
  }
});

app.use(slashes(false));
app.use(cookieSession({
  name: 'session',
  secret: cons.SESSION_SECRET
}))
app.use(bodyParser.urlencoded({ extended: true}));

var rawBodySaver = function (req, res, buf, encoding) {
  if (buf && buf.length) {
    req.rawBody = buf.toString('base64');
  }
}
var rawBodySaver2 = function (req, res, buf, encoding) {
  if (buf && buf.length) {
    req.body = buf;
  }
}

app.use(bodyParser.raw({ verify: rawBodySaver, type: 'admin/file',limit:'1000mb' }));
app.use(bodyParser.raw({ verify: rawBodySaver2, type: 'admin/tar',limit:'1000mb' }));
app.use(bodyParser.raw({ verify: rawBodySaver2, type: 'admin/p12',limit:'1000mb' }));
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
app.use(express.static(__dirname + '/public'));

app.use('/',require('./routes/admin'));

app.get('/', function (req, res) {
  res.status(403).send()
});

app.use(cons.API_ROUTE, api);

app.use(cons.FILES_ROUTE, express.static(path.join(__dirname, cons.FILES_DIRECTORY)));

var config = {
  "allowInsecureHTTP": cons.INSECURE_HTTP,
  "apps": cons.apps
  ,"users": [
    {
      "user":cons.CMS_USER,
      "pass":cons.CMS_PASSWORD
    }
  ]
};
var dashboard = new ParseDashboard(config,config.allowInsecureHTTP);
app.use(cons.CMS_ROUTE, dashboard);

var httpServer = require('http').createServer(app);
httpServer.listen(cons.PORT, function() {
    Parse.Cloud.run("addDefaultAdmin", {}).then(function(results) {})
});
