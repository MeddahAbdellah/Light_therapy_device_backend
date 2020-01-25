function download(filename, text) {
	  var element = document.createElement('a');
	  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
	  element.setAttribute('download', filename);

	  element.style.display = 'none';
	  document.body.appendChild(element);

	  element.click();

	  document.body.removeChild(element);
}

function ConvertToCSV(objArray) {
	            var array = typeof objArray != 'object' ? JSON.parse(objArray) : objArray;
	            var str = '';

	            for (var i = 0; i < array.length; i++) {
			                    var line = '';
			                    for (var index in array[i]) {
						                        if (line != '') line += ','

						                        line += array[i][index];
						                    }

			                    str += line + '\r\n';
			                }

	            return str;
}
function initChartButton(){
  $(".icon-download").on("click",function(){
  	var index = $(".icon-download").index(this);
	var file=[];
	 $.ajax({
		type:"GET",
		url:"/getSessionData",
		data:{
		session_id:$(".session_id").eq(index+1).text()},
		success:function(data){
			file=file.concat(data);
			$.ajax({
				  type:"GET",
				  url:"/getSessionParams",
				  data:{
					    session_id:$(".session_id").eq(index+1).text()},
				  success:function(params){
					  file=file.concat(params);
					  console.log(file);
					      download($(".session_id").eq(index+1).text()+".txt",ConvertToCSV(file));
					    }
			});
		}
		});
  });	
  $(".icon-pie-chart").on("click",function(){
    var index = $(".icon-pie-chart").index(this);
      function initForm(){
        $(".popUpContainer").html('<div class="popUpForm"></div>');
        return   $(".popUpForm").html('<h2> RSSMD Chart Parameters</h2><input type="datetime-local" name="start_date" placeholder="Start Date"><input type="datetime-local" name="end_date" placeholder="END Date"><input type="number" name="n" placeholder="N"><button type="button" name="rssmd_generate">Generate RSSMD Chart</button>').delay( 10 );
      }
      $.when( initForm() ).done(function(){
        $(".popUpContainer").show();
        $("button[name='rssmd_generate']").on("click",function(){
          $.ajax({
            type:"GET",
            url:"/getSessionRssmdData",
            data:{start_date:$("input[name='start_date']").val(),
                  end_date:$("input[name='end_date']").val(),
                  n: $("input[name='n']").val(),
                  session_id:$(".session_id").eq(index+1).text()},
            success:function(data){
              $(".popUpContainer").html('<div class="session_chart"><h4>RSSMD Data</h4><div class="line"></div><div id="rssmd_chart"></div></div>');
              console.log(data);


              // Themes begin
              am4core.useTheme(am4themes_animated);
              // Themes end

              // Create chart instance
              var chart = am4core.create("rssmd_chart", am4charts.XYChart);

              // Add data
              chart.data = data;

              // Create axes
              var iterAxis = chart.xAxes.push(new am4charts.ValueAxis());
              iterAxis.renderer.minGridDistance = 50;

              var valueAxis = chart.yAxes.push(new am4charts.ValueAxis());

              // Create series
              var series = chart.series.push(new am4charts.LineSeries());
              series.dataFields.valueY = "value";
              series.dataFields.valueX = "iter";
              series.strokeWidth = 2;
              series.minBulletDistance = 2;
              series.tooltipText = "{valueY}";
              series.tooltip.pointerOrientation = "vertical";
              series.tooltip.background.cornerRadius = 20;
              series.tooltip.background.fillOpacity = 1;
              series.tooltip.label.padding(2,2,2,2)

              // Add scrollbar
              chart.scrollbarX = new am4charts.XYChartScrollbar();
              chart.scrollbarX.series.push(series);

              // Add cursor
              chart.cursor = new am4charts.XYCursor();
              chart.cursor.fullWidthLineX = true;
              chart.cursor.lineX.strokeWidth = 0;
              chart.cursor.lineX.fill = am4core.color("#000");
              chart.cursor.lineX.fillOpacity = 0.1;




            },
            error:function(err){
              console.error(err);
              alert("Server Internal Error!");
            }
          });
        });
      });

  });

}
