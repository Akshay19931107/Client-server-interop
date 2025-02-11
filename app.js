
import Map from 'ol/Map.js';
import GeoJSON from 'ol/format/GeoJSON.js';
import Projection from 'ol/proj/Projection.js';
import OSM from 'ol/source/OSM.js';
import TileLayer from 'ol/layer/Tile.js';
import TileWMS from 'ol/source/TileWMS.js';
import View from 'ol/View.js';
import VectorSource from 'ol/source/Vector.js';
import WMSCapabilities from 'ol/format/WMSCapabilities.js';
import VectorLayer from 'ol/layer/Vector.js';
import * as ol from 'ol';



// Get all tab links and content elements
const tabs = document.querySelectorAll('.tablinks');
const allContent = document.querySelectorAll('.content');

// OSM Basemap
const basemapLayer = new TileLayer({
  source: new OSM(),
});

// Initialize the feature layer's VectorSource
const featureSource = new VectorSource();

// Initialize the feature layer
const featureLayer = new VectorLayer({
  source: featureSource,
});

// Initialize the map
const map = new Map({
  target: 'map',
  layers: [
    basemapLayer,
    featureLayer,
  ],
  view: new View({
    center: [0, 0],
    zoom: 2,
  }),
});
  
// Add click event listener to each tab
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        // Toggle active class for the clicked tab
        tabs.forEach(t => {
            t.classList.remove('active');
        });
        tab.classList.add('active');

        // Hide all content elements
        allContent.forEach(content => {
            content.style.display = 'none';
        });

        // Show the corresponding content element if the tab is active
        if (tab.classList.contains('active')) {
            const contentId = tab.id.replace('btn', '');
            document.getElementById(contentId).style.display = 'block';
        }
    });
});



// WMS

// WMS GETCAPABILITIES

document.getElementById('getWMSCapabilities').addEventListener('click', async () => {
  const parser = new WMSCapabilities();

  fetch('http://localhost:8080/geoserver/wms?request=getCapabilities')
    .then(function (response) {
      return response.text();
    })
    .then(function (text) {
      const result = parser.read(text);
      document.getElementById('log').innerText = JSON.stringify(result, null, 2);
    
      // Extract layer names from capabilities
      const layers = result.Capability.Layer.Layer;

      // Populate dropdown with layer names
      const dropdownlayerWMS = document.getElementById('layers');
      dropdownlayerWMS.innerHTML = ''; // Clear existing options
      layers.forEach(layer => {
        const option = document.createElement('option');
        option.text = layer.Title;
        option.value = layer.Name;
        dropdownlayerWMS.appendChild(option);
      });

      // Extract supported SRS from capabilities
      const srsList = result.Capability.Layer.CRS || result.Capability.Layer.SRS;

      // Populate dropdown with SRS
      const dropdownSRSwms = document.getElementById('srs');
      dropdownSRSwms.innerHTML = ''; // Clear existing options
      srsList.forEach(srs => {
        const option = document.createElement('option');
        option.text = srs;
        option.value = srs;
        dropdownSRSwms.appendChild(option);
      });

    });

});


// WMS GETMAP


document.getElementById('getMapButton').addEventListener('click', () => {
  try {
    const selectedLayer = document.getElementById('layers').value;
    const selectedSRS = document.getElementById('srs').value;
    const selectedFormat = document.getElementById('format').value;
    const bboxValue = document.getElementById('bbox').value;
    
    // Parse the bounding box input
    const bboxArray = bboxValue.split(',');
    const bbox = bboxArray.join(',');
    
    // Construct the WMS GetMap URL
    const wmsUrl = `http://localhost:8080/geoserver/ows?service=WMS&version=1.1.0&request=GetMap&layers=${selectedLayer}&bbox=${bbox}&width=768&height=384&srs=${selectedSRS}&styles=&format=${selectedFormat}`;
    
    // Fetch the map image
    fetch(wmsUrl)
      .then(response => {
        // Remove existing tile layer if any
        map.getLayers().forEach(layer => {
          if (layer instanceof TileLayer) {
            map.removeLayer(layer);
          }
        });

        // Create new tile layer with fetched URL
        const rasterLayer = new TileLayer({
          source: new TileWMS({
            url: wmsUrl,
          }),
        });
        
        // Add the tile layer to the map
        map.addLayer(rasterLayer);
      })
      .catch(error => {
        console.error('Error fetching map image:', error.message);
      });
  } catch (error) {
    console.error('Error fetching map image:', error.message);
  }
});



// WMS GETFEATUREINFO

document.getElementById('getWMSFeatureinfo').addEventListener('click', async () => {
  try {
    const selectedLayer = document.getElementById('layers').value;
    // Initialize the WMS source
    const wmsSource = new TileWMS({
      url: 'http://localhost:8080/geoserver/wms',
      params: {
        'LAYERS': selectedLayer,
        'TILED': true
      },
      serverType: 'geoserver',
      crossOrigin: 'anonymous'
    });

    // Get the coordinate of the click event
    const coordinate = map.getEventCoordinate(event);

    // Get the view resolution
    const viewResolution = map.getView().getResolution();

    // Construct the GetFeatureInfo URL
    const url = wmsSource.getFeatureInfoUrl(
      coordinate,
      viewResolution,
      'EPSG:3857',
      { 'INFO_FORMAT': 'text/plain' } // Specify the format for the response
    );

    // Fetch the GetFeatureInfo response
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Failed to fetch WMS feature information');
    }

    // Read the response text
    const infoText = await response.text();

    // Display the information in the log container
    document.getElementById('log').innerText = infoText;
  } catch (error) {
    console.error('Error fetching WMS feature information:', error.message);
  }
}); 





// WFS

// WFS getCapabilities

document.getElementById('getWFSCapabilities').addEventListener('click', async () => {
  try {
    const wfsCapabilitiesUrl = 'http://localhost:8080/geoserver/ows?service=WFS&version=1.1.0&request=GetCapabilities';

    const response = await fetch(wfsCapabilitiesUrl);
    if (!response.ok) {
      throw new Error('Failed to fetch WFS capabilities');
    }

    const text = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, 'text/xml');

    document.getElementById('log').innerHTML = `<pre style="white-space: pre-wrap; word-wrap: break-word;">${text}</pre>`;

    // Extract layer names from the capabilities document
    const featureTypeNodes = xmlDoc.querySelectorAll('FeatureType');
    const layerNames = Array.from(featureTypeNodes).map(node => node.querySelector('Name').textContent);

    // Extract srs  from the capabilities document
    const srsNodes = xmlDoc.querySelectorAll('DefaultSRS, OtherSRS'); // Adjust selectors as per your XML structure
    const srsOptions = Array.from(srsNodes).map(node => node.textContent.trim());

    // Populate the dropdown menu with layer names
    const dropdownname = document.getElementById('wfsLayers');
    layerNames.forEach(layerName => {
      const option = document.createElement('option');
      option.textContent = layerName;
      dropdownname.appendChild(option);
    });

    // Populate dropdown with SRS options
    const dropdown = document.getElementById('WFSsrs');
    dropdown.innerHTML = ''; // Clear existing options
    srsOptions.forEach(srs => {
      const option = document.createElement('option');
      option.text = srs;
      option.value = srs;
      dropdown.appendChild(option);
    });

    console.log('WFS layers:', layerNames);
  } catch (error) {
    console.error('Error fetching WFS layers:', error.message);
  }
});


// WFS GETFEATURE 

document.getElementById('getWFSFeature').addEventListener('click', async () => {
  try {
    const selectedLayer = document.getElementById('wfsLayers').value;
    const selectedSRS = document.getElementById('WFSsrs').value;

    // Construct the WFS URL for GetFeature request
    const wfsUrl = `http://localhost:8080/geoserver/ows?service=WFS&version=1.1.0&request=GetFeature&typeName=${selectedLayer}&outputFormat=application/json&srsName=${selectedSRS}`;

    // Fetch the WFS features
    const response = await fetch(wfsUrl);
    if (!response.ok) {
      throw new Error('Failed to fetch WFS features');
    }
    
    const data = await response.json();
    
    // Clear previous features
    featureSource.clear();

    // Add new features to the VectorSource
    const features = new GeoJSON().readFeatures(data);
    featureSource.addFeatures(features);

    // Zoom to the extent of the WFS features
    map.getView().fit(featureSource.getExtent());
  } catch (error) {
    console.error('Error fetching features:', error);
  }
});


// WFS DESCRIBEFEATURE 

document.getElementById('describeWFSFeature').addEventListener('click', async () => {
  const logContainer = document.getElementById('log');
  logContainer.innerHTML = ''; // Clear previous log content

  const selectedLayer = document.getElementById('wfsLayers').value;

  // Function to fetch DescribeFeatureType for each layer and append to log container
  async function fetchAndDisplayDescribeFeatureType(selectedLayer) {
    const url = `http://localhost:8080/geoserver/wfs?service=WFS&version=1.1.0&request=DescribeFeatureType&typeName=${selectedLayer}`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch DescribeFeatureType for ${selectedLayer}`);
      }
      const data = await response.text();
      logContainer.innerText = data;
    } catch (error) {
      console.error(error);
    }
  }

});




// WCS

// WCS GETCAPABILITIES 

document.getElementById('getWCSCapabilities').addEventListener('click', async () => {
  try {
    const wcsCapabilitiesUrl = 'http://localhost:8080/geoserver/wcs?service=WCS&version=1.0.0&request=GetCapabilities';
    const response = await fetch(wcsCapabilitiesUrl);
    if (!response.ok) {
      throw new Error('Failed to fetch WCS capabilities');
    }

    const text = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, 'text/xml');

    document.getElementById('log').innerHTML = `<pre style="white-space: pre-wrap; word-wrap: break-word;">${text}</pre>`;

  } catch (error) {
    console.error('Error fetching WFS layers:', error.message);
  }
});


const PORT = process.env.PORT; 
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));