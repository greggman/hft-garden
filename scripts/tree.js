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
    './goal',
    './rand',
  ], function(
    Goal,
    rand
  ) {

  var Tree = function(services, options) {
    this.services = services;
    var globals = services.globals;
    //var geo = new THREE.BufferGeometry();
    //var vertices = new Float32Array( numVerts * 3 );
    //var normals = new Float32Array( numVerts * 3 );
    //var uvs = new Float32Array( numVerts * 2 );
    //var indices = new Uint16Array( numTriangles * 3 );

    var numBranches = options.numBranches || 2;
    var baseColor = 0x80FF00;

    if (options.numLeaves) {
      var leafTexture = rand.element(services.leafTextures);
      baseColor = leafTexture.baseColor;
      this.leafMaterial = new THREE.MeshPhongMaterial({
        ambient: 0x808080,
        map: leafTexture.texture,
        specular: 0xFFFFFF,
        shininess: 30,
        shading: THREE.FlatShading,
        side: THREE.DoubleSide,
        transparent: true,
        alphaTest: 0.5,
      });
    }

    this.material = new THREE.MeshPhongMaterial({
      ambient: 0x808080,
      color: baseColor,
      specular: 0xFFFFFF,
      shininess: 30,
      shading: THREE.FlatShading,
//      shading: THREE.SmoothShading,
      //wireframe: true,
    });


    var depth = options.depth || 4;
    var self = this;

    function makeBranch(depth, scale, leafScale, length) {
      var root = new THREE.Object3D();
      var mesh = new THREE.Mesh(services.geometry.treeMesh, self.material);
      root.add(mesh);
      mesh.scale.x = scale;
      mesh.scale.z = scale;
      mesh.scale.y = length;
      if (options.numLeaves) {
        var angle = rand.range(Math.PI * 2);
        var halfU = 0.5 / options.numLeaves;
        for (var ii = 0; ii < options.numLeaves; ++ii) {
          var u = ii / options.numLeaves;
          var leaf = new THREE.Mesh(services.geometry.leafMesh, self.leafMaterial);
          root.add(leaf);
          leaf.scale.x = leafScale * globals.leafScale * length * 0.2;
          leaf.scale.y = leafScale * globals.leafScale * length * 0.2;
          leaf.scale.z = leafScale * globals.leafScale * length * 0.2;
          leaf.position.x = scale * 0.6;
          leaf.position.y = rand.range(length / 4 * 1, length / 4 * 3);
          leaf.rotation.z = rand.plusMinus(Math.PI * 0.125);
          leaf.rotation.y = angle + (u + rand.range(halfU)) * Math.PI * 2;
        }
      }
      if (depth) {
        for (var ii = 0; ii < numBranches; ++ii) {
          var u = numBranches > 1 ? (ii / (numBranches - 1)) * 2 - 1 : rand.range(0.5, -0.5);
          var blen = length * rand.range(0.6, 0.9);
          var branch = makeBranch(depth - 1, scale * globals.treeBranchRadius, leafScale * globals.leafScaleShrink, blen);
          branch.position.y = length * 0.98;
          branch.rotation.z = Math.PI * rand.range(globals.treeMinBend, globals.treeMaxBend) * u;
          branch.rotation.x = rand.range(globals.treeMinTwist, globals.treeMaxTwist);
          branch.rotation.y = rand.range(globals.treeMinTwist, globals.treeMaxTwist);
          root.add(branch);
        }
      } else {
        var goal = new Goal(services);
        root.add(goal.root);
        goal.root.position.y = length;
      }
      return root;
    }

    this.root = makeBranch(depth, 1, 1, options.rootLength);
    this.root.rotation.z = rand.plusMinus(0.2);

    this.process = function() {

    };
  };

  return Tree;
});

