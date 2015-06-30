require([
	'../../build/three.min'
], function(three) {

	var camera, scene, renderer;
	var mesh;

	init();
	animate();

	function init() {

		renderer = new three.WebGLRenderer();
		renderer.setPixelRatio( window.devicePixelRatio );
		renderer.setSize( window.innerWidth, window.innerHeight );
		document.body.appendChild( renderer.domElement );

		//

		camera = new three.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 1, 1000 );
		camera.position.z = 400;

		scene = new three.Scene();

		var geometry = new three.BoxGeometry( 200, 200, 200 );

		var texture = three.ImageUtils.loadTexture( 'textures/crate.gif' );
		texture.anisotropy = renderer.getMaxAnisotropy();

		var material = new three.MeshBasicMaterial( { map: texture } );

		mesh = new three.Mesh( geometry, material );
		scene.add( mesh );

		//

		window.addEventListener( 'resize', onWindowResize, false );

	}

	function onWindowResize() {

		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();

		renderer.setSize( window.innerWidth, window.innerHeight );

	}

	function animate() {

		requestAnimationFrame( animate );

		mesh.rotation.x += 0.005;
		mesh.rotation.y += 0.01;

		renderer.render( scene, camera );

	}
});


