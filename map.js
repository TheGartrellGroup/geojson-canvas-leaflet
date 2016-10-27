//basemap config
var map = L.map('map').setView([45.579, -122.611], 13);

L.tileLayer('http://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; National Geographic, Esri, DeLorme, NAVTEQ, UNEP-WCMC, USGS, NASA, ESA, METI, NRCAN, GEBCO, NOAA, iPC',
    maxZoom: 16
}).addTo(map);

var layerControl = false;

//layer paths
var layer_config = [
    {
        "name": 'Sewer Gravity Pipe',
        "url": './sewer_data/PORT.sewer_gravity_pipe.json',
        "filter": {facility_cd : 'NA'},
    },
    {
        "name": 'Electric Airfield',
        "url": './port_data/PORT.elec_airfield_light.json',
        "filter": {airfield_light_type_cd : 'Runway Edge Light'},
    }
];

//makes ajax call to retrieve geojson layer(s)
getGeojson(layer_config);

function getGeojson(layers) {
    var promises = [];
    //add each ajax request to a promise array
	$.each(layers, function(i, layerConfig) {
		promises.push(
            $.ajax({
    			url: layerConfig.url,
    			type: 'GET',
                layerName: layerConfig.name,
                filter: layerConfig.filter,
    			success: function(data){
    				addCanvas(data, this.layerName, this.filter)
    			}
		    })
        )
	})
    //call all promises concurrently (one doesn't wait for the other to finish)
    $.when($, promises);
};

//callback for ajax request
function addCanvas(data, layerName, filter) {
	//are these point data?
    data.features[0].geometry.type === 'Point'
        ? createPointCanvas(data, layerName, filter)
        : createNonPointCanvas(data, layerName, filter)
};

/* CREATE POINT */
function createPointCanvas(data, layerName, filter) {

	var markers = [];

    //loop through geojson data featureCollection
	$.each(data.features, function(i, point) {
        var coords = { 
            lat: point.geometry.coordinates[1],
            lng: point.geometry.coordinates[0]
        }

        //set coordinates and pass point data to object
		var d = {"slat": coords.lat, "slon": coords.lng, feature: point};
		markers.push(d);
	});

	var canvasPointLayer = L.FullCanvas.extend({
        options: {
            //passing filter from layerConfig
            filter: filter
        },

		/* STYLING POINTS */
	    drawSource: function(point) {
	        var ctx = this.getCanvas().getContext("2d");

	        ctx.beginPath();

            //size
            ctx.arc(point.x, point.y , 5, 0, 2 * Math.PI, true);

            //outline
            // ctx.lineWidth = 2;
            // ctx.strokeStyle = '#FFF';
            // ctx.stroke();

            //fill
            ctx.fillStyle = "#F00";
            ctx.fill();

	    },

	    //click handler for retrieving attributes of points
	    clickedPoints: function(points, ev){
	    	if (points.length) {
                var content = "";

	    		//show first point or at least make user select a specific point - FEEL FREE TO MODIFY
    			var attr = points[0].data.feature.properties;
    			for (var key in attr) {
    				var str = "<li><strong>" + key + "</strong>: " + attr[key] + "</li>";
    				content = content.concat(str);
    			};

                //only show popup, if there's actual content
                if (content !== '') {
                    pointPopup = new L.Popup();

                    pointPopup
                        .setLatLng(ev.latlng)
                        .setContent("<span><ul>" + content + "</ul></span>")

                    map.addLayer(pointPopup);
                }
	    	}
	    },

        //basic filter function
        filter: function(features) {
            var filterObj = this.options.filter
            filteredData = [];
            $.each(features, function(i, canvasFeature) {
                var data = canvasFeature.data.feature;
                feature = Object.keys(filterObj).every(function (k) {
                    return data.properties[k] === filterObj[k]
                })
                if (feature) {
                    filteredData.push(canvasFeature);
                }
            })
            return filteredData;
        },
	});

    //create new canvas point layer
	var pointLayer = new canvasPointLayer();

	pointLayer.setData(markers);
	pointLayer.addLayerTo(map);

    if (layerControl === false) {
        layerControl = L.control.layers().addTo(map);
    }
    layerControl.addOverlay(pointLayer, layerName);
};




/* CREATE POLYGON/LINESTRING */
function createNonPointCanvas(data, layerName, filter) {
    var nonPointCanvasLayer = L.CanvasGeojsonLayer.extend({

        //pass filter from layerConfig
        options: {
            filter: filter
        },

        //click handler
        onClick: function(features, latlng) {
            if (features.length) {
                var latlng = latlng;
                var content = '';
                $.each(features, function(i, feature) {
                    if (feature !== undefined) {
                        var attr = feature.geojson.properties;
                        for (var key in attr) {
                            var str = "<li><strong>" + key + "</strong>: " + attr[key] + "</li>";
                            content = content.concat(str);
                        };
                    }
                })
                //only show popup if there's actual content
                if (content !== ''){
                    polyPopup = new L.Popup();

                    polyPopup
                        .setLatLng(latlng)
                        .setContent("<span><ul>" + content + "</ul></span>")

                    map.addLayer(polyPopup);
                }

            }
        },

        renderer: function(ctx, xy, lmap, canvasFeature) {
            var layer = canvasLayer,
            ctx = ctx || canvasLayer._ctx,
            map = lmap || canvasLayer._map;
            
            canvasFeature ? feats = [canvasFeature] : feats = layer.features;

            //does filter param exist? if so filter
            if (layer.options.filter && typeof(layer.options.filter) === "object") {
                feats = layer.filter(feats);
            }

            //check featureCollection type
            if (typeof canvasFeature != "undefined" && feats.length !== 0) {
                if (feats[0].type === 'Polygon') {
                   renderPolygon(xy, ctx);
                } else if (feats[0].type === 'LineString') {
                   renderLine(xy, ctx);
                }
            } else {
                //loop through each feature and render
                $.each(feats, function(i, canvasFeature) {
                    layer.toCanvasXY(canvasFeature, canvasFeature.geojson.geometry, layer._map._zoom);
                    if (canvasFeature.type === 'Polygon') {
                        renderPolygon(canvasFeature.getCanvasXY(), ctx);
                    } else if (canvasFeature.type === 'LineString') {
                        renderLine(canvasFeature.getCanvasXY(), ctx);
                    }
                });
            }
        },

        //basic filter method
        filter: function(features) {
            var filterObj = this.options.filter
            filteredData = [];
            $.each(features, function(i, canvasFeature) {
                var data = canvasFeature.geojson;
                feature = Object.keys(filterObj).every(function (k) {
                    return data.properties[k] === filterObj[k]
                })
                if (feature) {
                    filteredData.push(canvasFeature);
                }
            })
            return filteredData;
        }
    });

    var canvasLayer = new nonPointCanvasLayer();

    //add canvas to map
    canvasLayer.addTo(map);
    
    canvasLayer.addCanvasFeatures(L.CanvasFeatureFactory(data));

    //renderer allows for styling customization
    canvasLayer.renderer();




    /* STYLE FUNCTION LINESTRING */
  	function renderLine(xyPoints, ctx) {
		ctx.beginPath();

        //line color and width
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#404060';

        //no fill between lines - aka transparent
		ctx.fillStyle = "rgba(0, 0, 200, 0)";

        //moving from point to point
		var j;
		ctx.moveTo(xyPoints[0].x, xyPoints[0].y);
		for (j = 1; j < xyPoints.length; j++) {
		  ctx.lineTo(xyPoints[j].x, xyPoints[j].y);
		}

		ctx.stroke();
		ctx.fill();
  	};

    /* STYLE FUNCTION POLYGON */
  	function renderPolygon(xyPoints, ctx) {
		ctx.beginPath();

        //outline
		ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 2;

        //color
		ctx.fillStyle = '#fc8d62';

        //opacity
        ctx.globalAlpha = 0.8;

        //moving from point to point
		var j;
		ctx.moveTo(xyPoints[0].x, xyPoints[0].y);
		for (j = 1; j < xyPoints.length; j++) {
		  ctx.lineTo(xyPoints[j].x, xyPoints[j].y);
		}
		ctx.lineTo(xyPoints[0].x, xyPoints[0].y);

		ctx.stroke();
		ctx.fill();
  	};


    if (layerControl === false) {
        layerControl = L.control.layers().addTo(map);
    }
    //add layer to Layer Control
    layerControl.addOverlay(canvasLayer, layerName);
};

