/*
 * Copyright 2014, Gregg Tavares.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Gregg Tavares. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
"use strict";

// Start the main app logic.
requirejs(
  [ 'hft/gameserver',
    'hft/gamesupport',
    'hft/localnetplayer',
    'hft/misc/misc',
    '../bower_components/hft-utils/dist/audio',
    '../bower_components/hft-utils/dist/entitysystem',
    './goal',
    './math',
    './playermanager',
    './rand',
    './tree',
    './tweeny',
  ], function(
    GameServer,
    GameSupport,
    LocalNetPlayer,
    Misc,
    AudioManager,
    EntitySystem,
    Goal,
    math,
    PlayerManager,
    rand,
    Tree,
    tweeny) {

  var g_canvas;
  var g_corners = [];
  var g_localPlayers = [];
  var g_services = {};
  var setCornerPos = function() {};

  // You can set these from the URL with
  // http://path/gameview.html?settings={name:value,name:value}
  var globals = {
    audio: true,
    showCorners: false,
    showSphere: false,
    showCollision: false,
    maxShots: 2,
    shotDuration: 5,
    shotInterval: 1,
    shotVelocity: 400,
    numLocalPlayers: 0,
    playerSize: 2,
    playerRotationTargetSpeed: 5,
    playerSlowDownSpeed: 2.5,
    playerVelocity: 2,
    playerStillVelocity: 0,
    playerMaxVelocity: 10,
    playerShakeThreshold: 15,  // must shake harder than this to trigger
    playerFlapSpeed: 20,
    playerFlapMaxSpeed: 40,
    playerFlapRange: 0.1,
    playerFlapAngleRange: Math.PI * 0.25,
    goalSize: 0.5,
    goalHitSize: 0.05,
    haveServer: true,
    areaSize: 300,
    time: 0,
    clearColor: 0x000000, //0xC0FFFF,
    fieldOfView: 20,
    zNear: 50,
    zFar: 2000,
    front: 100,
    back: 120,
    markSize: 1,
    areaFront: 100,
    areaBack: 120,
    areaWidth: 100,
    areaHeight: 100,
    corners: [],
    treeBranchRadius: 0.66,
    treeBranchLength: 8,
    treeRootLength: 4,
    treeMinLength: 2,
    treeMaxLength: 4,
    treeMinBend: 0.05,
    treeMaxBend: 0.2,
    treeMinTwist: -0.5,
    treeMaxTwist: 0.5,
    treeGirth: 0.2, //1,
    numTrees: 40,
    treeDepth: 3,
    leafScaleShrink: 0.9,
    leafScale: 3,
    numPetals: 5,
    bloomDuration: 15,
    fallDuration: 5,
    bloomStrength: 1,
    bloomKernelSize: 25,
    bloomSigma: 4,
    bloomResolution: 256,
  };

  window.g = globals;
  window.s = g_services;

  function $(id) {
    return document.getElementById(id);
  }

  function startPlayer(netPlayer, name) {
    return playerManager.createPlayer(name, netPlayer);
  }

  Misc.applyUrlSettings(globals);

  g_canvas = $("canvas");
  var renderer = new THREE.WebGLRenderer({canvas: g_canvas});
  g_services.renderer = renderer;
  renderer.autoClear = false;
  var camera = new THREE.PerspectiveCamera(globals.fieldOfView, g_canvas.clientWidth / g_canvas.clientHeight, globals.zNear, globals.zFar);
  g_services.camera = camera;
  var entitySys = new EntitySystem();
  g_services.entitySystem = entitySys;
  g_services.tmgr = new tweeny.TweenManager();

  var scene = new THREE.Scene();
  g_services.scene = scene;
  var geometry = {};
  g_services.geometry = geometry;
  geometry.playerMesh = new THREE.CylinderGeometry(
    0, 1, 2, 4, 1, false);
  geometry.treeMesh = new THREE.CylinderGeometry(
    globals.treeBranchRadius * globals.treeGirth, globals.treeGirth, 1, 4, 4, 1, false);
  geometry.treeMesh.applyMatrix((new THREE.Matrix4()).makeTranslation(0, 0.5, 0));
  geometry.shotMesh = new THREE.BoxGeometry(10, 10, 10);
  geometry.ballMesh = new THREE.SphereBufferGeometry(0.4, 8, 4);
  geometry.goalMesh = new THREE.SphereBufferGeometry(globals.goalSize, 8, 4);
  geometry.goalMesh.applyMatrix((new THREE.Matrix4()).makeTranslation(0, globals.goalSize * 0.9, 0));
  geometry.petalMesh = new THREE.SphereBufferGeometry(globals.goalSize, 8, 4);
  geometry.petalMesh.applyMatrix((new THREE.Matrix4()).makeScale(1, 3, 0.1));
  geometry.wingMesh = new THREE.PlaneBufferGeometry(1, 1, 1, 1);
  geometry.leafMesh = new THREE.PlaneBufferGeometry(1, 1, 1, 1);
  geometry.leafMesh.applyMatrix((new THREE.Matrix4()).makeTranslation(-0.5, 0, 0));

  var sky = new THREE.Sky();
//  scene.add( sky.mesh );

  var effectController  = {
    turbidity: 20, //13, //10,
    reileigh: 1, //1.2, //2,
    mieCoefficient: 0.013, //0.005,
    mieDirectionalG: 0.74, //0.8,
    luminance: 1.18, //1,
    inclination: 0.44, // 0.49, // elevation / inclination
    azimuth: 0.25, //0.25, // Facing front,
    sun: !true,
  };

  var uniforms = sky.uniforms;
  uniforms.turbidity.value = effectController.turbidity;
  uniforms.reileigh.value = effectController.reileigh;
  uniforms.luminance.value = effectController.luminance;
  uniforms.mieCoefficient.value = effectController.mieCoefficient;
  uniforms.mieDirectionalG.value = effectController.mieDirectionalG;

  var theta = Math.PI * (effectController.inclination - 0.5);
  var phi = 2 * Math.PI * (effectController.azimuth - 0.5);

  var distance = 2000; //400000;
  var sunSphere = {
    position: new THREE.Vector3(),
  };
  sunSphere.position.x = distance * Math.cos(phi);
  sunSphere.position.y = distance * Math.sin(phi) * Math.sin(theta);
  sunSphere.position.z = distance * Math.sin(phi) * Math.cos(theta);

  sunSphere.visible = effectController.sun;

  sky.uniforms.sunPosition.value.copy(sunSphere.position);

  g_services.shaders = {};
  Array.prototype.forEach.call(document.querySelectorAll("script[type=shader"), function(element) {
    g_services.shaders[element.id] = element.text;
  });
  var textureInfos = {
    simpleWing01: {
      url: "assets/simple-wing-01.png",
      adjustRange: [0, 1],
      baseColor: 0xDE2281,
    },
    simpleWing02: {
      url: "assets/simple-wing-02.png",
      adjustRange: [0, 1],
      baseColor: 0xDE2281,
    },
    simpleWing03: {
      url: "assets/simple-wing-03.png",
      adjustRange: [0, 1],
      baseColor: 0xDE2281,
    },
    simpleWing04: {
      url: "assets/simple-wing-04.png",
      adjustRange: [0, 1],
      baseColor: 0xDE2281,
    },
//    blueWing: {
//      url: "assets/blue-wing.png",
//      baseColor: 0x30b8DA,
//      adjustRange: [0.4, 0.9],
//    },
//    monarchWing: {
//      url: "assets/monarch-wing.png",
//      baseColor: 0xF0A020,
//      adjustRange: [0.0, 0.5],
//    },
//    limeWing: {
//      url: "assets/lime-wing.png",
//      baseColor: 0xD7C770,
//      adjustRange: [0.0, 0.5],
//    },
//    redWing: {
//      url: "assets/red-wing.png",
//      baseColor: 0xD40618,
//      adjustRange: [0.0, 1.0],
//    },
    leaf01: {
      url: "assets/leaf-01.png",
      baseColor: 0x37651C,
      adjustRange: [0, 1],
    },
    leaf02: {
      url: "assets/leaf-02.png",
      baseColor: 0x63790B,
      adjustRange: [0, 1],
    },
    leaf03: {
      url: "assets/leaf-03.png",
      baseColor: 0x54A728,
      adjustRange: [0, 1],
    },
  };

  g_services.wingTextures = [
//    textureInfos.blueWing,
//    textureInfos.monarchWing,
//    textureInfos.limeWing,
//    textureInfos.redWing,
    textureInfos.simpleWing01,
    textureInfos.simpleWing02,
    textureInfos.simpleWing03,
    textureInfos.simpleWing04,
  ];

  g_services.leafTextures = [
    textureInfos.leaf01,
    textureInfos.leaf02,
    textureInfos.leaf03,
  ];

  Object.keys(textureInfos).forEach(function(key) {
    var textureInfo = textureInfos[key];
    var texture = THREE.ImageUtils.loadTexture( textureInfo.url );
    textureInfo.texture  = texture;
  });
  g_services.textureInfos = textureInfos;

  var light = new THREE.HemisphereLight( 0xffbbbb, 0x444488 );
  scene.add(light);
//  var light1 = new THREE.DirectionalLight(0xE0E0FF, 1);
//  light1.position.set(200, 500, 200);
//  scene.add(light1);
//  var light1 = new THREE.DirectionalLight(0xFFE0E0, 0.5);
//  light1.position.set(-200, -500, -200);
//  scene.add(light1);

  if (globals.showSphere) {
    var sphere = new THREE.SphereBufferGeometry(50, 16, 8);
    var material = new THREE.MeshPhongMaterial({
      ambient: 0x030303,
      color: 0x0000FF,
      specular: 0xFFFFFF,
      shininess: 30,
      shading: THREE.FlatShading,
    });
    var sphereMesh = new THREE.Mesh(sphere, material);
    scene.add(sphereMesh);
  }

  if (globals.showCorners) {
    g_services.corners = g_corners;
    var geo = new THREE.BoxGeometry(globals.markSize, globals.markSize, globals.markSize);
    var material = new THREE.MeshPhongMaterial({
      ambient: 0x808080,
      color: 0xFFFFFFFF,
      specular: 0xFFFFFF,
      shininess: 30,
      shading: THREE.FlatShading,
    });
    var materialFar = new THREE.MeshPhongMaterial({
      ambient: 0xFF8080,
      color: 0xFFFF8080,
      specular: 0xFF8080,
      shininess: 30,
      shading: THREE.FlatShading,
    });
    material.side = THREE.DoubleSide;
    var addMesh = function(ii, x, y, z) {
      var mesh = new THREE.Mesh(geo, ii > 3 ? materialFar : material);
      mesh.position.set(x, y, z);
      scene.add(mesh);
      return mesh;
    };
    for (var ii = 0; ii < 8; ++ii) {
      g_corners.push(addMesh(ii, 0, 0, 0));
    }

    setCornerPos = function(ndx, cx, cy, cz) {
      g_corners[ndx].position.set(cx, cy, cz);
    }
  }

  // ---------------------------------------------------

  var renderScene = new THREE.RenderPass( scene, camera );

  var effectBloom = new THREE.BloomPass( globals.bloomStrength, globals.bloomKernelSize, globals.bloomSigma, globals.bloomResolution );
  var effectCopy = new THREE.ShaderPass( THREE.CopyShader );
  var effectFXAA = new THREE.ShaderPass( THREE.FXAAShader );
  g_services.bloom = effectBloom;

  var composer = new THREE.EffectComposer( renderer );
  composer.addPass( renderScene );
  composer.addPass( effectFXAA );
  composer.addPass( effectBloom );
  composer.addPass( effectCopy );

  effectCopy.renderToScreen = true;

  // ---------------------------------------------------

  resize();
  g_services.globals = globals;
  g_services.renderer = renderer;
  var playerManager = new PlayerManager(g_services);
  g_services.playerManager = playerManager;

  // 50, 69
  scene.fog = new THREE.Fog(globals.clearColor, 60, 90);//globals.front, globals.back);

  var treeRoot = new THREE.Object3D();
  g_services.treeRoot = treeRoot;
  g_services.trees = [];
  scene.add(treeRoot);
  treeRoot.position.z = math.lerp(globals.areaFront, globals.areaBack, 0.5);
  treeRoot.position.y = globals.areaBottom - 4;

  for (var ii = 0; ii < globals.numTrees; ++ii) {
    var haveLeaves = rand.yesNo();
    var tree = new Tree(g_services, {
      rootLength: globals.treeRootLength + rand.range(10),
      numBranches: haveLeaves ? 1 : 2,
      numLeaves: 0, //haveLeaves ? 2 : 0,
      depth: globals.treeDepth,
    });
    tree.root.position.x = rand.range(globals.areaLeft, globals.areaRight);
    tree.root.position.z = rand.range(globals.areaLeft, globals.areaRight);
    //tree.root.position.x = rand.range(globals.areaLeft, globals.areaRight);
    //tree.root.position.z = rand.range(globals.areaFront, globals.areaBack);
    //tree.root.position.y = globals.areaBottom - 3;
    tree.speed = rand.plusMinus(0.1);
    treeRoot.add(tree.root);
    g_services.trees.push(tree);
  }

  var server;
  if (globals.haveServer) {
    server = new GameServer();
    g_services.server = server;
    server.addEventListener('playerconnect', startPlayer);
  }
  GameSupport.init(server, globals);

  var sounds = {
//    fire: {
//      filename: "assets/fire.ogg",
//      samples: 8,
//    },
//    explosion: {
//      filename: "assets/explosion.ogg",
//      samples: 6,
//    },
//    hitshield: {
//      filename: "assets/hitshield.ogg",
//      samples: 6,
//    },
  };
  var audioManager = new AudioManager(globals.audio ? sounds : {});
  g_services.audioManager = audioManager;

//  g_services.goal = new Goal(g_services);



  for (var ii = 0; ii < globals.numLocalPlayers; ++ii) {
    var netPlayer = new LocalNetPlayer();
    var localPlayer = {
      player: playerManager.createPlayer("LocalPlayer" + ii, netPlayer),
      netPlayer: netPlayer,
      speed: rand.plusMinus(30),
      orientation: {
        a: Math.random() * 360,
        b: 0,
        g: 90,
        x: 0,
        y: 0,
        z: 0,
        abs: false,
      },
      process: function() {
        this.orientation.b = math.emod(this.orientation.b + this.speed * globals.elapsedTime, 360);
        this.netPlayer.sendEvent('orient', this.orientation);
      },
    };
    netPlayer.sendEvent('button', { id: 0, pressed: true });
    g_services.entitySystem.addEntity(localPlayer);
    g_localPlayers.push(localPlayer);
  }


  function resize() {
    if (g_canvas.width  !== g_canvas.clientWidth ||
        g_canvas.height !== g_canvas.clientHeight) {
      camera.aspect = g_canvas.clientWidth / g_canvas.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(g_canvas.clientWidth, g_canvas.clientHeight, false);

      effectFXAA.uniforms[ 'resolution' ].value.set( 1 / g_canvas.clientWidth, 1 / g_canvas.clientHeight );
      composer.reset();

      camera.updateMatrixWorld();
      camera.matrixWorldInverse.getInverse( camera.matrixWorld );

      var viewProjMat = new THREE.Matrix4();
      var inverseViewProjMat = new THREE.Matrix4();
      viewProjMat.multiplyMatrices( camera.projectionMatrix, camera.matrixWorldInverse );
      inverseViewProjMat.getInverse( viewProjMat );

      function clipZ(z) {
          var rangeInv = 1.0 / (globals.zNear - globals.zFar);
          return (z * (globals.zNear + globals.zFar) * rangeInv +
                  globals.zNear * globals.zFar * rangeInv * 2) / -z;
      }
      var zRange = globals.zFar - globals.zNear;
      var clipNear = clipZ(-globals.front);
      var clipFar  = clipZ(-globals.back );

      // TODO: switch to frustum
      var v = new THREE.Vector3(-1, -1, clipNear);
      v.applyProjection(inverseViewProjMat);
      var v2 = new THREE.Vector3(-1, -1, clipFar);
      v2.applyProjection(inverseViewProjMat);

      globals.areaWidth  = Math.abs(v.x * 2);
      globals.areaHeight = Math.abs(v.y * 2);
      globals.areaLeft   =  v.x;
      globals.areaRight  = -v.x;
      globals.areaTop    = -v.y;
      globals.areaBottom =  v.y;
      globals.areaFront  =  v.z;
      globals.areaBack   = v2.z;

      setCornerPos(0,  v.x,  v.y,  v.z);
      setCornerPos(1, -v.x,  v.y,  v.z);
      setCornerPos(2,  v.x, -v.y,  v.z);
      setCornerPos(3, -v.x, -v.y,  v.z);
      setCornerPos(4,  v.x,  v.y,  v2.z);
      setCornerPos(5, -v.x,  v.y,  v2.z);
      setCornerPos(6,  v.x, -v.y,  v2.z);
      setCornerPos(7, -v.x, -v.y,  v2.z);

    }
  }

  function render() {
    resize();

//    g_services.trees.forEach(function(tree) {
//      tree.root.rotation.y = globals.gameTime * tree.speed;
//    });

    treeRoot.rotation.y = globals.gameTime * 0.01;

    entitySys.processEntities();
    g_services.tmgr.update(globals.elapsedTime);

    renderer.setClearColor(globals.clearColor, 1);
    scene.fog.color.setHex( globals.clearColor );
//    renderer.render(scene, camera);
    renderer.clear();
    composer.render();

    if (globals.showSphere) {
      sphereMesh.rotation.x += globals.elapsedTime * 0.2;
      sphereMesh.rotation.z += globals.elapsedTime * 0.31;
    }
  }

  GameSupport.run(globals, render);
});


