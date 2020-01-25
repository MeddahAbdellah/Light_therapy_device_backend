am4core.useTheme(am4themes_animated);
// Themes end

// Create chart instance

/* RSSMD Chart */
function formatDate(date) {
	    var d = new Date(date),
		    month = '' + (d.getMonth() + 1),
		    day = '' + d.getDate(),
		    year = d.getFullYear();
	    if (month.length < 2) month = '0' + month;
	    if (day.length < 2) day = '0' + day;
	    return [year, month, day].join('-');
}
function plotRssmdMain(readings,n){

	var diffVecSquared=[];
	for(var i = 0 ; i < readings.length-1; i++){
		diffVecSquared[i]= Math.pow(readings[i+1]-readings[i],2);
	}
	var lnRssmd_19;
	lnRssmd_19=Math.log(Math.sqrt(diffVecSquared.reduce((a, b) => a + b, 0)/(parseInt(n)-1)))*19;
	console.log("RSSMD : ");
	console.log(lnRssmd_19);
	var lastdataItem = rssmd_series.dataItems.getIndex(rssmd_series.dataItems.length - 1);
	console.log(lastdataItem)
	rssmd_chart.addData(
	        { iter:( lastdataItem === undefined ? 0:parseInt(lastdataItem._index)+1 ), value: lnRssmd_19 },
	        0
	);
}
function plugDataToChart(data){
  var lastdataItem = rrDataSeries.dataItems.getIndex(rrDataSeries.dataItems.length - 1);

    rrDataChart.addData(
        { date: new Date(lastdataItem.dateX.getTime() + parseInt(data[1])), value: data[0] },
        1
    );
}
var rssmd_chart;
var rssmd_series;
var rrDataChart;
var iterAxis;
var valueAxis;
var rrDataDateAxis;
var rrDataValueAxis;
var rrDataSeries;
var rrDataBullet;
if(localStorage.getItem("session_id")!=null){
var current_datetime=new Date(2018, 11, 24, 10, 33, 30);
var future_datetime=new Date();
	$.ajax({
	type:"GET",
	url:"/getSessionRssmdData",
	data:{start_date:current_datetime.getFullYear() + "-" + (current_datetime.getMonth() + 1) + "-" + current_datetime.getDate() + " " + current_datetime.getHours() + ":" + current_datetime.getMinutes() + ":" + current_datetime.getSeconds() ,
		end_date:future_datetime.getFullYear() + "-" + (future_datetime.getMonth() + 1) + "-" + future_datetime.getDate() + " " + future_datetime.getHours() + ":" + future_datetime.getMinutes() + ":" + future_datetime.getSeconds(),
	      n: $("input[name='n_main']").val(),
	      session_id:localStorage.getItem("session_id")},
	success:function(data){
		  $(".popUpContainer").html('<div class="session_chart"><h4>RSSMD Data</h4><div class="line"></div><div id="rssmd_chart"></div></div>');
		  am4core.useTheme(am4themes_animated);
		  rssmd_chart = am4core.create("rssmd_chart_main", am4charts.XYChart);
		  rssmd_chart.events.on("beforedatavalidated", function(ev) {
			    rssmd_chart.data.sort(function(a, b) {
				        return (new Date(a.date)) - (new Date(b.date));
				      });
		  });
		  rssmd_chart.data = data;
		 	iterAxis = rssmd_chart.xAxes.push(new am4charts.ValueAxis());
		  iterAxis.renderer.minGridDistance = 50;
		  valueAxis = rssmd_chart.yAxes.push(new am4charts.ValueAxis());
		  rssmd_series = rssmd_chart.series.push(new am4charts.LineSeries());
		  rssmd_series.dataFields.valueY = "value";
		  rssmd_series.dataFields.valueX = "iter";
		  rssmd_series.strokeWidth = 2;
		  rssmd_series.minBulletDistance = 2;
		  rssmd_series.tooltipText = "{valueY}";
		  rssmd_series.tooltip.pointerOrientation = "vertical";
		  rssmd_series.tooltip.background.cornerRadius = 20;
		  rssmd_series.tooltip.background.fillOpacity = 1;
		  rssmd_series.tooltip.label.padding(2,2,2,2)
		  rssmd_chart.scrollbarX = new am4charts.XYChartScrollbar();
		  rssmd_chart.scrollbarX.series.push(rssmd_series);
		  rssmd_chart.cursor = new am4charts.XYCursor();
		  rssmd_chart.cursor.fullWidthLineX = true;
		  rssmd_chart.cursor.xAxis = iterAxis;
		  rssmd_chart.cursor.lineX.strokeWidth = 0;
		  rssmd_chart.cursor.lineX.fill = am4core.color("#000");
		  rssmd_chart.cursor.lineX.fillOpacity = 0.1;
	},
	error:function(err){
		  console.error(err);
		  alert("Server Internal Error!");
	}
});
}
/* END RSSMD Chart


/* Live Charts */
/*rrData LIVE*/
if(localStorage.getItem("session_id")!=null){
$.ajax({
	  type:"GET",
	  url:"/getSessionData",
	  data:{session_id: localStorage.getItem("session_id")},
	  success:function(res){
var data=[];
for(var i = 0; i< res.length && i < 100 ; i++){
	data.push({ date: new Date(res[i].date).getTime(), value: res[i].rr_val });
}

data=data.reverse();
for (var i = res.length; i <= 30; i++) {
	        data.push({  date: ( res.length > 0 ? (new Date(res[0].date).getTime()- i*1000) : (new Date().getTime())), value: 0 });
}
data = data.reverse();
rrDataChart = am4core.create("rrData_live", am4charts.XYChart);
rrDataChart.events.on("beforedatavalidated", function(ev) {
	  rrDataChart.data.sort(function(a, b) {
		      return (new Date(a.date)) - (new Date(b.date));
		    });
});
rrDataChart.hiddenState.properties.opacity = 0;
rrDataChart.data=data;
rrDataChart.padding(0, 0, 0, 0);

rrDataChart.zoomOutButton.disabled = true;

rrDataDateAxis = rrDataChart.xAxes.push(new am4charts.DateAxis());
rrDataDateAxis.renderer.grid.template.location = 0;
rrDataDateAxis.renderer.minGridDistance = 30;
rrDataDateAxis.dateFormats.setKey("second", "ss");
rrDataDateAxis.periodChangeDateFormats.setKey("second", "[bold]h:mm a");
rrDataDateAxis.periodChangeDateFormats.setKey("minute", "[bold]h:mm a");
rrDataDateAxis.periodChangeDateFormats.setKey("hour", "[bold]h:mm a");
rrDataDateAxis.renderer.inside = true;
rrDataDateAxis.renderer.axisFills.template.disabled = true;
rrDataDateAxis.renderer.ticks.template.disabled = true;

rrDataValueAxis = rrDataChart.yAxes.push(new am4charts.ValueAxis());
rrDataValueAxis.tooltip.disabled = true;
rrDataValueAxis.interpolationDuration = 100;
rrDataValueAxis.rangeChangeDuration = 100;
rrDataValueAxis.renderer.inside = true;
rrDataValueAxis.renderer.minLabelPosition = 0.05;
rrDataValueAxis.renderer.maxLabelPosition = 0.95;
rrDataValueAxis.renderer.axisFills.template.disabled = true;
rrDataValueAxis.renderer.ticks.template.disabled = true;

rrDataSeries = rrDataChart.series.push(new am4charts.LineSeries());
rrDataSeries.dataFields.dateX = "date";
rrDataSeries.dataFields.valueY = "value";
rrDataSeries.interpolationDuration = 100;
rrDataSeries.defaultState.transitionDuration = 0;
rrDataSeries.tensionX = 0.95;

rrDataChart.events.on("datavalidated", function () {
    rrDataDateAxis.zoom({ start: 1 / 15, end: 1.2 }, false, true);
});

rrDataDateAxis.interpolationDuration = 100;
rrDataDateAxis.rangeChangeDuration = 100;

// all the below is optional, makes some fancy effects
// gradient fill of the series
rrDataSeries.fillOpacity = 1;
var gradient = new am4core.LinearGradient();
gradient.addColor(rrDataChart.colors.getIndex(0), 0.2);
gradient.addColor(rrDataChart.colors.getIndex(0), 0);
rrDataSeries.fill = gradient;

// this makes date axis labels to fade out
rrDataDateAxis.renderer.labels.template.adapter.add("fillOpacity", function (fillOpacity, target) {
    var dataItem = target.dataItem;
    return dataItem.position;
})

// need to set this, otherwise fillOpacity is not changed and not set
rrDataDateAxis.events.on("validated", function () {
    am4core.iter.each(rrDataDateAxis.renderer.labels.iterator(), function (label) {
        label.fillOpacity = label.fillOpacity;
    })
})

// this makes date axis labels which are at equal minutes to be rotated
rrDataDateAxis.renderer.labels.template.adapter.add("rotation", function (rotation, target) {
    var dataItem = target.dataItem;
    if (dataItem.date && dataItem.date.getTime() == am4core.time.round(new Date(dataItem.date.getTime()), "minute").getTime()) {
        target.verticalCenter = "middle";
        target.horizontalCenter = "left";
        return -90;
    }
    else {
        target.verticalCenter = "bottom";
        target.horizontalCenter = "middle";
        return 0;
    }
})

// bullet at the front of the line
rrDataBullet = rrDataSeries.createChild(am4charts.CircleBullet);
rrDataBullet.circle.radius = 5;
rrDataBullet.fillOpacity = 1;
rrDataBullet.fill = rrDataChart.colors.getIndex(0);
rrDataBullet.isMeasured = false;

rrDataSeries.events.on("validated", function() {
    rrDataBullet.moveTo(rrDataSeries.dataItems.last.point);
    rrDataBullet.validatePosition();
});
}});
}
/* END rrData LIVE*/

