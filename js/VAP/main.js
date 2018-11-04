function invertColor(color) {
	return new THREE.Color(1.0-color.r, 1.0-color.g, 1.0-color.b);
}

class Scene {
	
	constructor(mainDiv, controlsDiv, outputDiv, defaultRadius, numberOfSegements) {
			this.mainDiv = mainDiv;
			mainDiv.sceneObject = this;

			this.selectedObject = null;
			this.raycaster = new THREE.Raycaster();
			this.mouseVector = new THREE.Vector3();
	
			// init renderer
			this.renderer = new THREE.WebGLRenderer( { antialias: true } );
			this.renderer.setPixelRatio( window.devicePixelRatio );
			this.renderer.setSize( mainDiv.clientWidth, mainDiv.clientHeight );
			mainDiv.appendChild( this.renderer.domElement );

			// init scene
			this.scene = new THREE.Scene();
			this.scene.background = new THREE.Color( 0x333333 );

			this.groupOfGrid = new THREE.Group();
			this.scene.add(this.groupOfGrid);

			this.groupOfSpheres = new THREE.Group();
			this.scene.add(this.groupOfSpheres);

			// init camera
			this.camera = new THREE.PerspectiveCamera( 50, mainDiv.clientWidth / mainDiv.clientHeight, 1, 1000 );
			this.camera.position.set(100, 100, 100);
			this.camera.lookAt( this.scene.position );

			this.controls = new THREE.OrbitControls( this.camera, this.renderer.domElement );
			this.controls.enableRotate = true;
			this.controls.saveState();

			this.drawAxes();

			this.drawGrid();

			//mainDiv.addEventListener( 'resize', this.onResize, false );
			mainDiv.addEventListener( "click", function(event){this.sceneObject.onMouseClick(event);}, false );
			
			// this.groupOfGrid.add(formGrid());
			//mainDiv.addEventListener( 'resize', this.onResize, false );
			mainDiv.addEventListener( "click", function(event){this.sceneObject.onMouseClick(event);}, false );
			
			this.height = 10;
			this.defaultSpRad = defaultRadius;
			this.width = 10;
			this.proectionSubSpace = [0,1,2];
			this.dimNames=[];
			this.controlsDiv = controlsDiv;
			this.outputDiv = outputDiv;
			this.numberOfSegements = numberOfSegements;
			this.outputTable = null;
			this.sphereGeometry = new THREE.SphereGeometry( this.defaultSpRad, this.numberOfSegements, this.numberOfSegements);


            var FizzyText = function() {
                  this.X = 'X';
                  this.Y = 'Y';
                  this.Z = 'Z';
            }
            this.gui = new dat.GUI();
            var text = new FizzyText();
            this.gui.add(text, 'X');
            this.gui.add(text, 'Y');
            this.gui.add(text, 'Z');
	}

	drawAxes() {
		var axes = new THREE.AxesHelper( 100 );
		this.addLabelAxes( axes, this.scene, 'X', 'Y', 'Z');
		this.scene.add( axes );
	}

	drawGrid() {

        var gridXZ = new THREE.GridHelper(100, 10, 'gray', 'gray');
        gridXZ.position.set( 50,-0.1,50 );
        this.scene.add(gridXZ);

        var gridXY = new THREE.GridHelper(100, 10, 'gray', 'gray');
        gridXY.position.set( 50,50,-0.1 );
        gridXY.rotation.x = Math.PI/2;
        this.scene.add(gridXY);

        var gridYZ = new THREE.GridHelper(100, 10, 'gray', 'gray');
        gridYZ.position.set( -0.1,50,50 );
        gridYZ.rotation.z = Math.PI/2;
        this.scene.add(gridYZ);

	}

	addLabelAxes(axes, scene, labelX, labelY, labelZ) {

		// Axes label
		var loader = new THREE.FontLoader();
		loader.load('fonts/optimer_regular.typeface.json',

			// onLoad callback
			function ( font ) {
				var X = new THREE.TextGeometry(labelX, {
					font: font,
					size: 3,
					height: 1,
					curveSegments: 1,
				});
				var Y = new THREE.TextGeometry(labelY, {
					font: font,
					size: 3,
					height: 1,
					curveSegments: 1,
				});
				var Z = new THREE.TextGeometry(labelZ, {
					font: font,
					size: 3,
					height: 1,
					curveSegments: 1,
				});

				var axes_list = [X, Z, Y];
				var colors = ['red', 'blue', 'green'];
				var rotation = [0, Math.PI / 2, 0];
				var z_coord = [0, 100, 0];

				for ( var i=1; i<=3; i++ ) {
					var color = new THREE.Color(colors[i-1]);
					var textMaterial = new THREE.MeshBasicMaterial({color: color});
					var meshText = new THREE.Mesh(axes_list[i-1], textMaterial);
					var position = axes.geometry.attributes.position;
					// Position of axis
					meshText.position.x = position.getX(i);
					meshText.position.y = position.getY(i);
					meshText.position.z = position.getZ(i) + z_coord[i-1];
					meshText.rotation.y = rotation[i-1];
					scene.add( meshText );
				}
			},

			// onProgress callback
			function ( xhr ) {
				console.log( (xhr.loaded / xhr.total * 100) + '% loaded' );
			},

			// onError callback
			function ( err ) {
				console.log( 'An error happened' );
			}

		);
	}
	
	setDimNames(dims){
		this.dimNames = dims;
	}
	
	createSphere(data, col){
		var material = new THREE.MeshBasicMaterial( {color: col} );
		var sphere = new THREE.Mesh(this.sphereGeometry, material);
		sphere.position.x = data[1][this.proectionSubSpace[0]];
		sphere.position.y = data[1][this.proectionSubSpace[1]];
		sphere.position.z = data[1][this.proectionSubSpace[2]];
		sphere.dataObject = data;
		data[3] = sphere;
		this.groupOfSpheres.add(sphere);
		return	sphere;
	}
	
	animate() {
		this.renderer.render( this.scene, this.camera );
	}

	onResize() {

		this.camera.aspect = this.mainDiv.clientWidth / this.mainDiv.clientHeight;
		this.camera.updateProjectionMatrix();

		this.renderer.setSize( this.mainDiv.clientWidth, this.mainDiv.clientHeight );

	}

	onMouseClick(event) {
		event.preventDefault();
		if ( this.outputTable!=null ) {
			if (this.selectedObject!=null)
			{
				this.unSelectObject(this.selectedObject);
				this.selectedObject = null;
			}
			this.outputDiv.removeChild(this.outputTable);
			this.outputTable = null;
		}

		this.intersects = this.getIntersects( event.layerX, event.layerY );
		if ( this.intersects.length > 0 ) {
			var res = this.intersects.filter( function ( res ) {

				return res && res.object;

			} )[ 0 ];

			if ( res && res.object ) {
				this.selectedObject = res.object;
				this.selectObject(this.selectedObject);
				this.outputTable = this.printChosenElement();
				this.outputDiv.appendChild(this.outputTable);
			}

		}

	}
	
	printAllToDefault(){
		if ( this.selectedObject ) {
			this.outputDiv.removeChild(this.outputTable);
		}
		this.outputTable = this.printAllElements();
		this.outputDiv.appendChild(this.outputTable);
	}
	
	selectObject(obj){
		var geometry = new THREE.BoxBufferGeometry( 2*obj.geometry.parameters.radius, 2*obj.geometry.parameters.radius, 2*obj.geometry.parameters.radius );
		var edges = new THREE.EdgesGeometry( geometry );
		var line = new THREE.LineSegments( edges, new THREE.LineBasicMaterial( { color: 0xffffff } ) );
		obj.selectedCircut = line;
		line.position.x = obj.position.x;
		line.position.y = obj.position.y;
		line.position.z = obj.position.z;
		this.selectedObject.material.color.set( invertColor(this.selectedObject.material.color) );
		this.scene.add(line);
	}
	
	unSelectObject(obj){
		this.scene.remove(obj.selectedCircut);
		obj.selectedCircut = null;
		this.selectedObject.material.color.set( invertColor(this.selectedObject.material.color) );

	}

	getIntersects(x, y) {

		x = ( x / this.mainDiv.clientWidth ) * 2 - 1;
		y = - ( y / this.mainDiv.clientHeight ) * 2 + 1;

		this.mouseVector.set( x, y, 0.5 );
		this.raycaster.setFromCamera( this.mouseVector, this.camera );

		return this.raycaster.intersectObject( this.groupOfSpheres, true );

	}
	
	changeRad(newRad){
		var oldGroup = this.groupOfSpheres;
		this.scene.remove(this.groupOfSpheres);
		this.groupOfSpheres = new THREE.Group();
		this.scene.add(this.groupOfSpheres);
		this.sphereGeometry = new THREE.SphereGeometry(newRad, this.numberOfSegements, this.numberOfSegements );
		this.defaultSpRad = newRad;
		var i = 0;
		for (i=0; i < oldGroup.children.length; ++i){
			if (this.selectedObject === oldGroup.children[i])
				this.selectedObject = this.createSphere(oldGroup.children[i].dataObject, newRad, oldGroup.children[i].material.color);
			else
				this.createSphere(oldGroup.children[i].dataObject, newRad, oldGroup.children[i].material.color);
		}
	}
	
	moveSpheres(){		
		var i = 0;
		if (this.selectedObject!=null)
			this.unSelectObject(this.selectedObject);
		for (i=0; i<this.groupOfSpheres.children.length; ++i){
			var sphere = this.groupOfSpheres.children[i];
			sphere.position.x = sphere.dataObject[1][this.proectionSubSpace[0]];
			sphere.position.y = sphere.dataObject[1][this.proectionSubSpace[1]];
			sphere.position.z = sphere.dataObject[1][this.proectionSubSpace[2]];
		}
		if (this.selectedObject!=null)
			this.selectObject(this.selectedObject);
	}
	
	setNewSubSpace(x1, x2, x3){
		this.proectionSubSpace[0] = x1;
		this.proectionSubSpace[1] = x2;
		this.proectionSubSpace[2] = x3;
		this.moveSpheres();
	}
	
	resetCamera(){
		this.controls.reset();
	}
	
	createControlElements(){
		var i=0;
		var j=0;
		var chooseDimArray=[];
		for (j=0; j<3; ++j){
			var chooseDim = document.createElement("select");
			for (i=1; i<this.dimNames.length; ++i){
				var newEl = document.createElement("option");
				if (this.proectionSubSpace[j]==i-1)
					newEl.selected = true;
				newEl.value = i.toString();
				newEl.text = this.dimNames[i];
				chooseDim.add(newEl);
			}
			this.controlsDiv.appendChild(chooseDim);
			chooseDimArray.push(chooseDim);
		}
		var changeDimButton = document.createElement("button");
		changeDimButton.innerText = "Change Dimensions";
		changeDimButton.sceneObject = this;
		changeDimButton.dimsSelectArray = chooseDimArray;
		changeDimButton.onclick=function(){
			this.sceneObject.setNewSubSpace(parseInt(this.dimsSelectArray[0].value), 
				parseInt(this.dimsSelectArray[1].value), parseInt(this.dimsSelectArray[2].value)); 
			};
		this.controlsDiv.appendChild(changeDimButton);
		this.controlsDiv.appendChild(document.createElement("br"));
		
		
		var newRadiusInput=document.createElement("input");
		newRadiusInput.type="number";
		newRadiusInput.step = 0.1;
		newRadiusInput.value = this.defaultSpRad.toString();
		this.controlsDiv.appendChild(newRadiusInput);
		var changeRadiusButton = document.createElement("button");
		changeRadiusButton.innerText = "Change Radius";
		changeRadiusButton.sceneObject = this;
		changeRadiusButton.radiusInput = newRadiusInput;
		changeRadiusButton.onclick=function(){
			this.sceneObject.changeRad(parseInt(this.radiusInput.value)); 
			};
		this.controlsDiv.appendChild(changeRadiusButton);
		this.controlsDiv.appendChild(document.createElement("br"));
		
		
		var resetCameraButton = document.createElement("button");
		resetCameraButton.innerText = "Reset camera";
		resetCameraButton.sceneObject = this;
		resetCameraButton.onclick=function(){
			this.sceneObject.resetCamera(); 
			};
		this.controlsDiv.appendChild(resetCameraButton);
		
		
		var resetCameraButton = document.createElement("button");
		resetCameraButton.innerText = "Print all Elements";
		resetCameraButton.sceneObject = this;
		resetCameraButton.onclick=function(){
			this.sceneObject.printAllToDefault(); 
			};
		this.controlsDiv.appendChild(resetCameraButton);
		this.controlsDiv.appendChild(document.createElement("br"));
		
	}
	
	printChosenElement(){
		var table = document.createElement("table");
		table.classList.add("infoTableForSceneElement");
		var row = document.createElement("tr");
		table.appendChild(row);
		
		var cell = null;
		
		var i=0;
		for(i=0; i<this.dimNames.length; ++i){
			cell = document.createElement("th");
			cell.innerText = this.dimNames[i].toString();
			row.appendChild(cell);
		}
		cell = document.createElement("th");
		cell.innerText = "Cluster";
		row.appendChild(cell);
		
		row = document.createElement("tr");
		table.appendChild(row);
		
		cell = document.createElement("th");
		cell.innerText = this.selectedObject.dataObject[0].toString();
		row.appendChild(cell);
		
		for(i=0; i<this.selectedObject.dataObject[1].length; i++){
			var cell = document.createElement("td");
			cell.innerText = this.selectedObject.dataObject[1][i].toString();
			row.appendChild(cell);
		}
		cell = document.createElement("td");
		cell.bgColor = invertColor(this.selectedObject.material.color).getHexString();
		row.appendChild(cell);
		return table;
	}
	
	printAllElements(){
		var table = document.createElement("table");
		table.classList.add("infoTableForSceneElement");
		var row = document.createElement("tr");
		table.appendChild(row);
		
		var cell = null;
		
		var i=0;
		for(i=0; i<this.dimNames.length; ++i){
			cell = document.createElement("th");
			cell.innerText = this.dimNames[i].toString();
			row.appendChild(cell);
		}
		cell = document.createElement("th");
		cell.innerText = "Cluster";
		row.appendChild(cell);
		
		var j=0;
		for (j=0; j < this.groupOfSpheres.children.length; ++j){
			var obj	= this.groupOfSpheres.children[j];
			row = document.createElement("tr");
			table.appendChild(row);
			
			cell = document.createElement("th");
			cell.innerText = obj.dataObject[0].toString();
			row.appendChild(cell);
			
			for(i=0; i<obj.dataObject[1].length; i++){
				cell = document.createElement("td");
				cell.innerText = obj.dataObject[1][i].toString();
				row.appendChild(cell);
			}
			cell = document.createElement("td");
			if (this.selectObject==obj)
				cell.bgColor = invertColor(obj.material.color).getHexString();
			else
				cell.bgColor = obj.material.color.getHexString();
			row.appendChild(cell);
		}
		return table;
	}
}