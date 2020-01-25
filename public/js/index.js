var client = mqtt.connect("ws://13.48.47.167:9000"); // you add a ws:// url here
client.on("message", function (topic, payload) {

		 data=payload.toString().split(',');
		 console.log(topic);
		 console.log(data);
		 if(topic.includes("command") && data[0] == '1'){
			localStorage.setItem("session_id",data[1]);
			localStorage.setItem("timer",data[3]);
			window.location="/";
		 }
                 if(topic.includes("command") && data[0] == '0'){
                        localStorage.setItem("timer","0");
			$("#timer").text("00:00");
			clearInterval(timer);
		 }
		 if(topic.includes("status")){
			 		console.log("GOT STATUS");
			 		if(data[0]=='a'){
						if(data[1]=='1' && data[2]=='1')$('.icon-smartphone').css("color","#2ECC71");
						else $('.icon-smartphone').css("color","#F44336");
					}
			 		else if(data[0]=='m'){
						if(data[1]=='1')$('.icon-disc').css("color","#2ECC71");
						else $('.icon-disc').css("color","#F44336");
					}
			 	 }
		 else if(data.length == 4 && topic.includes("data")){
			 	 if(localStorage.getItem("session_id") !== data[2]){localStorage.setItem("session_id",data[2]);window.location="/";}
			 	   if($("input[name='n_main']").length > 0){
					   	   var n = $("input[name='n_main']").val();
					   	   var readings = JSON.parse(localStorage.getItem("readings"));
					   	   if(readings==null)readings=[];
					   	   var readings_array=[];
					   	   for(var i in readings)readings_array.push(readings[i]);
					   	   readings_array.push(parseInt(data[0]));
					   	   if(readings_array.length  > parseInt(n)){readings_array.shift();plotRssmdMain(readings_array,n);}
					   	   localStorage.setItem("readings",JSON.stringify(readings_array));
					   	  }
			 	 if(rssmd_chart !== undefined) plugDataToChart(data);
		}

});
/* TIMER */
$("#timer").text(pad(parseInt(localStorage.getItem("timer") / 60),2)+":"+pad(parseInt(localStorage.getItem("timer") % 60),2));
var timer = setInterval(timerFunction,1000);
function timerFunction(){
  var time = $("#timer").text().toString().split(':');
  var timestamp = parseInt(time[0])*60 + parseInt(time[1]);

  if(timestamp > 0 ){
    timestamp--;
    var minutes = parseInt(timestamp / 60);
    var seconds = timestamp % 60;
    $("#timer").text(pad(minutes,2)+":"+pad(seconds,2));
  }
  else if(timestamp <= 0 ){
    $("#timer").text("00:00");
    clearInterval(timer);
    client.publish("command"+localStorage.getItem("device_id"),"0,");
  }
}
function pad (num, size) {
  var s = num+"";
  while (s.length < size) s = "0" + s;
  return s;
}
/* END TIMER*/

if(localStorage.getItem("device_id")!==null){
	client.subscribe("data"+localStorage.getItem("device_id"));
	client.subscribe("status"+localStorage.getItem("device_id"));
	client.subscribe("command"+localStorage.getItem("device_id"));
	client.publish("ping"+localStorage.getItem("device_id")," ");
}
$(".icon-log-out").on("click",function(){localStorage.clear();window.location="/";});
 $(".dash").on("click",function(){
   window.location="/";
 })
 $("#username").text(localStorage.getItem("user_name").toUpperCase()[0]+"."+localStorage.getItem("user_surname").toUpperCase()[0]+localStorage.getItem("user_surname").toLowerCase().substring(1,localStorage.getItem("user_surname").length))
 $("#session").html('<span> / </span> Session ID : '+(localStorage.getItem("session_id")==null? 'No Session Selected':localStorage.getItem("session_id")));
 $("#listDevices").on("click",function(){
   window.location="/listDevices";
 });
 $("#listPrograms").on("click",function(){
	 window.location="/listPrograms";
 });
 $("body").append('<div class="popUpContainer"><div class="popUpForm"></div></div>')
$(".popUpContainer").hide();

$("#addDevice,#newSession").on("click",function(){
  if($(".popUpContainer").is(":hidden")){
    $(".popUpContainer").show();
  }else {$(".popUpContainer").hide();$(".popUpForm").html("");}
});

$("#addDevice").one("click",function(){
  function initForm(){
    $(".popUpContainer").html('<div class="popUpForm"></div>');
    return   $(".popUpForm").append('<h2> Add Device To Your Device List</h2><input type="text" name="device_name" placeholder="Device Name"><button type="button" name="addDevice">Add Device</button>').delay( 10 );
  }
  $.when( initForm() ).done(function(){
    $("button[name='addDevice']").on("click",function(){
      $.ajax({
        type:"POST",
        url:"/addDevice",
        data:{device_name:$("input[name='device_name']").val(),
              user_id:localStorage.getItem("user_id")},
        success:function(data){
          if(data.affectedRows===1){
            console.log(data.device_id);
            $(".popUpForm").html("");
            $(".popUpForm").append('<h2> Your New Device ID Is </h2><h4>'+data.device_id+'</h4><h6>Please log this ID to your device</h6><button type="button" name="understood"> Understood !</button>')
            $("button[name='understood']").on("click",function(){window.location.reload()})
          }
        },
        error:function(err){
          console.error(err);
          alert("Server Internal Error!")
        }
      });
    })
  });
})
$("#stopSession").one("click",function(){
  if(localStorage.getItem("device_id")!==null && localStorage.getItem("session_id")!==null){
    if(confirm("Are you sure you want to stop this session ?")){
      client.publish("command"+localStorage.getItem("device_id"),"0,"+localStorage.getItem("session_id"));
    }
  }else{
    alert("There is no session running");
  }

})
$("#newSession").one("click",function(){
  function initSessionForm(){
    $(".popUpContainer").html('<div class="popUpForm"></div>');
    return   $(".popUpForm").append('<h2> Start A New Session For The Following Device </h2><h4>'+localStorage.getItem("device_id")+'</h4><h6>If this is not the device you need to start a new session <br> for, please go device list.</h6><button type="button" name="newSession">Confirm!</button>').delay( 10 );
  }
  $.when( initSessionForm() ).done(function(){
    $("button[name='newSession']").on("click",function(){
   		client.publish("init"+localStorage.getItem("device_id"),$("select[name='mode']").val()+",");
			$(".popUpContainer").html('<div class="popUpForm"></div>');
			$(".popUpForm").append('<h2> Starting A New Session </h2><h4>Please Climb In And Close The Lid For Calibration</h4>').delay( 10 );
    });
  });
});
$(".popUpContainer").on("click",function(e){
	  if( e.target == this ) $(".popUpContainer").hide();
})
