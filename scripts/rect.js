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
  ], function() {

  /**
   * A Rect class
   * @constructor
   * @param {number} x the left of the rect
   * @param {number} y the top of the rect
   * @param {number} w the width of the rect
   * @param {number} h the height of the rect
   */

  function Rect(x, y, w, h) {
    if (w < 0) {
      x = x + w;
      w = -w;
    }
    if (h < 0) {
      y = y + h;
      h = -h;
    }
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
  }

  /**
   * Updates this rect to be the union of itself and other.
   * @param {Rect} other the other rect
   */
  Rect.prototype.union = function(other) {
    var xMax = Math.max(this.x + this.w, other.x + other.w);
    var yMax = Math.max(this.y + this.h, other.y + other.h);
    this.x = Math.min(this.x, other.x);
    this.y = Math.min(this.y, other.y);
    this.w = xMax - this.x;
    this.h = yMax - this.y;
  };

  /**
   * Creates a copy
   */
  Rect.prototype.clone = function() {
    return new Rect(this.x, this.y, this.w, this.h);
  };

  /**
   * Check if point is in rect
   */
  Rect.prototype.isPointIn = function(x, y) {
    return x >= this.x && x < this.x + this.w &&
           y >= this.y && y < this.y + this.h;
  };

  return Rect;
});

