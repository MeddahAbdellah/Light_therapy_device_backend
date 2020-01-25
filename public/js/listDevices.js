$.ajax({
  type:"GET",
  url:"/getDevices",
  data:{user_id: localStorage.getItem("user_id")},
  success: function(data){
    for(i in data){
      $(".container").append('<div class="device" data-high="'+(data[i].high_intensity/10)+'" data-normal="'+(data[i].normal_intensity/10)+'" data-low="'+(data[i].low_intensity/10)+'" data-high_program="'+(data[i].high_intensity_program)+'" data-normal_program="'+(data[i].normal_intensity_program)+'" data-low_program="'+
      (data[i].low_intensity_program)+'" data-timeout="'+data[i].start_timeout+'"><i class="feather icon-cpu" ></i><h4 class="device_name">'+data[i].name+'</h4><h4 class="device_id">'+data[i].id+'</h4><h4 class="device_creation_date">'+data[i].date+'</h4><i class="feather icon-list" title="List Sessions" class="listSessions"></i><i class="feather icon-settings" title="Settings" ></i><i class="feather icon-check-circle" title="Use Device" ></i><i class="feather icon-trash-2" title="Delete Device"></i></div>')
      if(data[i].id==localStorage.getItem("device_id")){console.log(i);$(".device").eq(parseInt(i)+1).css({"background":"#00CC00","color":"white"});}
    }
    initButtons();
  },
  error:function(err){
    console.error(err);
    alert("Internal Server ERROR")
  }

});
function initButtons(){
  $(".icon-check-circle").on("click",function(e){
      var index = $(".icon-check-circle").index(this);
      $(".device").css({"background":"#F5F5F5","color":"black"});
      $(".device").eq(index+1).css({"background":"#00CC00","color":"white"});
      console.log($(".device_name").eq(index+1).text());
      console.log($(".device_id").eq(index+1).text());
      localStorage.setItem("device_name",$(".device_name").eq(index+1).text());
      localStorage.setItem("device_id",$(".device_id").eq(index+1).text());
      client.subscribe("data"+localStorage.getItem("device_id"));
      client.subscribe("status"+localStorage.getItem("device_id"));
      client.publish("ping"+localStorage.getItem("device_id"),"ping");
  });
  $(".icon-trash-2").on("click",function(e){
    var index = $(".icon-trash-2").index(this);

      $(".device").css({"background":"#F5F5F5","color":"black"});

      var effect = function() {
        return $(".device").eq(index+1).css({"background":"#FF0000","color":"white"}).delay( 310 );
      };
      $.when( effect() ).done(function() {
        if( confirm("Are you sure you want to delete this Device ?")==true){
          deleteDevice($(".device_id").eq(index+1).text(),index+1);
        }else {$(".device").css({"background":"#F5F5F5","color":"black"});window.location.reload();}
      });
  });
  $(".icon-list").on("click",function(e){
    var index = $(".icon-list").index(this);

    $(".device").eq(index+1).css({"background":"#3498DB","color":"white"});
    var bgColor=$(".device").eq(index+1).css("background");
    var color=$(".device").eq(index+1).css("color")
    $.ajax({
      type:"GET",
      url:"/getSessions",
      data:{device_id:$(".device_id").eq(index+1).text()},
      success:function(data){
        displaySessions(data);
        $(".device").eq(index+1).css({"background":bgColor,"color":color});
      },
      error:function(err){
        console.error(err);
        alert("Internal Server Error");
      }
    });
  });
  $(".icon-settings").on("click",function(e){
      var index = $(".icon-settings").index(this);
      function initForm(){
        $(".popUpContainer").html('<div class="popUpForm"></div>');
        return   $(".popUpForm").html('<h2 id="popUpFormTitle" data-id="'+$(".device_id").eq(index+1).text()+'"> Device Settings </h2><label for="timeout" style="margin-left:5%" >Start Timeout Value</label><input type="number" name="timeout" value="'+$(".device").eq(index+1).data("timeout")+
        '"><label for="high" style="margin-left:5%" >High Intensity Value</label><div class="alignInputs"><input type="number" name="high" value="'+$(".device").eq(index+1).data("high")+'"><select name="high_programs"><option value='+$(".device").eq(index+1).data("high_program")+'>'+$(".device").eq(index+1).data("high_program")+'</option></select></div><label for="normal" style="margin-left:5%" >Normal Intensity Value</label><div class="alignInputs"><input type="number" name="normal" value="'+
        $(".device").eq(index+1).data("normal")+'"><select name="normal_programs"><option value='+$(".device").eq(index+1).data("normal_program")+'>'+$(".device").eq(index+1).data("normal_program")+'</option></select></div><label for="low" style="margin-left:5%" >Low Intensity Value</label><div class="alignInputs"><input type="number" name="low" value="'+$(".device").eq(index+1).data("low")+
        '"><select name="low_programs"><option value='+$(".device").eq(index+1).data("low_program")+'>'+$(".device").eq(index+1).data("low_program")+'</option></select></div><div class="alignInputs"><button name="changeSettings">Change Settings</button></div><div class="alignInputs"><button name="newProgram">New Program</button></div>').delay( 10 );
      }
      $.when( initForm() ).done(function(){
        $("button[name='changeSettings']").on("click",function(){
          $.ajax({
            type:"POST",
            url:"/changeDeviceSettings",
            data:{high:($("input[name='high']").val()*10),normal:($("input[name='normal']").val()*10),low:($("input[name='low']").val()*10),
                  high_program:($("select[name='high_programs']").val()),normal_program:($("select[name='normal_programs']").val()),low_program:($("select[name='low_programs']").val()),
                  timeout:$("input[name='timeout']").val(),device_id:$("#popUpFormTitle").data("id")},
            success:function(data){

              if(data.affectedRows == 1){
                client.publish("settings"+$("#popUpFormTitle").data("id"),($("input[name='high']").val()*10)+","+($("input[name='normal']").val()*10)+","+($("input[name='low']").val()*10)+","+$("input[name='timeout']").val());
                window.location.reload();
              }
              else alert("Could not Change Settings");
            },
            error:function(err){
              alert("Internal Server Error");
            }
          });
        });

	$("button[name='newProgram']").on("click",function(){
          $(".popUpForm").html('<h2 id="popUpFormTitle"> New Program </h2><div class="alignInputs"><input name="programName" placeholder="Program Name"></div><div class="newProgramData"><div class="alignInputs"><input name="programData" placeholder="Time(%)" type="number" min="0" max="100"><input name="programData" placeholder="Dose(%)" type="number" min="0" max="100"></div></div><div class="alignInputs"><button name="createProgram">Create Program</button><button name="addProgramVal">Add Value</button></div>').delay( 10 );
          $("button[name='createProgram']").on("click",function(){
            var pattern="";
            $("input[name='programData']").each(function(){
              if($(this).val().length>0)pattern+=$(this).val()+",";
            });
            pattern = pattern.slice(0,pattern.length-1);
            var patternData = pattern.split(",");
            var max=-1;
            var patternValide=true;
            for(var i = 0; i < patternData.length ; i+=2){
		if(Math.abs(parseInt(patternData[i]))>max)max=Math.abs(parseInt(patternData[i]));
		else {alert("The timeline is not organized ( duplicate times are not allowed )"); patternValide=false; break;}
	    }
	    for(var i = 0; i < patternData.length ; i++){
		if(Math.abs(parseInt(patternData[i]))>=0 && Math.abs(parseInt(patternData[i]))<=100)max=Math.abs(parseInt(patternData[i]));
	    	else {alert("some values are over 100"); patternValide=false; break;}
	    }
	    console.log("pattern Valide: "+patternValide);
            console.log("pattern: "+pattern);
            if(patternValide){
              $.ajax({
                type:"POST",
                url:"/newProgram",
                data:{user_id:localStorage.getItem("user_id"),name:$("input[name='programName']").val(),pattern:pattern},
                success: function(){
                  window.location="/listDevices";
                },
                error:function(err){
                  console.log(err);
                  alert("Internal Server Error: "+err.responseText);
                }
              });
            }

          });
          $("button[name='addProgramVal']").on("click",function(){

            $(".newProgramData").append('<div class="alignInputs"><input name="programData" placeholder="Time(%)" type="number" min="0" max="100"><input name="programData" placeholder="Dose(%)" type="number" min="0" max="100">');
          });
        });
        $.ajax({
          type:"GET",
          url:"/getPrograms",
          data:{user_id:localStorage.getItem("user_id")},
          success:function(data){
            console.log(data);
            for(var i in data){
              if($(".popUpContainer select").val()!=data[i].name)$(".popUpContainer select").append("<option value="+data[i].name+">"+data[i].name+"</option>");
            }
            $(".popUpContainer").show();
          },
          error:function(err){
            alert("Internal Server Error");
          }
        });

      });
  });

}
function displaySessions(data){
  $(".container").html('<div class="session"><i class="feather icon-cpu" ></i><h4 class="session_id">Session ID</h4><h4 class="device_id">Device ID</h4><h4 class="session_creation_date">Session Creation Date</h4><i class="feather icon-chevron-down" ></i><i class="feather icon-chevron-down" ></i><i class="feather icon-chevron-down" ></i></div>')
  for(i in data){
    $(".container").append('<div class="session"><i class="feather icon-cpu" ></i><h4 class="session_id">'+data[i].session_id+'</h4><h4 class="device_id">'+data[i].device_id+'</h4><h4 class="session_creation_date">'+data[i].date+'</h4><i class="feather icon-pie-chart" ></i><i class="feather icon-download" ></i><i class="feather icon-trash-2" ></i></div>')
  }
  sessionInitButton();
}
function sessionInitButton(){
  initChartButton();
  $(".icon-trash-2").on("click",function(e){
    var index = $(".icon-trash-2").index(this);

      $(".session").css({"background":"#F5F5F5","color":"black"});

      var effect = function() {
        return $(".session").eq(index+1).css({"background":"#FF0000","color":"white"}).delay( 310 );
      };
      $.when( effect() ).done(function() {
        if( confirm("Are you sure you want to delete this Session ?")==true){
          deleteSession($(".session_id").eq(index+1).text(),index+1);
        }else {$(".session").css({"background":"#F5F5F5","color":"black"});window.location.reload();}
      });
  });
}

function deleteDevice(id,index){
  $.ajax({
    type:"POST",
    url:"/deleteDevice",
    data:{device_id: id},
    success:function(data){
      if(data.affectedRows == 1)  {$(".device").eq(index).remove();window.location.reload();}
    },
    error:function(err){
      console.error(err);
      alert("Internal Server ERROR")
    }
  });
}
function deleteSession(id,index){
  $.ajax({
    type:"POST",
    url:"/deleteSession",
    data:{session_id: id},
    success:function(data){
      console.log(data);
      if(data.affectedRows == 1)  {$(".session").eq(index).remove();window.location.reload();}
    },
    error:function(err){
      console.error(err);
      alert("Internal Server ERROR")
    }
  });
}
