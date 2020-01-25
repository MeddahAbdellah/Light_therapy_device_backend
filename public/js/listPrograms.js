$.ajax({
  type:"GET",
  url:"/getPrograms",
  data:{user_id: localStorage.getItem("user_id")},
  success: function(data){
    for(i in data){
      $(".container").append('<div class="program" data-pattern="'+data[i].pattern+'"><i class="feather icon-calendar" ></i><h4 class="program_name">'+data[i].name+'</h4><h4 class="program_id">'+data[i].id+'</h4><i class="feather icon-settings" title="Modify Program" ></i></i><i class="feather icon-trash-2" title="Delete Program"></i></div>')
    }
    initButtons();
  },
  error:function(err){
    console.error(err);
    alert("Internal Server ERROR")
  }

});
function initButtons(){
  $(".icon-trash-2").on("click",function(e){
    var index = $(".icon-trash-2").index(this);

      $(".device").css({"background":"#F5F5F5","color":"black"});

      var effect = function() {
        return $(".program").eq(index).css({"background":"#FF0000","color":"white"}).delay( 310 );
      };
      $.when( effect() ).done(function() {
        if( confirm("Are you sure you want to delete this Program ?")==true){
          deleteProgram($(".program_name").eq(index).text());
        }else {$(".program").css({"background":"#F5F5F5","color":"black"});window.location.reload();}
      });
  });

  $(".icon-settings").on("click",function(e){
      var index = $(".icon-settings").index(this);
      function initForm(){
        $(".popUpContainer").html('<div class="popUpForm"></div>');
        return   $(".popUpForm").html('<h2 id="popUpFormTitle" data-id="'+$(".program_id").eq(index).text()+'"> '+$(".program_name").eq(index).text()+' </h2><div class="newProgramData"></div><div class="alignInputs"><button name="saveProgram">Save Program</button><button name="addProgramVal">Add Value</button></div>').delay( 10 );
      }
      $.when( initForm() ).done(function(){
          $("button[name='addProgramVal']").on("click",function(){
            $(".newProgramData").append('<div class="alignInputs"><input name="programData" placeholder="Time(%)" type="number" min="0" max="100"><input name="programData" placeholder="Dose(%)" type="number" min="0" max="100">');
          });
          $("button[name='saveProgram']").on("click",function(){
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
                url:"/modifyProgram",
                data:{name:$(".program_name").eq(index).text(),pattern:pattern,user_id:localStorage.getItem("user_id")},
                success: function(){
                  window.location="/listPrograms";
                },
                error:function(err){
                  console.log(err);
                  alert("Internal Server Error: "+err.responseText);
                }
              });
            }
          });
          var pattern = $(".program").eq(index).data('pattern').toString().split(',');
          for(var j = 0; j < pattern.length; j+=2){
            $(".newProgramData").append('<div class="alignInputs"><input name="programData" placeholder="Time(%)" type="number" min="0" max="100" value='+pattern[j]+'><input name="programData" placeholder="Dose(%)" type="number" min="0" max="100" value='+pattern[j+1]+'>');
          }
          $(".popUpContainer").show();
      });
  });


}
function deleteProgram(deleteProgramName){

      $.ajax({
        type:"POST",
        url:"/deleteProgram",
        data:{name:deleteProgramName,user_id:localStorage.getItem("user_id")},
        success:function(){
          window.location.reload();
        },
        error:function(){
          alert("Internal Server Error");
          window.location.reload();
        }
      });
}
