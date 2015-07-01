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

define([
    './rand',
    './tweeny'
  ], function(
    rand,
    tweeny) {

  /**
   * The Goal.
   * @constructor
   */
  function Goal(services) {
    var globals = services.globals;
    this.services = services;

    this.services.entitySystem.addEntity(this);

    this.material = new THREE.MeshPhongMaterial({
      ambient: 0x808080,
      color: 0x8080FF,
      specular: 0xFFFFFF,
      shininess: 30,
      shading: THREE.FlatShading,
      //wireframe: true,
    });

    this.hue = rand.plusMinus(0.05) + 0.0
    this.material.color.setHSL(this.hue, 0.1, 0.2);
    this.origColor = this.material.color.clone();
    this.root = new THREE.Mesh(services.geometry.goalMesh, this.material);
    this.center = new THREE.Object3D();
    this.center.position.y = globals.goalSize;
    this.root.add(this.center);
    this.center.visible = false;
    this.rotateRate = 0;
    this.hueOffset = 0;
    this.satOffset = 0;
    this.petals = [];
    this.fallingPetals = [];
    this.falling = false;
    this.ripeTimer = 0;

    for (var ii = 0; ii < globals.numPetals; ++ii) {
      var u = ii / globals.numPetals;
      var petal = new THREE.Mesh(services.geometry.petalMesh, this.material);
      this.petals.push(petal);
//      petal.scale.z = 0.1;
//      petal.scale.x = 1;
//      petal.scale.y = 3;
      var angle = Math.PI * 2 * u;
      petal.position.x = Math.cos(angle) * globals.goalSize * 2.5;
      petal.position.y = Math.sin(angle) * globals.goalSize * 2.5;
      petal.rotation.z = angle + Math.PI * 0.5;
      this.center.add(petal);
      var fallingRoot = new THREE.Object3D();
      var falling = new THREE.Mesh(services.geometry.petalMesh, this.material);
      fallingRoot.visible = false;
      fallingRoot.add(falling);
      this.services.scene.add(fallingRoot);
      this.fallingPetals.push(fallingRoot);
    }

    this.services.scene.add(this.root);
    this.timer = rand.range(1000);
    this.animSpeed = rand.range(0.9, 1.1);
    this.vector = new THREE.Vector3();
    this.flashing = false;
    this.bloomTimer = 0;
    this.blooming = false;
  }

  Goal.prototype.remove = function() {
  };

  Goal.prototype.destroy = function() {
    this.services.entitySystem.removeEntity(this);
    this.services.scene.remove(this.root);
  };

  Goal.prototype.process = function() {
    var globals = this.services.globals;
    var tmgr = this.services.tmgr;

    //this.material.needsUpdate = true;
//    this.root.rotation.x += globals.elapsedTime * 2.1;
    this.root.rotation.y += globals.elapsedTime * 0.5;
    this.root.rotation.x = Math.sin(globals.gameTime * this.animSpeed + this.timer) * 0.5;
    this.center.rotation.z += globals.elapsedTime * this.rotateRate;

    var v = this.vector;
    v.set(0, globals.goalSize * 0.9, 0);
    this.root.localToWorld(v);

//    if (v.z > globals.areaBack && v.z < globals.areaFront) {
    if (v.z > globals.areaFront) {
      this.flashing = true;
      //var adjust = Math.sin(globals.gameTime * 40 + this.timer) * 0.25;
      this.material.color.setHSL(this.hue, 1, 0.2);
    } else {
      if (this.flashing) {
        this.flashing = false;
        this.material.color.set(this.origColor);
      }
    }

    // Yes I know all this timer shit is BS! :(

    if (this.bloomTimer > 0 || this.fallingTimer > 0 || this.ripeTimer > 0) {
      this.material.color.setHSL(this.hue + this.hueOffset, 1 + this.satOffset, 0.5);
    }

    if (this.ripeTimer > 0) {
      this.ripeTimer -= globals.elapsedTime;
    }

    if (this.fallingTimer > 0) {
      this.fallingTimer -= globals.elapsedTime;
      if (this.fallingTimer <= 0) {
        this.falling = false;
        this.blooming = false;
        this.ripeTimer = 3;
        tmgr.fromTo(this, 3,
           { satOffset: -1, ease: tweeny.fn.easeInExpo },
           { satOffset:  0 });
        tmgr.fromTo(
          this, 3,
          { hueOffset: 0 },
          { hueOffset: 10 });
        for (var ii = 0; ii < this.fallingPetals.length; ++ii) {
          var falling = this.fallingPetals[ii];
          falling.visible = false;
        }
      }
    }

    if (this.bloomTimer > 0) {
      this.bloomTimer -= globals.elapsedTime;
      if (this.bloomTimer <= 0) {
        // remove the petals
        this.center.visible = false;
        this.falling = true;
        this.fallingTimer = globals.fallDuration;
        tmgr.fromTo(this, globals.fallDuration,
           { satOffset: 0, ease: tweeny.fn.easeInExpo },
           { satOffset: -1 });
        for (var ii = 0; ii < this.petals.length; ++ii) {
          var petal = this.petals[ii];
          var falling = this.fallingPetals[ii];
          falling.visible = true;
          falling.matrix.identity();
          falling.applyMatrix(petal.matrixWorld);
          tmgr.to(falling.position, rand.range(globals.fallDuration - 1,  globals.fallDuration + 1),
             { x: falling.position.x + rand.plusMinus(10),
               y: globals.areaBottom - 6,
               ease: tweeny.fn.easeInCubic,
             });
          tmgr.fromTo(falling.children[0].rotation, globals.fallDuration,
              { z: 0, y: 0, ease: tweeny.fn.easeInCubic },
              { z: 10, y: rand.range(20, 25) });
        }
      }
    }

    if (this.flashing && !this.blooming && !this.falling && this.ripeTimer <= 0) {
      v.applyProjection(this.services.camera.projectionMatrix);
      var distSq = globals.goalHitSize * globals.goalHitSize;
      var players = this.services.playerManager.players;
      for (var ii = 0, len = players.length; ii < len; ++ii) {
        var player = players[ii];
        var dx = v.x - player.collision.x;
        var dy = v.y - player.collision.y;
        if (dx * dx + dy * dy < distSq) {
          if (globals.showCollision) {
            this.material.color.setHSL(this.hue + 0.5, 1, 0.5);
          }
          if (!this.blooming) {
            this.blooming = true;
            this.bloomTimer = globals.bloomDuration;
            this.center.visible = true;
            tmgr.fromTo(
              this.center.scale, 3,
              { x: 0, y: 0, z: 0 },
              { x: 1, y: 1, z: 1 });
            tmgr.fromTo(
              this, 5,
              { rotateRate: 0, ease: tweeny.fn.boomerangSmooth, },
              { rotateRate: 20 });
            tmgr.fromTo(
              this, 5,
              { hueOffset: 0 },
              { hueOffset: 5 });
          }
          break;
        }
      }
    }
  };

  return Goal;
});


