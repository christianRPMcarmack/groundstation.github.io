// ROS CONNECTION ///////////////////////////////////////////////////////////////////////////
var twist;
var cmdVel;
var publishImmidiately = true;
var robot_IP;
var manager;
var teleop;
var ros;
var marker;
var latn;
var lonn;
var odomx;
var odomy;
var recenter = true;
var k = true;
var map;
// Sleep Function
function sleep(miliseconds) {
  var currentTime = new Date().getTime();

  while (currentTime + miliseconds >= new Date().getTime()) {
  }
}

// Connecting to ROS
  var ros = new ROSLIB.Ros({
    url : 'ws://192.168.1.2:9090'
  });

  ros.on('connection', function() {
    console.log('Connection Established');
  });

  ros.on('error', function(error) {
    console.log('Error connecting to websocket server: ', error);
  });

  //ros.on('close', function() {
  //  console.log('Connection to websocket server closed.');
  //});



  // Publishing a Topic
  var cmdVel = new ROSLIB.Topic({
    ros : ros,
    name : '/cmd_vel',
    messageType : 'geometry_msgs/Twist'
  });

  var twist = new ROSLIB.Message({
    linear : {
      x : 0,
      y : 0,
      z : 0
    },
    angular : {
      x : 0,
      y : 0,
      z : 0
    }
  });
  cmdVel.publish(twist);

  // Subscribing to a Topic
  var gpspull = new ROSLIB.Topic({
    ros : ros,
    name : '/GPS',
  });

  var odompull = new ROSLIB.Topic({
    ros : ros,
    name : '/odometry/filtered',
    messageType : 'nav_msgs/Odometry'
  });

  // Subsriber Functions
  odompull.subscribe(function(message) {
    console.log('Odom X Y:')
    console.table(message.twist.twist.linear.x,message.twist.twist.linear.y);

    odompull.unsubscribe();
  });
  gpspull.subscribe(function(message) {
    console.log('Lat Long:')
    console.table(message.latitude,-message.longitude);
    gpspull.unsubscribe();
  });

  // Calling a service
  var addTwoIntsClient = new ROSLIB.Service({
    ros : ros,
    name : '/add_two_ints',
    serviceType : 'rospy_tutorials/AddTwoInts'
  });

  var request = new ROSLIB.ServiceRequest({
    a : 1,
    b : 2
  });

  //addTwoIntsClient.callService(request, function(result) {
    //console.log('Result for service call on '
  //    + addTwoIntsClient.name
  //    + ': '
  //    + result.sum);
  //});

  // Getting and setting a param value

  ros.getParams(function(params) {
  });

  // Max Velocity Function
  function kill(VEL){
    // Max Vel. Y
    var maxVelY = new ROSLIB.Param({
        ros : ros,
        name : 'max_vel_y'
    });

    maxVelY.set(VEL);
    maxVelY.get(function(value) {
        console.log('MAX VAL: ' + value);
    });

    // Max Vel. X
    var maxVelX = new ROSLIB.Param({
        ros : ros,
        name : 'max_vel_x'
    });

    maxVelX.set(VEL);
    maxVelX.get(function(value) {
        console.log('MAX Y VAL: ' + value);
    });
    }



    // Get Functions
    function moveAction(linear, angular) {
    if (linear !== undefined && angular !== undefined) {
        twist.linear.x = linear;
        twist.angular.z = angular;
    } else {
        twist.linear.x = 0;
        twist.angular.z = 0;
    }
    
    cmdVel.publish(twist);
    }

    function initVelocityPublisher() {
        // Init message with zero values.
        twist = new ROSLIB.Message({
            linear: {
                x: 0,
                y: 0,
                z: 0
            },
            angular: {
                x: 0,
                y: 0,
                z: 0
            }
        });
        // Init topic object
        cmdVel = new ROSLIB.Topic({
            ros: ros,
            name: '/cmd_vel',
            messageType: 'geometry_msgs/Twist'
        });
        // Register publisher within ROS system
        cmdVel.advertise();
    }

    function initTeleopKeyboard() {
        // Use w, s, a, d keys to drive your robot
    
        // Check if keyboard controller was aready created
        if (teleop == null) {
            // Initialize the teleop.
            teleop = new KEYBOARDTELEOP.Teleop({
                ros: ros,
                topic: '/cmd_vel'
            });
        }
    
        // Add event gpspull for slider moves
        robotSpeedRange = document.getElementById("robot-speed");
        robotSpeedRange.oninput = function () {
            teleop.scale = robotSpeedRange.value / 100
        }
    }

    function createJoystick() {
        // Check if joystick was aready created
        if (manager == null) {
            joystickContainer = document.getElementById('joystick');
            // joystck configuration, if you want to adjust joystick, refer to:
            // https://yoannmoinet.github.io/nipplejs/
            var options = {
                zone: joystickContainer,
                position: { left: 50 + '%', top: 105 + 'px' },
                mode: 'static',
                size: 200,
                color: '#006800',
                restJoystick: true
            };
            manager = nipplejs.create(options);

            manager.on('move', function (evt, nipple) {

                var direction = nipple.angle.degree - 90;
                if (direction > 180) {
                    direction = -(450 - nipple.angle.degree);
                }

                var lin = Math.cos(direction / 57.29) * nipple.distance * 0.005;
                var ang = Math.sin(direction / 57.29) * nipple.distance * 0.05;

                if (publishImmidiately) {
                    publishImmidiately = false;
                    moveAction(lin, ang);
                    setTimeout(function () {
                        publishImmidiately = true;
                    }, 50);
                }
            });

            manager.on('end', function () {
                moveAction(0, 0);
            });
        }
    }

    // 
    window.onload = function() {
        initVelocityPublisher();
        createJoystick();
        initTeleopKeyboard();
    }



// GOOGLE MAPS API //////////////////////////////////////////////////////////////////////////

// Change in Meters to Change in Lat Long //
var lat0
var lon0

function latlon2m(dn,de) {
  var lat = lat0;
  var lon = lon0;

  //Earth’s radius, sphere
  var R=6378137;

  //offsets in meters dn and de
  

  //Coordinate offsets in radians
  dLat = dn/R
  dLon = de/(R*Cos(Pi*lat/180))

  //OffsetPosition, decimal degrees
  latO = lat + dLat * 180/Pi
  lonO = lon + dLon * 180/Pi 

  return [lat0,lon0]
}


// Google Maps /////////////////////////////////////////////////////////
function initMap() {
    // Setup Initial Location and Zoom of Map
    var myLatLng = {lat: 40.001, lng: -105.26};
   
    map = new google.maps.Map(document.getElementById('map'), {
      zoom: 17,
      center: myLatLng,
      mapTypeId: 'satellite'
    });
    map.setTilt(0);

    
}

// Grab GPS Coordinates
function getGPS(){
      
  gpspull.subscribe(function(message) {
    latn = message.latitude
    lonn = -message.longitude
    gpspull.unsubscribe();
  });

  return [latn,lonn];
}

// Get Initial GPS Coor. To Init. Odom Frame
var latlng0 = getGPS();
lat0 = latlng0[0];
lon0 = latlng0[1];

//Grab Odom Position
function getODOM(){
  odompull.subscribe(function(message) {
    odomx = message.twist.twist.linear.x;
    odomy = message.twist.twist.linear.y;
      odompull.unsubscribe();
  });

  return [odomx,odomy]
}

// Add Marker Function ///////////////////////////////////////
function plotGPS(){
  // Refresh Interval
  setInterval(function(){


  
  // Grab Data From ROS
  var gpslatlng = getGPS();



  if(k==true){
    gpslatlng[0]=gpslatlng[0]+(0.001*Math.random());
    gpslatlng[1]=gpslatlng[1]+(0.001*Math.random());

    ;
    console.log(gpslatlng)
    k=false;
  }else{
    k=true;
    console.log(gpslatlng)
  }

  var glatlng = new google.maps.LatLng(gpslatlng[0],gpslatlng[1]);

  // Recenter Map On Initial Position
  if(recenter==true){
  map = new google.maps.Map(document.getElementById('map'), {
    zoom: 18,
    center: glatlng,
    mapTypeId: 'satellite'
  });
  recenter = false;
  }

  // New Marker
  var marker = new google.maps.Marker({
      position: glatlng,
      title:"GPS"
  });
      
  // Apply New Marker
  marker.setMap(map);
  }, 700);
}
//////////////////////////////////////////////
      // Publish Current Speed to Window
  document.getElementById("speedwindow").innerHTML = [odomMat[0], odomMat[1]];
