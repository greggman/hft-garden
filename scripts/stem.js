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
  ], function(
    rand
  ) {

  var Stem = function(services, options) {
    this.services = services;
    var globals = services.globals;
    //var geo = new THREE.BufferGeometry();
    //var vertices = new Float32Array( numVerts * 3 );
    //var normals = new Float32Array( numVerts * 3 );
    //var uvs = new Float32Array( numVerts * 2 );
    //var indices = new Uint16Array( numTriangles * 3 );

    this.material = new THREE.MeshPhongMaterial({
      ambient: 0x808080,
      color: 0x80FF00,
      specular: 0xFFFFFF,
      shininess: 30,
      shading: THREE.FlatShading,
    });

    var depth = 4;
    var self = this;

    function makeBranch(depth, length) {
      var root = new THREE.Object3D();
      var mesh = new THREE.Mesh(services.geometry.treeMesh, self.material);
      root.add(mesh);
      mesh.scale.x = globals.treeBranchRadius;
      mesh.scale.z = globals.treeBranchRadius;
      mesh.scale.y = length;
      if (depth) {
        for (var ii = 0; ii < 2; ++ii) {
          var u = ii * 2 - 1;
          var blen = rand.range(globals.treeMinLength, globals.treeMaxLength);
          var branch = makeBranch(depth - 1, blen);
          branch.position.y = length;
          branch.rotation.z = Math.PI * rand.range(globals.treeMinBend, globals.treeMaxBend) * u;
          branch.rotation.x = rand.range(globals.treeMinTwist, globals.treeMaxTwist);
          branch.rotation.y = rand.range(globals.treeMinTwist, globals.treeMaxTwist);
          root.add(branch);
        }
      }
      return root;
    }

    this.root = makeBranch(depth, options.rootLength);
    services.scene.add(this.root);

    this.process = function() {

    };
  };

  return Stem;
});

