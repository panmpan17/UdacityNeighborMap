var map;
var markers = [];
var geocoder;

var Location = function(data) {
	var self = this;

	this.title = ko.observable(data.title);
	this.address = ko.observable(data.address);
	this.place_id = data.place_id;
	this.location = data.location;
	this.marker = data.marker;
	this.summary = ko.observable("");
	this.showed = ko.observable(true);

	this.onClick = data.onClick;
	this.closeInfowindow = data.closeInfowindow;

	this.show = function() {
		self.showed(true);
	}

	this.hide = function() {
		self.showed(false);
	}
}

function AppViewModel() {
	var self = this;
 
	this.locations = ko.observableArray([]);
	this.currentLocation = ko.observable(null);

	this.getCurrentLocationSummary = function() {
		if (this.currentLocation() != null) {
			return this.currentLocation().summary();
		}
		else {
			return "";
		}
	}
 
	this.changeMarker = function(clickedLocation) {
		self.currentLocation(clickedLocation);

		// close all locations' infowindow
		$.each(self.locations(), function(_, location) {
			location.closeInfowindow();
		})

		// open location's infowindow, set map's center and zoom
		clickedLocation.onClick()
		map.setCenter(clickedLocation.location)
		map.setZoom(18)

		// if station summary havn't been fetch, run showStationWiki function
		if (clickedLocation.summary() == "") {
			showStationWiki(clickedLocation.title());
		}
	};

	this.addLocation = function(location) {
		// add new location
		self.locations.push(new Location(location));
	}

	this.updateSummary = function(stationName, summary) {
		$.each(self.locations(), function(_, location) {
			if (location.title() == stationName) {
				location.summary(summary);
			}
		})
	}
};

function initMap() {
	// Initialize map, set center to New Taipei City, set zoom to 13 to see all markers
	map = new google.maps.Map(document.getElementById('map'), {
		center: {"lat": 25.01184365076559, "lng": 121.46261148750841},
		zoom: 13,
	});

	geocoder = new google.maps.Geocoder();

	$.each(stations, function(_, station) {
		// Get coordinate, address through station name
		geocoder.geocode({
			address: station.address,
			componentRestrictions: {locality: station.locality}}, function (resault, status) {
				var address = resault[0].formatted_address;
				var location = resault[0].geometry.location;

				// New marker
				var marker = new google.maps.Marker({
					title: station.name,
					position: location,
					map: map,
				});

				// New Marker's infowindow
				var infowindow = new google.maps.InfoWindow({content: address});

				var onClick = function() {infowindow.open(map, marker)}
				var closeInfowindow = function() {infowindow.open(null, null)};

				// Bind click function to marker
				marker.addListener("click", onClick)

				// Add new location to viewmodel
				viewmodel.addLocation({
					title: station.name,
					address: address,
					place_id: resault[0].place_id,
					location: location,
					marker: marker,
					onClick: onClick,
					closeInfowindow: closeInfowindow,
				});
			});
	});
}

// Show station's wiki summary
function showStationWiki(station_name) {
	$.ajax({
		url: 'https://en.wikipedia.org/w/api.php',
		data: {action: 'query', list: 'search', srsearch: station_name, format: 'json', prop: "extracts"},
		dataType: 'jsonp',
		success: function(msg){
			var station_info = msg.query.search[0];
			if (station_info != undefined) {
				// Page found, update summary to its snipper
				viewmodel.updateSummary(station_name, station_info.snippet);
			}
			else {
				// Page not found, update summary to 'notfound'
				viewmodel.updateSummary(station_name, "There's no Wiki page for this station. ;(");
			}
		},
		error: function(err) {
			viewmodel.updateSummary(station_name, "Look like we lost the way to Wiki. ;(");
		}
	});
}

// Add listener to navbar, if mouse on move in, if not move out
$(".navbar").on("mouseover", function() {
	$(".navbar")[0].classList.add("focus");
});

$(".navbar").on("mouseout", function() {
	$(".navbar")[0].classList.remove("focus");
});

// Add listener to search bar
$("#search-station").on("input", function (e) {
	$.each(viewmodel.locations(), function(_, location) {
		var value = e.target.value;

		// Show station if value found
		if (location.title().toLowerCase().indexOf(value) != -1) {location.show()}
		else {location.hide()}
	})
})

// Bind viewmodel to knockout.js
var viewmodel = new AppViewModel();
ko.applyBindings(viewmodel);