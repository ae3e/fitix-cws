document.addEventListener('DOMContentLoaded', function () {
	
	chrome.tabs.getSelected(null, function(tab) {
        tabUrl = tab.url;
        chrome.tabs.sendMessage(tab.id, {text: 'report_back'}, function(data){
        	console.log(data);
        	
        	var geojson = {
	            type : "FeatureCollection",
	            features : [{
	                type : "Feature",
	                geometry : {
	                    type : "LineString",
	                    coordinates:data.streams.latlng.map(function(elt,index,array){elt.reverse();elt.push(data.streams.altitude[index]);return elt;})
	                },
	                properties : {
	                    times : data.streams.time.map(function (elt){return new Date(data.activity.start_date?(data.activity.start_date+elt)*1000:elt*1000).toISOString();}),
	                    durations : data.streams.time.map(function (elt){return elt*1000;}),
	                    heartrates : data.streams.heartrate,
	                    cadences : data.streams.cadence
	                }
	            }]
	        };
		       
		    var session= fit.createSession(data.activity.activity_name?data.activity.activity_name: "No name",0).fromGeoJSON(geojson);
		    console.log(session);
		    
		    
		    document.getElementById("activityName").innerHTML = session.name;
        	document.getElementById("activityStart").innerHTML = moment(session.times.data[0]).format("YYYY-MM-DD HH:mm:SS (dddd)");
        	
		    document.getElementById("distance").innerHTML = session.distances.data[session.distances.data.length-1].toFixed(2)+"<small>km</small>";
		    document.getElementById("duration").innerText = moment.duration(session.durations.data[session.durations.data.length-1]).format();
		    //document.getElementById("duration").innerText = Math.trunc(session.durations.data[session.durations.data.length-1]/1000/60)+":"+session.durations.data[session.durations.data.length-1]/1000 % 60 ;
		    document.getElementById("speed").innerHTML = session.speeds.statistics.mean.toFixed(2)+"<small>km/h</small>";
		    document.getElementById("pace").innerHTML = Math.trunc(60/session.speeds.statistics.mean)+":"+Math.trunc((60/session.speeds.statistics.mean - Math.trunc(60/session.speeds.statistics.mean))*60)+"<small>/km</small>";
		    if(session.parameters.heartrates){document.getElementById("heartrate").innerHTML = Math.round(session.parameters.heartrates.statistics.mean)+"<small>bpm</small>";}
		    if(session.parameters.cadences){document.getElementById("cadence").innerHTML = Math.round(session.parameters.cadences.statistics.mean)+"<small>rpm</small>";}
		    
		    var chart = document.getElementById('global_chart');   	
	    	
		    var layout = {
					margin: { t: 0, l:0, r:0 },
					showlegend: true,
					legend: {"orientation": "h"},
					yaxis: {
						visible: false,
						title : "Elevation"
					},
					yaxis2: {
						visible: false,
						title : "HR",
						overlaying: 'y'
					},
					yaxis3: {
						visible: false,
						title : "Speed",
						overlaying: 'y'
					},
					yaxis4: {
						visible: false,
						title : "Cadence",
						overlaying: 'y'
					}
				};
		    
	    	session.calculateIntervals(data.activity.activity_name);
	    	if(session.intervals.length>0){
	    		 var idistance = 0,iduration=0,iheartrate=0,icadence=0,k=0;
	 			for(var i=0;i<session.intervals.length;i++){
	 				if(session.intervals[i].type=="I"){
	 					idistance = idistance + session.intervals[i].distance;
	 					iduration = iduration + session.intervals[i].duration;
	 					if(session.intervals[i].statistics.heartrates){
	 						iheartrate = iheartrate + session.intervals[i].statistics.heartrates.mean;
	 					}
	 					
	 					if(session.intervals[i].statistics.cadences){
	 						icadence = icadence + session.intervals[i].statistics.cadences.mean;
	 					}
	 					
	 					k++;
	 				}
	 			}
	 			iheartrate = Math.round(iheartrate/k);
	 			icadence = Math.round(icadence/k);
	 			
	 		    document.getElementById("idistance").innerHTML = idistance.toFixed(2)+"<small>km</small>";
	 		    document.getElementById("iduration").innerText = moment.duration(iduration).format();
	 		    document.getElementById("ispeed").innerHTML = (idistance*3600000/iduration).toFixed(2)+"<small>km/h</small>";
	 		    document.getElementById("ipace").innerHTML = Math.trunc(60/(idistance*3600000/iduration))+":"+Math.trunc((60/(idistance*3600000/iduration) - Math.trunc(60/(idistance*3600000/iduration)))*60)+"<small>/km</small>";
	 		    document.getElementById("iheartrate").innerHTML = iheartrate+"<small>bpm</small>";
	 		    document.getElementById("icadence").innerHTML = icadence+"<small>rpm</small>";

		    	var shapes=[];
				for(var i=0;i<session.intervals.length;i++){
					shapes.push({
						type: 'rect',
			            // x-reference is assigned to the x-values
			            xref: 'x',
			            // y-reference is assigned to the plot paper [0,1]
			            yref: 'paper',
			            x0: new Date(session.times.data[session.intervals[i].start]).getTime(),
			            y0: 0,
			            x1: new Date(session.times.data[session.intervals[i].end]).getTime(),
			            y1: 1,
	                    fillcolor: session.intervals[i].type=="I"?"#AAA":"#FFF",//(i & 1)?"#AAA":"#FFF",
	                    layer:'below',
			            opacity: 0.5,
			            line: {
			                width: 0
			            }
					});
				}
	            layout.shapes = shapes;

	            var mTime = [], mSpeed = [],mHR = [], mCadence=[], mDuration=[], mSColor=[], mHRColor=[], mCColor=[];
	            for(var i=0;i<session.intervals.length;i++){
	            	mTime.push(new Date(session.times.data[session.intervals[i].start]).getTime() +session.intervals[i].duration/2);
	            	mSpeed.push(session.intervals[i].statistics.speeds.mean);
	            	session.intervals[i].statistics.heartrates?mHR.push(session.intervals[i].statistics.heartrates.mean):"";
	            	session.intervals[i].statistics.cadences?mCadence.push(session.intervals[i].statistics.cadences.mean):"";
	            	mDuration.push(session.intervals[i].duration);
	            	session.intervals[i].type==="I"?mSColor.push("rgba(25,120,181,1)"):mSColor.push("rgba(25,120,181,0.5)");
	            	session.intervals[i].type==="I"?mHRColor.push("rgba(255,128,5,1)"):mHRColor.push("rgba(255,128,5,0.5)");
	            	session.intervals[i].type==="I"?mCColor.push("rgba(40,161,40,1)"):mCColor.push("rgba(40,161,40,0.5)");
	            }
	            var ichart = document.getElementById('intervals_chart'); 
	            Plotly.plot( ichart, [
     				{
     					x: mTime,
     					y: mSpeed,
     					width : mDuration,
     					name : "Speed",
     					marker: {
     					    color: mSColor
     					  },
     					type:'bar'
     				},
     				{
     					x: mTime,
     					y: mHR,
     					width : mDuration,
     					name : "Heart rate",
     					marker: {
     					    color: mHRColor
     					  },
     					yaxis:"y2",
     					visible:"legendonly",
     					type:'bar'
     				},
     				{
     					x: mTime,
     					y: mCadence,
     					width : mDuration,
     					name : "Cadence",
     					marker: {
     					    color: mCColor
     					  },
     					 visible:"legendonly",
     					yaxis:"y3",
     					type:'bar'
     				}
     			],{
	            	showlegend: true,
					legend: {"orientation": "h"},
					xaxis:{
						type:"date"
					},
					yaxis: {
						visible: false
					},
					yaxis2: {
						visible: false,
						overlaying: 'y'
					},
					yaxis3: {
						visible: false,
						overlaying: 'y'
					},margin: { t: 0, l:0, r:30 }
				}, {displayModeBar: false} );
		    }else{
		    	document.getElementById("message").innerHTML = "<div class='alert alert-danger' role='alert'>You have to specify a training in your title's run in  order to see intervals statistics!</div>";
		    }
		    
		    var traces = [
		  				{
							x: session.times.data.map(function(elt,index,array){return new Date(elt);}),
							y: session.speeds.data,
							yaxis:"y3",
							name : "Speed"
						}
					];
		    if(session.parameters.heartrates){
		    	traces.push({
					x: session.times.data.map(function(elt,index,array){return new Date(elt);}),
					y: session.parameters.heartrates.data,
					visible:"legendonly",
					yaxis:"y2",
					name : "Heart rate"
				});
		    }
		    if(session.parameters.cadences){
		    	traces.push({
					x: session.times.data.map(function(elt,index,array){return new Date(elt);}),
					y: session.parameters.cadences?session.parameters.cadences.data:[],
					visible:"legendonly",
					yaxis:"y4",
					name : "Cadence"
				});
		    }
		    if(session.parameters.altitudes){
		    	traces.push({
					x: session.times.data.map(function(elt,index,array){return new Date(elt);}),
					y: session.parameters.altitudes.data,
					visible:"legendonly",
					name : "Elevation"
				});
		    }
	    	Plotly.plot( chart, traces, layout, {displayModeBar: false});
        });
        
        
    });
	
});
