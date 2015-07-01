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

define(
  [ 'hft/misc/cssparse',
    './math',
    './rand',
    './shot',
    '../bower_components/hft-utils/dist/colorutils',
  ], function(
    CSSParse,
    math,
    rand,
    Shot,
    colorUtils) {


  var playerNumber = 0;
  /**
   * Player represnt a player in the game.
   * @constructor
   */
  var Player = (function() {

    return function(services, name, netPlayer) {
      this.services = services;
      this.renderer = services.renderer;
      var globals = services.globals;

      services.entitySystem.addEntity(this);
      this.netPlayer = netPlayer;
//      this.mesh = new THREE.Mesh(services.geometry.playerMesh, this.material);
//      this.leaf = new THREE.Object3D();
      var wingNdx = playerNumber % services.wingTextures.length;
      var colorNdx = playerNumber; //wingNdx / services.wingTextures.length | 0;
      ++playerNumber;
      var wing = services.wingTextures[wingNdx];
      // Pick a color
      var hueAdjust = (((colorNdx & 0x01) << 5) |
                       ((colorNdx & 0x02) << 3) |
                       ((colorNdx & 0x04) << 1) |
                       ((colorNdx & 0x08) >> 1) |
                       ((colorNdx & 0x10) >> 3) |
                       ((colorNdx & 0x20) >> 5)) / 64;
      var valueAdjust = (colorNdx & 0x08) != 0 ? -0.2 : 0.0;
      var satAdjust   = (colorNdx & 0x04) != 0 ? -0.5 : 0.0;

      var baseHsv = colorUtils.rgb255ToHsv(
          (wing.baseColor >> 16) & 0xFF,
          (wing.baseColor >>  8) & 0xFF,
          (wing.baseColor >>  0) & 0xFF);
      baseHsv[0] = math.emod(baseHsv[0] + hueAdjust, 1);
      baseHsv[1] = math.clamp(0, 1, baseHsv[1] + satAdjust);
      baseHsv[2] = math.clamp(0, 1, baseHsv[2] + valueAdjust);
      var cssColor = colorUtils.makeCSSColorFromRgba01Array(colorUtils.hsvToRgb01(baseHsv[0], baseHsv[1], baseHsv[2]));
      netPlayer.sendCmd('setColor', {
        color: cssColor,
        wingNdx: wingNdx,
        hsvAdjust: {
          h: hueAdjust,
          s: satAdjust,
          v: valueAdjust,
        },
      });
      var material = new THREE.ShaderMaterial( {
        side: THREE.DoubleSide,
        transparent: true,
        vertexShader: services.shaders["hsva-vs"],
        fragmentShader: services.shaders["hsva-fs"],
        uniforms: {
          adjustRange: { type: "v2", value: new THREE.Vector2(wing.adjustRange[0], wing.adjustRange[1]), },
          hsvaAdjust: { type: "v4", value: new THREE.Vector4(hueAdjust, satAdjust, valueAdjust, 0), },
          texture: { type: "t", value: wing.texture },
        },
depthTest: false,
      } );
      this.material = material;

      this.root = new THREE.Object3D();
      this.mid  = new THREE.Object3D();

      this.wingJointL = new THREE.Object3D();
      this.wingJointR = new THREE.Object3D();
      this.wingL = new THREE.Mesh(services.geometry.wingMesh, material );
      this.wingR = new THREE.Mesh(services.geometry.wingMesh, material );

      this.wingL.position.x = -0.5;
      this.wingR.position.x =  0.5;
      this.wingR.scale.x = -1;

      this.wingJointL.add(this.wingL);
      this.wingJointR.add(this.wingR);
      this.mid.add(this.wingJointL);
      this.mid.add(this.wingJointR);

      this.root.scale.x = globals.playerSize;
      this.root.scale.y = globals.playerSize;
      this.root.scale.z = globals.playerSize;

//var testmaterial = new THREE.MeshPhongMaterial({
//  ambient: 0x808080,
//  color: 0x8080FF,
//  specular: 0xFFFFFF,
//  shininess: 30,
//  shading: THREE.FlatShading,
//  //wireframe: true,
//});
//
//      this.root.add(new THREE.Mesh(services.geometry.ballMesh, testmaterial));

      this.pickNewPosition();

      this.collision = new THREE.Vector3();

//      this.leaf.add(this.mesh);
//      this.mid.add(this.leaf);
      this.root.add(this.mid);
      services.scene.add(this.root);

      netPlayer.addEventListener('disconnect', Player.prototype.handleDisconnect.bind(this));
      netPlayer.addEventListener('orient', Player.prototype.handleOrient.bind(this));
      netPlayer.addEventListener('button', Player.prototype.handleButton.bind(this));
//      netPlayer.addEventListener('setColor', Player.prototype.handleSetColor.bind(this));

      var g = this.services.globals;

      this.playerName = name;
      this.targetVelocity = 0;
      this.shots = [];
      this.buttons = {};
      this.maxShots = g.maxShots;
      this.shotDuration = g.shotDuration;
      this.shootTimer = 0;
      this.score = 0;
      this.timer = 0;
      this.flapClock = rand.range(100);
      this.invincibilityTimer = 0;
      this.playerVelocity = 0;
      this.lookAt = new THREE.Vector3(0,0,0);
      this.motion = {
        x: 0,
        y: 0,
        z: 0,
      };

      this.targetOrientation = new THREE.Quaternion();

      this.setState('fly');
    };
  }());

  Player.prototype.pickNewPosition = function() {
    var globals = this.services.globals;
    this.root.position.x = rand.range(globals.areaWidth  * -0.5, globals.areaWidth  * 0.5);
    this.root.position.y = rand.range(globals.areaHeight * -0.5, globals.areaHeight * 0.5);
    this.root.position.z = rand.range(globals.areaFront, globals.areaBack);
  };

  Player.prototype.timesUp = function() {
    var globals = this.services.globals;
    this.timer -= globals.elapsedTime;
    return this.timer <= 0;
  };

  Player.prototype.setState = function(state) {
    this.state = state;
    this.process = this["state_" + state];
  }

  Player.prototype.scored = function() {
    this.sendCmd('scored', { points: 1 });
    this.pickNewPosition();
  };

//  Player.prototype.shoot = function() {
//    if (this.shots.length >= this.maxShots) {
//      this.removeShot(this.shots[0]);
//    }
//
////    this.services.audioManager.playSound('fire');
//    var mat = this.mesh.matrixWorld.elements;
//    var direction = new THREE.Vector3(mat[4], mat[5], mat[6]);
//    var shot = new Shot(
//      this.services,
//      this.root.position,
//      direction,
//      this);
//    this.shots.push(shot);
//  };

  Player.prototype.removeShot = function(shot) {
    var ndx = this.shots.indexOf(shot);
    this.shots.splice(ndx, 1);
    shot.destroy();
  };

  Player.prototype.removeFromGame = function() {
    while (this.shots.length) {
      this.removeShot(this.shots[0]);
    }
    this.services.scene.remove(this.root);
    this.services.entitySystem.removeEntity(this);
    this.services.playerManager.removePlayer(this);
  };

  Player.prototype.handleDisconnect = function() {
    this.removeFromGame();
  };

  var setObjectQuaternion = function () {
      var zee = new THREE.Vector3( 0, 0, 1 );
      var euler = new THREE.Euler();
      var q0 = new THREE.Quaternion();
      var q1 = new THREE.Quaternion( - Math.sqrt( 0.5 ), 0, 0, Math.sqrt( 0.5 ) ); // - PI/2 around the x-axis

      return function ( quaternion, alpha, beta, gamma, orient ) {
          euler.set( beta, alpha, - gamma, 'YXZ' );                       // 'ZXY' for the device, but 'YXZ' for us
          quaternion.setFromEuler( euler );                               // orient the device
          quaternion.multiply( q1 );                                      // camera looks out the back of the device, not the top
          quaternion.multiply( q0.setFromAxisAngle( zee, - orient ) );    // adjust for screen orientation
      }
  }();

  Player.prototype.handleOrient = function(msg) {
    var alpha = THREE.Math.degToRad( msg.a ); // Z
    var beta  = THREE.Math.degToRad( msg.b ); // X'
    var gamma = THREE.Math.degToRad( msg.g ); // Y''
    var orient = 0;

    setObjectQuaternion( this.targetOrientation, alpha, beta, gamma, orient );

    this.motion.x = msg.x;
    this.motion.y = msg.y;
    this.motion.z = msg.z;

    this.targetDir = -1;
  };

  Player.prototype.handleButton = function(msg) {
    this.buttons[msg.id] = msg.pressed;
  };

  Player.prototype.updateOrientation = function() {
    var globals = this.services.globals;
    var speed = Math.min(1, globals.playerRotationTargetSpeed * globals.elapsedTime);

    this.root.quaternion.slerp(this.targetOrientation, speed);
  }

//  Player.prototype.handleSetColor = function(msg) {
////    var color = CSSParse.parseCSSColor(msg.color, true);
////    this.material.color.setRGB(color[0], color[1], color[2]);
//  };

  Player.prototype.sendCmd = function(cmd, data) {
    this.netPlayer.sendCmd(cmd, data);
  };

  function keepInBox(globals, pos) {
    pos.x = math.clamp(globals.areaLeft, globals.areaRight, pos.x);
    pos.y = math.clamp(globals.areaBottom, globals.areaTop, pos.y);
    pos.z = math.clamp(globals.areaFront, globals.areaBack, pos.z);
  }

  Player.prototype.state_fly = function() {
    var globals = this.services.globals;
    this.updateOrientation();


    if (!this.buttons[0]) {
      this.targetVelocity = globals.playerStillVelocity;
    } else if (this.motion.z > globals.playerShakeThreshold) {
      this.targetVelocity = globals.playerMaxVelocity;
    } else {
      this.targetVelocity  = globals.playerVelocity;
    }
    this.playerVelocity = math.lerp(this.playerVelocity, this.targetVelocity, globals.playerSlowDownSpeed * globals.elapsedTime);

    var flapLerp = this.playerVelocity / globals.playerMaxVelocity;
    var flapSpeed = math.lerp(globals.playerFlapSpeed, globals.playerFlapMaxSpeed, flapLerp);
    this.flapClock += globals.elapsedTime * flapSpeed;
    var flapClock = this.flapClock;

    this.mid.position.z = Math.sin(flapClock) * globals.playerFlapRange;
    this.wingJointL.rotation.y =  Math.sin(flapClock) * globals.playerFlapAngleRange;
    this.wingJointR.rotation.y = -Math.sin(flapClock) * globals.playerFlapAngleRange;
    this.root.translateY(globals.elapsedTime * this.playerVelocity);
    keepInBox(globals, this.root.position);

//    this.root.scale.x = Math.max(1, this.motion.x);
//    this.root.scale.y = Math.max(1, this.motion.y);
//    this.root.scale.z = Math.max(1, this.motion.z);
//    this.shootTimer += globals.elapsedTime;
//    if (this.shootTimer >= globals.shotInterval) {
//      this.shootTimer = 0;
//      this.shoot();
//    }
    var v = this.collision;
    v.set(0,0,0);
    this.root.localToWorld(v);
    v.applyProjection(this.services.camera.projectionMatrix);
  };

  return Player;
});

