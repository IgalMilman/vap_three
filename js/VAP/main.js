function invertColor(color) {
	return new THREE.Color(1.0-color.r, 1.0-color.g, 1.0-color.b);
}

function formGrid(){
	var grid = new THREE.GridHelper(200, 20, '#5BB', '#FFF');
	return grid;
}

class Scene{
	
	constructor(mainDiv, controlsDiv, outputDiv) {
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
			this.camera.position.set( 80, 80, 80 );
			this.camera.lookAt( this.scene.position );

			this.controls = new THREE.OrbitControls( this.camera, this.renderer.domElement );
			this.controls.enableRotate = true;
			this.controls.saveState();
			
			this.groupOfGrid.add(formGrid());
			//mainDiv.addEventListener( 'resize', this.onResize, false );
			mainDiv.addEventListener( "click", function(event){this.sceneObject.onMouseClick(event);}, false );
			
			this.height = 10;
			this.width = 10;
			this.proectionSubSpace = [0,1,2];
			this.dimNames=[];
			this.defaultSpRad = 0.5;
			this.controlsDiv = controlsDiv;
			this.outputDiv = outputDiv;
			this.outputTable = null;
	}
	
	setDimNames(dims){
		this.dimNames = dims;
	}
	
	createSphere(data, rad, col){
		var geometry = new THREE.SphereGeometry( rad, 32, 32 );
		var material = new THREE.MeshBasicMaterial( {color: col} );
		var sphere = new THREE.Mesh(geometry, material);
		sphere.position.x = data[1][this.proectionSubSpace[0]];
		sphere.position.y = data[1][this.proectionSubSpace[1]];
		sphere.position.z = data[1][this.proectionSubSpace[2]];
		sphere.dataObject = data;
		data[3] = sphere;
		this.groupOfSpheres.add(sphere);
		this.defaultSpRad = rad;
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

	onMouseClick( event ) {
		event.preventDefault();
		if ( this.selectedObject ) {
			this.unSelectObject(this.selectedObject);
			this.selectedObject = null;
			this.outputDiv.removeChild(this.outputTable);
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

	getIntersects( x, y ) {

		x = ( x / this.mainDiv.clientWidth ) * 2 - 1;
		y = - ( y / this.mainDiv.clientHeight ) * 2 + 1;

		this.mouseVector.set( x, y, 0.5 );
		this.raycaster.setFromCamera( this.mouseVector, this.camera );

		return this.raycaster.intersectObject( this.groupOfSpheres, true );

	}
	
	changeRad( newRad ){
		var oldGroup = this.groupOfSpheres;
		this.scene.remove(this.groupOfSpheres);
		this.groupOfSpheres = new THREE.Group();
		this.scene.add(this.groupOfSpheres);
		
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
		for (i=0; i<this.groupOfSpheres.children.length; ++i){
			var sphere = this.groupOfSpheres.children[i];
			sphere.position.x = sphere.dataObject[1][this.proectionSubSpace[0]];
			sphere.position.y = sphere.dataObject[1][this.proectionSubSpace[1]];
			sphere.position.z = sphere.dataObject[1][this.proectionSubSpace[2]];
		}		
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
			for (i=0; i<this.dimNames.length; ++i){
				var newEl = document.createElement("option");
				if (this.proectionSubSpace[j]==i)
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
			cell.innerText=this.dimNames[i].toString();
			row.appendChild(cell);
		}
		
		var row = document.createElement("tr");
		table.appendChild(row);
		
		cell = document.createElement("th");
		cell.innerText = this.selectedObject.dataObject[0].toString();
		row.appendChild(cell);
		
		for(i=0; i<this.selectedObject.dataObject[1].length; i++){
			var cell = document.createElement("td");
			cell.innerText = this.selectedObject.dataObject[1][i].toString();
			row.appendChild(cell);
		}
		return table;
	}
}