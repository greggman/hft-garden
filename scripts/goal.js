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
  ], function(rand) {

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
    this.services.scene.add(this.root);
    this.timer = rand.range(1000);
    this.animSpeed = rand.range(0.9, 1.1);
    this.vector = new THREE.Vector3();
    this.flashing = false;

//    this.pickNewPosition();
  }

  Goal.prototype.pickNewPosition = function() {
//    var globals = this.services.globals;
//    this.root.position.x = rand.range(globals.areaLeft, globals.areaRight);
//    this.root.position.y = rand.range(globals.areaBottom, globals.areaTop);
//    this.root.position.z = rand.range(globals.areaFront, globals.areaBack);

  };

  Goal.prototype.hit = function(position, radius) {
    var radiusSq = radius * radius;
    var dx = position.x - this.root.position.x;
    var dy = position.y - this.root.position.y;
    var dz = position.z - this.root.position.z;
    var distSq = dx * dx + dy * dy + dz * dz;
    return distSq < radiusSq;
  };

  Goal.prototype.remove = function() {
  };

  Goal.prototype.destroy = function() {
    this.services.entitySystem.removeEntity(this);
    this.services.scene.remove(this.root);
  };

  Goal.prototype.process = function() {
    var globals = this.services.globals;
    //this.material.needsUpdate = true;
//    this.root.rotation.x += globals.elapsedTime * 2.1;
    this.root.rotation.y += globals.elapsedTime * 0.5;
    this.root.rotation.x = Math.sin(globals.gameTime * this.animSpeed + this.timer) * 0.5;

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

    if (this.flashing) {
      v.applyProjection(this.services.camera.projectionMatrix);
      var distSq = globals.goalHitSize * globals.goalHitSize;
      var players = this.services.playerManager.players;
      for (var ii = 0, len = players.length; ii < len; ++ii) {
        var player = players[ii];
        var dx = v.x - player.collision.x;
        var dy = v.y - player.collision.y;
        if (dx * dx + dy * dy < distSq) {
          this.material.color.setHSL(this.hue + 0.5, 1, 0.5);
          break;
        }
      }
    }
  };

  return Goal;
});


