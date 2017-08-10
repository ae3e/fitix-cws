var table;

$(document).ready(function() {
	table = $('#table_intervals').DataTable( {
            	   "scrollY":        "200px",
                   "scrollCollapse": true,
                   "paging":         false,
                   data: [],
                   searching: false,
                   columns: [
                       { data: "name", title:"name" },
                       { data: "start_time", title:"start" }
                   ]
               } );
           } );

document.addEventListener('DOMContentLoaded', function () {
	document.getElementById("exec").addEventListener("click",getDataFL);
})

function getDataFL() {
      
        console.log(document.getElementById("search").value);
        fetch("https://www.strava.com/athlete/training_activities?keywords="+document.getElementById("search").value+"&activity_type=Run&workout_type=&commute=&private_activities=&trainer=&gear=&new_activity_only=false&page=1&per_page=20",{
    	    method: "GET",
    	    headers: {
    	       'X-Requested-With':'XMLHttpRequest'
    	    },
    	    credentials: 'include'
    	})
    	.then(function(response) {
    		return response.json();
    	}).then(function(doc){
    		console.log(doc);

           /*$(document).ready(function() {
               $('#table_intervals').DataTable( {
            	   "scrollY":        "200px",
                   "scrollCollapse": true,
                   "paging":         false,
                   data: doc.models,
                   columns: [
                       { data: "name", title:"name" },
                       { data: "start_time", title:"start" }
                   ]
               } );
           } );*/
               
               table.clear().rows.add(doc.models).draw()
               
           var urls = [];
           for (var i=0;i<doc.models.length;i++){
        	   urls.push("https://www.strava.com/activities/"+doc.models[i].id+"/streams");
        	   console.log(urls[i]);
           }
           
           var promises = urls.map(url => fetch(url,{
    	    method: "GET",

    	    credentials: 'include'
    	}).then(y => y.json()));
           Promise.all(promises).then(results => {
        	   console.log(results);
        	   console.log(doc);
        	   
        	   var x=[],y=[];
        	   for(var i=0;i<results.length;i++){
        		   var feature = {
           	            type : "FeatureCollection",
           	            features : [{
           	                type : "Feature",
           	                geometry : {
           	                    type : "LineString",
           	                    coordinates:results[i].latlng.map(function(elt,index,array){elt.reverse();elt.push(results[i].altitude[index]);return elt;})
           	                },
           	                properties : {
           	                    times : results[i].time.map(function (elt){return new Date(elt*1000).toISOString();}),
           	                    durations : results[i].time.map(function (elt){return elt*1000;}),
           	                    heartrates : results[i].heartrate,
           	                    cadences : results[i].cadence
           	                }
           	            }]
           	        };
           		    var session= fit.createSession("Toto").fromGeoJSON(feature);
	           		session.calculateIntervals(doc.models[i].name);
	     		    var idistance = 0,iduration=0,iheartrate=0,icadence=0,k=0;
	     			for(var j=0;j<session.intervals.length;j++){
	     				if(session.intervals[j].type=="I"){
	     					idistance = idistance + session.intervals[j].distance;
	     					iduration = iduration + session.intervals[j].duration;
	     					iheartrate = iheartrate + session.intervals[j].statistics.heartrates.mean;
	     					//icadence = icadence + session.intervals[j].statistics.cadences.mean;
	     					k++;
	     				}
	     			}
	     			iheartrate = Math.round(iheartrate/k);
	     			//icadence = Math.round(icadence/k);
	     			console.log((idistance*3600000/iduration).toFixed(2)+ " ("+doc.models[i].start_time+")");
	     			x.push(doc.models[i].start_time);
	     			y.push((idistance*3600000/iduration).toFixed(2));
        	   }
        	   
        	   var ichart = document.getElementById('global_chart'); 
	            Plotly.newPlot( ichart, [
    				{
    					x: x,
    					y: y
    				}
    			],{
	            	showlegend: false,
					margin: { t: 0, l:0, r:30 }
				}, {displayModeBar: false} );

           });
    	});

	
};
