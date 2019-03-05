//form stuff here

//Automated booking submit
$(document).on("click","#automatedFormSubmit",function(){
	let formData = $("#automatedForm").serialize();
	$.ajax({
		url:"/booking/lockRequest",
		type:"POST",
		data:formData,
		async:false,
		success: function(data){
			let tab = window.open("","_blank");
			tab.location.assign("/payment");
			location.reload();
		},
		error: function(error){
			console.log(error);
			$('#errMsg').text(error.responseText);
		}
	});
});

//Admin form booking submit
$(document).on("click","#adminFormSubmit",function(){
	let formData = $("#adminForm").serialize();
	$.ajax({
		url:"/booking/adminRequest",
		type:"POST",
		data:formData,
		async:false,
		success: function(data){
			//temporary, can be changed to something nicer
			alert("Successfully added booking");
			location.reload();
		},
		error: function(error){
			console.log(error);
			$('#errMsg').text(error.responseText);
		}
	});
});


//Manual form submit
$(document).on("click","#manualFormSubmit",function(){
	let formData = $("#manualForm").serialize();
	$.post("/booking/enquiry",formData,function(data){
		location.assign("/booking/enquiry/success");
	})
	.fail(function(res){
		$('#errMsg').text(res.responseText);
	})
});

//get pricing data, render on front end
$(document).on("change","#automatedForm",function(){
	let formData = $("#automatedForm").serialize();
	console.log(formData);
	$.ajax({
		url:"/booking/price",
		type:"GET",
		data:formData,
		async:false,
		success: function(price){
			$("#price").val("£" + price.toString());
			$('#price')[0].type = "text";
			$("#price-header").show();
		},
		error: function(error){
			console.log(error);
			$('#errMsg').text(error.responseText);
		}
	});
});


$(document).ready(function(){
	
	function getConfig(){
		return {
			minDate: "today",
			maxDate: new Date().fp_incr(60), // 60 days from now
			dateFormat: "Y-m-d",
			defaultDate: new Date().fp_incr(1),
			onChange(selectedDates, dateStr, instance){
				console.log("onchange triggered");
				$('#calendar').fullCalendar("gotoDate", dateStr);
			}
		};
	}
	
	// Date picker
	flatpickr("#date-input",getConfig());

	//From time picker
	flatpickr("#time-from-input",{
		enableTime: true,
		noCalendar: true,
		dateFormat: "H:i",
		time_24hr: true,
		minDate: "18:00",
		maxDate: "21:30",
		defaultDate: "18:00",
		onChange(selectedDates, dateStr, instance){
			var timeToInput = document.querySelector("#time-to-input")._flatpickr
			var fromDate = new Date(selectedDates[0])
			var toDate = new Date(timeToInput.selectedDates[0])
			if (fromDate >= toDate){
				toDate.setHours(toDate.getHours() + 1)
				timeToInput.setDate(toDate)
			}
		}
	});

	//To time picker
	flatpickr("#time-to-input",{
			enableTime: true,
			noCalendar: true,
			time_24hr: true,
			dateFormat: "H:i",
			minDate: "18:00",
			maxDate: "21:30",
			defaultDate: "19:00"
	});

	//Facility schedule
	$("#calendar").fullCalendar({
		defaultView:"agendaDay",
		allDaySlot:false,
		height: "auto",
		header: {
			left: 'prev',
			center: 'title',
			right: 'next'
		},
		defaultDate: new Date().fp_incr(1),
		validRange: {
			start: new Date().fp_incr(1),
			end: new Date().fp_incr(60)
		},
		minTime: "18:00:00",
		maxTime: "21:30:00",
		slotDuration: "00:30:00",
		slotLabelInterval: "01:00",
		events:{
			url: `/booking/availability/${$("#facility-input-id").val()}`,
			type: 'GET'
		},
		viewRender: function(view,element){
			let date = $("#calendar").fullCalendar("getDate").toDate();
			let picker = $("#date-input").flatpickr(getConfig());
			picker.setDate(date);
		}
	});

	$("#book-form").on("shown.bs.collapse", function () {
		$("#calendar").fullCalendar('rerenderEvents');
	});

});

//Booking form show button

// contact-us form
$(document).on("click", "#contactSubmit", function() {
	let formData = $("#contactForm").serialize();
	$.post("/contact-us/submit", formData, function(data) {
		$("#feedback").text("Message sent");
		$("#contactSubmit").remove();
	}).fail(function(res) { // Not currently used
		console.log("FAIL");
		$("#feedback").attr("class", "text-danger");
		$("#feedback").text("\t" + res.responseText);
	});
});
