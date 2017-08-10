var fit = (function (exports) {
'use strict';

/**
 * Calculate statistics on a vector data
 * @param values {[Float]} Values
 * @return {Object} the converted value with unit
 */
function getStatistics(values){
	var stats = {};
	if(values && values.length>0){
		stats.min = Math.min.apply(null,values.filter(function(elt){
			return elt!=null;
		}));
		stats.max = Math.max.apply(null,values.filter(function(elt){
			return elt!=null;
		}));
		stats.sum = values.reduce(function(a, b) { return a + b });
		stats.mean = stats.sum / values.length;
	}

	return stats;
}

/**
 * Calculate SMA on a vector data
 * @param n {Integer} number of values
 * @return {Object} the converted values
 */
function getSMA(values, n){
	
	var sma = [];
	sma.push(values[0]);
	for(var i=1;i<values.length;i++){
		var value;
		if(i<n){
			value = values.slice(0,i+1).reduce(function(a, b) { return a + b })/values.slice(0,i+1).length;
		}else{
			value = values.slice(i+1-n,i+1).reduce(function(a, b) { return a + b })/n;
			//console.log(values.toString()+" "+values.slice(i+1-n,i+1).length)+"\n";
		}
		sma.push(value);
	}

	return sma;
}

function createSession(name, smooth_factor) {

	return {
		name : name,
		type : 0,
		coordinates : {},
		times : {},
		durations : {},
		distances : {},
		//contains speeds, heart rates, altitudes, cadences, temperatures,...
		parameters : {},
		intervals : [],
		
		/**
		* Calculate durations
		*/
		calculateDurations : function(){
			if(this.times){
				var data = [];
				this.times.data.forEach(function(elt,index,array){
					data.push(new Date(elt)-new Date(array[0]));
		    	});
				
				this.durations= {
					name:"Durations",
					data : data
				};
			}
		},
		
		calculateDistances : function(){
			/**
	         * Calculates distance between 2 points using Haversine formula
	         * @param lat1 {Double} Latitude of point 1
	         * @param lon1 {Double} Longitude of point 1 
	         * @param lat2 {Double} Latitude of point 2 
	         * @param lon2 {Double} Longitude of point 2 
	         * @return {Double} distance in km
	         */
	        var haversine = function(lat1, lon1, lat2, lon2) {
	            var R = 6372.8;
	            var dLat = (lat2 - lat1)*(Math.PI / 180);
	            var dLon = (lon2 - lon1)*(Math.PI / 180);
	            lat1 = lat1*(Math.PI / 180);
	            lat2 = lat2*(Math.PI / 180);

	            var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
	            var c = 2 * Math.asin(Math.sqrt(a));
	            return R * c;
	        };
	         
	        var data = [];
	        this.coordinates.forEach(function(elt,index,array){
	        	if(index>0){
	        		data.push(data[index-1]+haversine(array[index-1][1],array[index-1][0],array[index][1],array[index][0]));
	        	}else{
	        		data.push(0);
	        	}
	        });
	        
	        var smooth = 5;
	        if(smooth_factor!=null){
	        	smooth = smooth_factor;
	        }
	        this.distances= {
				name:"Distances",
				data : smooth===0?data:getSMA(data,smooth)
			};
		},
		
		calculateSpeeds : function(){
			var distances = this.distances.data;
	    	var times = this.times.data;
	    	
	    	if(times && distances){
	    		var data = [];	    		 
		    	times.forEach(function(elt,index,array){
		    		if(index == 0){
		    			data.push(null);
		    		}else{
		    			var speed = (distances[index]-distances[index-1])/(new Date(times[index])-new Date(times[index-1]))* 1000 * 60 * 60;
		    			if(isNaN(speed) || !isFinite(speed)){speed=null;}
				    	data.push(speed);
		    		}
		    	});
		    	
		    	this.speeds= {
					name:"Speeds",
					data : data,
					statistics : getStatistics(data)
				};
	    	}	
		},
		
		calculateIntervals : function(training){
			//training example : 15' - 10 x 200m/45" - 3' - 10 x 200m/45" - 10'
	    	
			
			//Have to use regex to parse training string
			
			var regex = /(^(\d+')|(\d+")|(\d+'\d+"))|(^\d+m)/; //1000m or 15'30" //other version (^([0-5][0-9]'|[0-9]')?([0-5][0-9]"|[0-9]")?)|(^\d+m)
			
	    	var timeToSec = function(time){
	    		var indexM = time.indexOf("'");
	    		var indexS = time.indexOf("\"");
	    		var duration = 0;

	    		if(indexS>0 && indexM>0){
	    			duration = parseInt(time.substring(0,indexM))*60 + parseInt(time.substring(indexM+1,indexS));
	    		}else{
	    			if(indexM>0){
		    			duration = parseInt(time.substring(0,indexM))*60;
		    		}
	    			if(indexS>0){
		    			duration = parseInt(time.substring(0,indexS));
		    		}
	    		}
	    		return duration;
	    	};
	    	var intt = [];
	    	var types = [];
	    	var phases = training.split("-");

	    	for(var i=0;i<phases.length;i++){
	    		var sets = phases[i].split("x");
	    		
	    		if(sets.length==2){
	    			//10 x 200m/45"
	    			if(!Number.isInteger(parseInt(sets[0]))){
	    				console.log("Number of repetitions is not an integer (Phase "+i+")");
	    				return;
	    			}
	    			var repetition = parseInt(sets[0]);
	    			var mode = sets[1].split("/");
	    			if(mode.length>1){
	    				if(!regex.test(mode[0]) || !regex.test(mode[1])){
	    					console.log("Fast or slow interval to repeat is incorrect (Phase "+i+")");
	    					return;
	    				}
	    				var fast = mode[0];
		    			var slow = mode[1];
		    			for (var j=0;j<repetition;j++){
		    				fast.indexOf("m")<0?intt.push(timeToSec(fast)):intt.push(fast);
		    				slow.indexOf("m")<0?intt.push(timeToSec(slow)):intt.push(slow);
		    				types.push("I");
		    				types.push("R");
		    			}
	    			}else{
	    				//10 x 1000m or 10 x 1'
	    				if(!regex.test(mode[0])){
	    					console.log("Interval to repeat is incorrect (Phase "+i+")");
	    					return;
	    				}
	    				for (var j=0;j<repetition;j++){
	    					mode[0].indexOf("m")<0?intt.push(timeToSec(mode[0])):intt.push(mode[0]);
	    					types.push("I");
	    				}
	    			}
	    			
	    		}else{
	    			//1000m or 15'
	    			if(!regex.test(phases[i])){
    					console.log("Phase "+i+" is incorrect");
    					return;
    				}
    				phases[i].indexOf("m")<0?intt.push(timeToSec(phases[i])):intt.push(phases[i]);
    				switch(i){
    				case 0:
    					types.push("W"); //Warm up
    					break;
    				case phases.length-1:
    					types.push("C"); //Cool down
    					break;
    				default:
    					if (i%2 == 0){
    						types.push("R"); //Interval
    					}else{
    						types.push("I"); //Rest
    					}
    				}
	    			//types.push("?");
	    		}
	    	}
	    	
	    	var durations = this.durations.data;
    		var distances = this.distances.data;
    		var times = this.times;
    		var k =0;
    		var start = 0;
    		var intervals = [];
    		var step, dist = false;

    		if(isNaN(intt[k])){dist=true;}
    		dist?step=parseInt(intt[k].split[0]):step=intt[k]*1000;
    	
	    	for(var i=0;i<durations.length;i++){
	    		
	    		if(dist){
	    			//console.log(step);
	    			if(step>distances[i]){
	    				continue;
	    			}else{
	    				var interval = {};
	    	   			interval.start = start;
	    	   			interval.end = i;
	    	   			interval.type= types[k];
	    				interval.distance = distances[i]-distances[start];
	    				interval.duration = durations[i]-durations[start];
	    	   			intervals.push(interval);

		    			start=i;
		    			k=k+1;
		    			if(k==intt.length){
		    				break;
		    			}
		    			if(isNaN(intt[k])){
		    				dist=true;
		    				step=distances[interval.end]+parseInt(intt[k].split()[0])/1000;
		    			}else{
		    				dist=false;
		    				step=durations[interval.end]+intt[k]*1000;
		    			}
		    		}
	    		}else{
	    			if(step>durations[i]){
		    			continue;
		    		}else{
		    			var interval = {};
	    	   			interval.start = start;
	    	   			interval.end = i;
	    	   			interval.type= types[k];
	    				interval.distance = distances[i]-distances[start];
	    				interval.duration = durations[i]-durations[start];
	    	   			intervals.push(interval);
	    	   			
		    			start=i;
		    			k=k+1;
		    			if(k==intt.length){
		    				break;
		    			}
		    			if(isNaN(intt[k])){
		    				dist=true;
		    				step=distances[interval.end]+parseInt(intt[k].split()[0])/1000;
		    			}else{
		    				dist=false;
		    				step=durations[interval.end]+intt[k]*1000;
		    			}
		    		}
	    		}
	    		
	    	}

	    	var interval = {};
   			interval.start = start;
   			interval.type = types[k];
			interval.distance = distances[distances.length-1]-distances[start];
			interval.duration = durations[durations.length-1]-durations[start];
   			interval.end = durations.length-1;
   			intervals.push(interval);

   			
   			for(var i=0;i<intervals.length;i++){
   				var statistics = {};
   				if(this.speeds){
   					var data = this.speeds.data.filter(function(elt,index){
   						return index>intervals[i].start && index<intervals[i].end;
   					});
   					statistics.speeds = getStatistics(data);
   				}
   				for(var param in this.parameters){
   					var data = this.parameters[param].data.filter(function(elt,index){
   						return index>intervals[i].start && index<intervals[i].end;
   					});
   					statistics[param] = getStatistics(data);
   				}
				intervals[i].statistics = statistics;
   			}
   			this.intervals = intervals;
		},
		
		fromGeoJSON : function(geojson){
			
			if(geojson.features[0].geometry.coordinates){
				this.coordinates = geojson.features[0].geometry.coordinates;
				this.calculateDistances();
				
				if(this.coordinates[0][2]){
					var data = [];
					geojson.features[0].geometry.coordinates.forEach(function(elt,index,array){data.push(elt[2]);});
					
					this.parameters.altitudes= {
						name:"Altitudes",
						data : data,
						statistics : getStatistics(data)
					};
				}
			}
			
	    	if(geojson.features[0].properties.times){
	    		this.times= {
					name:"Times",
					data : geojson.features[0].properties.times
				};	    		
	    		this.calculateDurations();
	    	}
	    	
	    	if(this.distances && this.times){
	    		this.calculateSpeeds();
	    	}
	    	
	    	if(geojson.features[0].properties.heartrates){
	    		this.parameters.heartrates= {
					name:"Heartrates",
					data : geojson.features[0].properties.heartrates,
					statistics : getStatistics(geojson.features[0].properties.heartrates)
				};
	    	}
	    	
	    	if(geojson.features[0].properties.cadences){
	    		this.parameters.cadences= {
					name:"Cadences",
					data : geojson.features[0].properties.cadences,
					statistics : getStatistics(geojson.features[0].properties.cadences)
				};
	    	}
	    	
	    	return this;
		}
	}
}

/* https://medium.com/javascript-scene/javascript-factory-functions-with-es6-4d224591a8b1
const createUser = ({
  userName = 'Anonymous',
  avatar = 'anon.png'
} = {}) => ({
  userName,
  avatar
});
console.log(
  // { userName: "echo", avatar: 'anon.png' }
  createUser({ userName: 'echo' }),
  // { userName: "Anonymous", avatar: 'anon.png' }
  createUser()
);*/

function sum(a,b){
	return a+b;
}


//export {createSession};

exports.sum = sum;
exports.createSession = createSession;

return exports;

}({}));
//# sourceMappingURL=fit.js.map
