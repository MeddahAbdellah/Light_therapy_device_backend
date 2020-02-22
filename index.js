console.log("Server loading...");
const express = require("express");
const bodyParser = require("body-parser");
const mysql = require('mysql');
const httpRequest = require("request");
const moment = require('moment-timezone');
const sha256 = require('sha256');
const app = express();
const redis = require("redis");
var redisClient = redis.createClient();
const mosca = require("mosca");

var server = new mosca.Server({
  port: 8080,
  http: {
    port: 9000,
    bundle: true,
    static: './'
  }
});
server.on('clientConnected', function(client) {
  console.log('client connected', client.id);
});
var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "password",
  port: "3306",
  database: "sten"
});
con.connect();
server.on('published', function(packet, client) {
  console.log('topic', packet.topic);
  console.log('Published', packet.payload.toString().split(','));
  var data = packet.payload.toString().split(',');
  if (data[0] == "n") {
    var id = sha256(data[1] + new Date().getTime()).toString().substring(0, 10).toUpperCase();
    con.query("INSERT INTO device_sessions SET ?", {
      device_id: data[1],
      session_id: id,
      session_creation_date: moment().tz("Europe/Tallinn").format('YYYY-MM-DD h:mm:ss')
    }, (error, result) => {
      var program = "";
      if (parseInt(data[2]) == 2) program = "low_intensity_program";
      else if (parseInt(data[2]) == 1) program = "normal_intensity_program";
      else if (parseInt(data[2]) == 0) program = "high_intensity_program";
      con.query("SELECT " + program + " FROM user_devices WHERE ? ", {
        device_id: data[1]
      }, (error, result) => {
        var program_name = "";
        if (parseInt(data[2]) == 2) program_name = result[0].low_intensity_program;
        else if (parseInt(data[2]) == 1) program_name = result[0].normal_intensity_program;
        else if (parseInt(data[2]) == 0) program_name = result[0].high_intensity_program;
        con.query("SELECT pattern FROM programs WHERE ? ", {
          name: program_name
        }, (error, result) => {
          console.log(result);
          if (result.length > 0) {
            console.log("Current Pattern : " + result[0].pattern);
            redisClient.set("program" + data[1], result[0].pattern, function() {
              redisClient.set("lastDose" + data[1], "0,0");
              var message = {
                topic: 'command' + data[1],
                payload: '1,' + id + ',' + data[2] + ',' + data[3],
                qos: 0,
                retain: false
              };
              server.publish(message, function() {
                console.log("STARTED SESSION");
              });
            });
          } else {
            redisClient.set("program" + data[1], "", function() {
              redisClient.set("lastDose" + data[1], "0,0");
              var message = {
                topic: 'command' + data[1],
                payload: '1,' + id + ',' + data[2] + ',' + data[3],
                qos: 0,
                retain: false
              };
              server.publish(message, function() {
                console.log("STARTED SESSION");
              });
            });
          }
        });
      });

    });
  } else if (packet.topic.toString().includes("data") && data.length == 4) {
    var info = {
      session_id: data[2],
      hr_val: data[3],
      rr_val: data[0],
      time_interval: data[1],
      logging_date: moment().tz("Europe/Tallinn").format('YYYY-MM-DD h:mm:ss')
    }
    con.query("INSERT INTO data SET ?", info, (error, result) => {
      if (error) console.error(error);

    });
  } else if (data.length == 8) {
    var sql = "";
    if (!parseInt(data[1])) sql += "INSERT INTO parameters SET session_id=" + con.escape(data[0]) + ", packet_id=" + con.escape(data[7]) + ", insert_date='" + moment().tz("Europe/Tallinn").format('YYYY-MM-DD h:mm:ss') + "',";
    else sql += "UPDATE parameters SET ";
    for (var i = 0; i < data.length - 3; i++) {
      sql += " param" + con.escape(parseInt(data[1]) * (data.length - 3) + i + 1) + "='" + data[2 + i] + "'";
      if (i < data.length - 4) sql += ",";
    }
    if (parseInt(data[1]) != 0) sql += " WHERE session_id=" + con.escape(data[0]) + " AND packet_id=" + con.escape(data[7]);
    //console.log("SQL QUERY : "+sql);
    con.query(sql, (error, result) => {
      if (error) console.error(error);
    });
    if (parseInt(data[1]) == 3) {
      //data[7]
      var device_id = packet.topic.toString().replace("data", '');
      redisClient.get("program" + device_id, function(err, reply) {
        console.log(reply);
        if (reply != null) {
          var program_data = reply.toString().split(',');
          redisClient.get("lastDose" + device_id, function(err, reply) {
            var lastDose = 0;
            var lastTime = 0;
            var slope = -1;
            var dose = "";
            var dFinal = 0;
            var dBegining = 0;
            var tFinal = 0;
            var tBegining = 0;
            if (reply != null) {
              reply = reply.toString().split(',');
              lastDose = parseInt(reply[0]);
              lastTime = parseInt(reply[1]);
              if (Number.isNaN(lastDose)) lastDose = 0;
              if (Number.isNaN(lastTime)) lastTime = 0;
            }
            for (var i = 0; i < program_data.length; i += 2) {

              if (parseFloat(data[6]) * 100 > parseInt(program_data[i]) && parseInt(program_data[i + 1]) != lastDose && (program_data[i] > lastTime || parseFloat(data[6]) * 100 < lastTime)) {
                console.log("Sending Dose : " + program_data[i + 1]);
                if ((i + 3) > program_data.length) {
                  dFinal = 100;
                  tFinal = 100;
                } else {
                  dFinal = parseInt(program_data[i + 3]);
                  tFinal = parseInt(program_data[i + 2]);
                }
                dBegining = program_data[i + 1];
                tBegining = program_data[i];
                slope = (dFinal - dBegining) / (tFinal - tBegining);
                dose = program_data[i + 1];
                redisClient.set("lastDose" + device_id, dose + ',' + program_data[i]);
              }
            }
            if (dose.length > 0) {
              if (slope > 1000) slope = 1000;
              var message = {
                topic: 'program' + device_id,
                payload: dose + ',' + slope,
                qos: 0,
                retain: false
              };
              setTimeout(function() {
                server.publish(message, function() {
                  console.log("GAVE DOSE");
                })
              }, 50);
            }
          });
        }
      });
    }
  } else if (data[0] == "s") {
    con.query("SELECT high_intensity, normal_intensity, low_intensity, start_timeout FROM user_devices WHERE ? ", {
      device_id: data[1]
    }, (error, result) => {
      if (error) throw error;
      console.log(result);
      if (result.length > 0) {

        var message = {
          topic: 'settings' + data[1],
          payload: result[0].high_intensity + ',' + result[0].normal_intensity + ',' + result[0].low_intensity + ',' + result[0].start_timeout,
          qos: 0,
          retain: false
        };
        server.publish(message, function() {
          console.log("GAVE SETTINGS");
        });

      }
    });
  } else if (data[0] == "d") {
    var message = {
      topic: 'deviceInfo' + data[3],
      payload: data[1] + ',' + data[2],
      qos: 0,
      retain: false
    };
    server.publish(message, function() {
      console.log("GAVE SETTINGS");
    });
  }
});
server.on('subscribed', function(topic, client) {
  console.log('Device connected : ', topic)
  var device_id = topic.replace("settings", "");
  device_id = device_id = topic.replace("command", "");
  device_id = device_id.replace("status", "");
  device_id = device_id.replace("data", "");
  device_id = device_id.replace("deviceInfo", "");
  var device_type = "w";
  if (client.id.includes("esp")) device_type = "m";
  else if (client.id.includes("APP")) device_type = "a,1";
  var message = {
    topic: "status" + device_id,
    payload: device_type + ",1," + device_id,
    qos: 0,
    retain: false
  };
});
server.on('unsubscribed', function(topic, client) {
  console.log('Device disconnected : ', topic);
  var device_id = topic.replace("settings", "");
  device_id = device_id = topic.replace("command", "");
  device_id = device_id.replace("status", "");
  device_id = device_id.replace("data", "");
  device_id = device_id.replace("deviceInfo", "");
  var device_type = "w";
  if (client.id.includes("esp")) device_type = "m";
  else if (client.id.includes("APP")) device_type = "a,0";
  var message = {
    topic: "status" + device_id,
    payload: device_type + ",0," + device_id,
    qos: 0,
    retain: false
  };
  server.publish(message, function() {});
});
server.on('ready', setup);

// fired when the mqtt server is ready
function setup() {
  console.log('Mosca server is up and running');
}



app.use(express.static("public"));
app.set('view engine', 'ejs');
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({
  extended: false
}))
// parse application/json
app.use(bodyParser.json())
//headers
app.use(function(req, res, next) {

  // Website you wish to allow to connect
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Request methods you wish to allow
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

  // Request headers you wish to allow
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

  // Set to true if you need the website to include cookies in the requests sent
  // to the API (e.g. in case you use sessions)
  res.setHeader('Access-Control-Allow-Credentials', true);

  // Pass to next layer of middleware()
  next();
});


app.get("/", (request, response) => {
  var n = request.query.n_main == undefined ? 10 : request.query.n_main;
  console.log(n)
  response.render('index', {
    n: n
  });
});
app.get("/login", (request, response) => {
  response.render('login', {
    title: 'Login'
  });
});
app.get("/subscribe", (request, response) => {
  response.render('subscribe', {
    title: 'Subscribe'
  });
});
app.get("/listDevices", (request, response) => {
  response.render('listDevices', {
    title: 'Device List'
  });
});
app.get("/listPrograms", (request, response) => {
  response.render('listPrograms', {
    title: 'Programs List'
  });
});

/* Database Interractions*/
app.post('/login', (req, res) => {
  var sql = "SELECT * FROM users WHERE user_email = " + con.escape(req.body.email) + " AND user_password = " + con.escape(sha256(req.body.password));
  console.log(sql);
  con.query(sql, (error, result) => {
    console.error(result);
    if (result.length < 1) res.send("E-mail Or Password incorrect.");
    else {
      res.send(result);
      console.log(result)
    }
  });
});
app.post('/subscribe', (req, res) => {
  var info = {
    user_name: req.body.user_name,
    user_surname: req.body.user_surname,
    user_email: req.body.user_email,
    user_password: sha256(req.body.user_password),
    account_creation_date: moment().tz("Europe/Tallinn").format('YYYY-MM-DD h:mm:ss')
  }
  con.query("INSERT INTO users SET ?", info, (error, result) => {
    if (error) throw error;
    else res.send(info);
  });
});
app.post('/newProgram', (req, res) => {
  con.query("INSERT INTO programs SET ?", {
    name: req.body.name,
    pattern: req.body.pattern,
    user_id: req.body.user_id
  }, (error, result) => {
    if (error) {
      res.status(400).send("Program Already Exists");
    } else {
      res.send(result);
    }
  });
});
app.post('/deleteDevice', (req, res) => {
  console.log("deleting");
  con.query("DELETE FROM user_devices WHERE ?", {
    device_id: req.body.device_id
  }, (error, result) => {
    if (error) res.send(error);
    else res.send(result);
  });
});
app.post('/changeDeviceSettings', (req, res) => {
  con.query("UPDATE user_devices SET high_intensity=?,normal_intensity=?,low_intensity=?,high_intensity_program=?,normal_intensity_program=?,low_intensity_program=?,start_timeout=? WHERE device_id = ?", [req.body.high, req.body.normal, req.body.low, req.body.high_program, req.body.normal_program, req.body.low_program, req.body.timeout, req.body.device_id], (error, result) => {
    if (error) res.send(error);
    else res.send(result);
  });
});
app.post('/modifyProgram', (req, res) => {
  con.query("UPDATE programs SET pattern=? WHERE user_id = ? AND name=?", [req.body.pattern, req.body.user_id, req.body.name], (error, result) => {
    console.log(error);
    if (error) res.send(error);
    else res.send(result);
  });
});
app.post('/deleteSession', (req, res) => {
  console.log(req.body.session_id);
  con.query("DELETE FROM device_sessions WHERE ?", {
    session_id: req.body.session_id
  }, (error, result) => {

    if (error) res.send(error);
    else res.send(result);
  });
});
app.post('/deleteProgram', (req, res) => {
  con.query("DELETE FROM programs WHERE name=? AND user_id=?", [req.body.name, req.body.user_id], (error, result) => {

    con.query("Update user_devices SET high_intensity_program='No Program' WHERE ?", {
      high_intensity_program: req.body.name
    }, (error, result) => {

      con.query("Update user_devices SET normal_intensity_program='No Program' WHERE ?", {
        normal_intensity_program: req.body.name
      }, (error, result) => {
        con.query("Update user_devices SET low_intensity_program='No Program' WHERE ?", {
          low_intensity_program: req.body.name
        }, (error, result) => {
          if (error) res.send(error);
          else res.send(result);

        });

      });

    });
  });
});
app.post('/addDevice', (req, res) => {
  var id = sha256(req.body.user_id + req.body.device_name + new Date().getTime()).toString().substring(0, 10).toUpperCase();
  console.log(req.body);
  con.query("INSERT INTO user_devices SET ?", {
    user_id: req.body.user_id,
    device_name: req.body.device_name,
    device_id: id,
    device_creation_date: moment().tz("Europe/Tallinn").format('YYYY-MM-DD h:mm:ss')
  }, (error, result) => {
    if (error) throw error; // res.send(error);
    else {
      result["device_id"] = id;
      res.send(result);
    }
  });
});
app.post('/newSession', (req, res) => {
  var id = sha256(req.body.user_id + req.body.device_id + new Date().getTime()).toString().substring(0, 10).toUpperCase();
  con.query("INSERT INTO device_sessions SET ?", {
    device_id: req.body.device_id,
    session_id: id,
    session_creation_date: moment().tz("Europe/Tallinn").format('YYYY-MM-DD h:mm:ss')
  }, (error, result) => {
    if (error) res.send(error);
    else {
      result["session_id"] = id;
      res.send(result);
    }
  });
});
app.post('/insertParams',express.json({type: '*/*'}), (req, res) => {
  params = Object.values(req.body);
  for(var i=0 ; i < params.length ; i++){
    if("param_id" in params[i]){
      delete params[i].param_id;
      con.query("INSERT INTO parameters SET ?", params[i], (error, result) => {
        if (error) throw error;
        console.log(result);
      });
    }
  }
  res.send("received params");
});
app.post('/insertHrData',express.json({type: '*/*'}), (req, res) => {
  console.log(req.body);
});
app.get("/getData", (req, res) => {
  con.query("SELECT DATE_FORMAT(date,'%Y-%m-%d %H:%i:%s') as date , rrValue as value FROM data WHERE id= ? ORDER BY logging_date ASC", {
    id: req.id
  }, (error, result) => {
    if (error) throw error;
    res.send(result);
  });
});
app.get("/getDevices", (req, res) => {
  con.query("SELECT DATE_FORMAT(device_creation_date,'%Y-%m-%d %H:%i:%s') as date , device_name as name, device_id as id, high_intensity, normal_intensity, low_intensity, high_intensity_program, normal_intensity_program, low_intensity_program, start_timeout FROM user_devices WHERE ? ", {
    user_id: req.query.user_id
  }, (error, result) => {
    if (error) throw error;
    res.send(result);
  });
});
app.get("/getSessions", (req, res) => {
  con.query("SELECT DATE_FORMAT(session_creation_date,'%Y-%m-%d %H:%i:%s') as date , session_id as session_id, device_id as device_id FROM device_sessions WHERE ? ORDER BY session_creation_date DESC", {
    device_id: req.query.device_id
  }, (error, result) => {
    if (error) throw error;
    res.send(result);
  });
});
app.get("/getSessionRssmdData", (req, res) => {
  con.query("SELECT rr_val as value FROM data WHERE session_id=? AND logging_date BETWEEN ? AND ?   ORDER BY logging_date ASC", [req.query.session_id, req.query.start_date, req.query.end_date], (error, result) => {
    if (error) throw error;
    var diffVecSquared = [];
    for (var i = 0; i < result.length - 1; i++) {
      diffVecSquared[i] = Math.pow(result[i + 1].value - result[i].value, 2);
    }
    var lnRssmd_19 = [];
    for (var i = 0; i < diffVecSquared.length - req.query.n; i++) {
      lnRssmd_19.push({
        iter: i,
        value: Math.log(Math.sqrt(diffVecSquared.slice(i, i + req.query.n).reduce((a, b) => a + b, 0) / (parseInt(req.query.n) - 1))) * 19
      })
    }
    res.send(lnRssmd_19);
  });
});
app.get("/getSessionData", (req, res) => {
  con.query("SELECT DATE_FORMAT(logging_date,'%Y-%m-%d %H:%i:%s') as date , hr_val , rr_val , time_interval FROM data WHERE ?  ORDER BY logging_date ASC", {
    session_id: req.query.session_id
  }, (error, result) => {
    if (error) throw error;
    res.send(result);
  });
});

app.get("/getSessionParams", (req, res) => {
  con.query("SELECT DATE_FORMAT(insert_date,'%Y-%m-%d %H:%i:%s') as insert_date,param1,param2,param3,param4,param5,param6,param7,param8,param9,param10,param11,param12,param13,param14,param15,param16,param17,param18,param19,param20 FROM parameters WHERE ? AND param1 IS NOT NULL AND param2 IS NOT NULL AND param3 IS NOT NULL AND param4 IS NOT NULL AND param5 IS NOT NULL AND param6 IS NOT NULL AND param7 IS NOT NULL AND param8 IS NOT NULL AND param9 IS NOT NULL AND param10 IS NOT NULL AND param11 IS NOT NULL AND param12 IS NOT NULL AND param13 IS NOT NULL AND param14 IS NOT NULL AND param15 IS NOT NULL AND param16 IS NOT NULL AND param17 IS NOT NULL AND param18 IS NOT NULL AND param19 IS NOT NULL AND param20 IS NOT NULL ORDER BY insert_date ASC", {
    session_id: req.query.session_id
  }, (error, result) => {
    if (error) throw error;
    res.send(result);
  });
});
app.get("/getPrograms", (req, res) => {
  con.query("SELECT * FROM programs WHERE ? ", {
    user_id: req.query.user_id
  }, (error, result) => {
    if (error) throw error;
    res.send(result);
  });
});
app.listen(80);
