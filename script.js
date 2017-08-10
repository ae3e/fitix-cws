//set timeout in order to wait for the fetch to streams (cadence, heartrate,...) to be completed
setTimeout(function() {
    /* Example: Send data from the page to your Chrome extension */
	/*console.log(pageView._similarActivities.efforts.byActivityId);
	console.log(pageView._similarActivities.efforts.byActivityId["1102314814"]);
	console.log(pageView._similarActivities.efforts.byActivityId["1102314814"].attributes.activity_name);*/
	var data = {streams:{}};
	if(pageView._similarActivities){
		data.activity = pageView._similarActivities.efforts.byActivityId[pageView._streams.activityId].attributes;
		data.streams = pageView._streams.attributes;
	}else{
		data.activity = pageView._activity.attributes;
		data.activity.activity_name=lightboxData.title;
		data.streams = pageView._streams.attributes;
	}
	

	console.log(data.streams);
    document.dispatchEvent(new CustomEvent('RW759_connectExtension', {detail : JSON.stringify(data)}));
}, 1000);