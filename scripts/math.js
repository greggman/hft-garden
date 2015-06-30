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
   * Compute a euclidian modulo
   *
   * Example:
   *
   *      emod( 5.23, 2) =  1.23
   *      emod(-5.23, 2) =  0.77  because -5.23 is 0.77 greater than -6
   *
   * @param {number} x dividend
   * @param {number} n divisor
   * @return euclidian module of x mod n.
   */
  function emod(x, n) {
    return x >= 0 ? (x % n) : ((n - (-x % n)) % n);
  }

  /**
   * Does an integer divide to the left of the number line.
   *
   * Example:
   *
   *     unitdiv( 10, 2) =  5
   *     unitdiv(-10, 2) = -5
   *     unitdiv( 5,  2) =  2
   *     unitdiv(-5,  2) = -3   // because -5 / 2 = -2.5 but we're going left on the number line
   *
   * @param {number} x numerator
   * @param {number} n denominator
   * @return {number} result
   */
  function unitdiv(x, n) {
    return x >= 0 ? (x / n | 0) : ((x / n | 0) - 1) ;
  }

  /**
   * return intesection of 2 line segments
   * @param {number} p0X first point's x for first line
   * @param {number} p0Y first point's y for first line
   * @param {number} p1X second point's x for first line
   * @param {number} p1Y second point's y for first line
   * @param {number} p2X first point's x for second line
   * @param {number} p2Y first point's y for second line
   * @param {number} p3X second point's x for second line
   * @param {number} p3Y second point's y for second line
   * @param {Point2} intersection object to contain intersection. If not passed one is created
   * @return {Point2} the intersection or undefined if no intersection
   */
  function lineIntersection(p0X, p0Y, p1X, p1Y, p2X, p2Y, p3X, p3Y, intersection) {
    var s1X = p1X - p0X;
    var s1Y = p1Y - p0Y;
    var s2X = p3X - p2X;
    var s2Y = p3Y - p2Y;

    var s = (-s1Y * (p0X - p2X) + s1X * (p0Y - p2Y)) / (-s2X * s1Y + s1X * s2Y);
    var t = ( s2X * (p0Y - p2Y) - s2Y * (p0X - p2X)) / (-s2X * s1Y + s1X * s2Y);

    if (s >= 0 && s <= 1 && t >= 0 && t <= 1) {
      // Collision detected
      intersection = intersection || {};
      intersection.x = p0X + (t * s1X);
      intersection.y = p0Y + (t * s1Y);
      return intersection;
    }
  }

  /**
   * normalize a 2d vector
   * @param {number} x x for vector
   * @param {number} y y for vector
   * @param {Vector2} [dest] dest for vector. If not passed in a new one is created
   * @return {Vector2} normalized vector
   */
  function normalize(x, y, dest) {
    dest = dest || {};
    var len = Math.sqrt(x * x + y * y);
    dest.x = x / len;
    dest.y = y / len;
    return dest;
  }

  /**
   * 2D dot product
   * @param {number} v0X x for vector 0
   * @param {number} v0Y y for vector 0
   * @param {number} v1X x for vector 1
   * @param {number} v1Y y for vector 1
   * @return {number} dot product of v0 . v1
   */
  function dot(v0X, v0Y, v1x, v1y) {
    return v0X * v1x + v0Y * v1y;
  }

  /**
   * clamps between min and max
   *
   * @param {number} value input value.
   * @param {number} min min output value
   * @param {number} max max output value
   * @return {number} value clamped to min and max
   */
  function clamp(min, max, value) {
    if (min > max) {
      var t = min;
      min = max;
      max = t;
    }
    return Math.min(max, Math.max(min, value));
  }

  /**
   * lerps between min and max
   *
   * Example:
   *
   *    // lerp from 12 to 34 as v goes from 0 to 1
   *    clampLerp(12, 34, v);
   *
   * @param {number} min min output value
   * @param {number} max max output value
   * @param {number} value input value.
   * @return {number} value between min and max
   */
  function clampedLerp(min, max, lerp0to1) {
    return min + (max - min) * clamp(0, 1, lerp0to1);
  }

  /**
   * lerps between min and max within range
   *
   * Example:
   *
   *    // lerp from 12 to 34 as v goes from 0 to 56
   *    clampLerpRange(12, 34, 56, v);
   *
   * @param {number} min min output value
   * @param {number} max max output value
   * @param {number} range range of input value.
   * @param {number} value input value.
   * @return {number} value between min and max
   */
  function clampedLerpRange(min, max, range, value) {
    return clampedLerp(min, max, value / range);
  }

  /**
   * Converts degrees to radians.
   * @param {number} degrees A value in degrees.
   * @return {number} the value in radians.
   */
  function degToRad(degrees) {
    return degrees * Math.PI / 180;
  }

  /**
   * Converts radians to degrees.
   * @param {number} radians A value in radians.
   * @return {number} the value in degrees.
   */
  function radToDeg(radians) {
    return radians * 180 / Math.PI;
  }

  /**
   * Performs linear interpolation on two scalars.
   * Given scalars a and b and interpolation coefficient t, returns
   * (1 - t) * a + t * b.
   * @param {number} a Operand scalar.
   * @param {number} b Operand scalar.
   * @param {number} t Interpolation coefficient.
   * @return {number} The weighted sum of a and b.
   */
  function lerpScalar(a, b, t) {
    return (1 - t) * a + t * b;
  }

  /**
   * Clamps a value between 0 and range using a modulo.
   * @param {number} v Value to clamp mod.
   * @param {number} range Range to clamp to.
   * @param {number} opt_rangeStart start of range. Default = 0.
   * @return {number} Clamp modded value.
   */
  function modClamp(v, range, opt_rangeStart) {
    var start = opt_rangeStart || 0;
    if (range < 0.00001) {
      return start;
    }
    v -= start;
    if (v < 0) {
      v -= Math.floor(v / range) * range;
    } else {
      v = v % range;
    }
    return v + start;
  }

  /**
   * Lerps in a circle.
   * Does a lerp between a and b but inside range so for example if
   * range is 100, a is 95 and b is 5 lerping will go in the positive direction.
   * @param {number} a Start value.
   * @param {number} b Target value.
   * @param {number} t Amount to lerp (0 to 1).
   * @param {number} range Range of circle.
   * @return {number} lerped result.
   */
  function lerpCircular(a, b, t, range) {
    a = emod(a, range);
    b = emod(b, range);
    var delta = b - a;
    if (Math.abs(delta) > range * 0.5) {
      if (delta > 0) {
        b -= range;
      } else {
        b += range;
      }
    }
    return emod(lerpScalar(a, b, t), range);
  }

  /**
   * Lerps radians.
   * @param {number} a Start value.
   * @param {number} b Target value.
   * @param {number} t Amount to lerp (0 to 1).
   * @return {number} lerped result.
   */
  function lerpRadian(a, b, t) {
    return lerpCircular(a, b, t, Math.PI * 2);
  }

  /**
   * Lerps radians.
   * @param {number} a Start value.
   * @param {number} b Target value.
   * @param {number} t Amount to lerp (0 to 1).
   * @return {number} lerped result.
   */
  function lerpDegrees(a, b, t) {
    return lerpCircular(a, b, t, 360);
  }

  return {
    clamp: clamp,
    clampedLerp: clampedLerp,
    clampedLerpRange: clampedLerpRange,
    degToRad: degToRad,
    dot: dot,
    emod: emod,
    lerp: lerpScalar,
    lerpCircular: lerpCircular,
    lerpDegrees: lerpDegrees,
    lerpRadian: lerpRadian,
    lerpScalar: lerpScalar,
    lineIntersection: lineIntersection,
    normalize: normalize,
    radToDeg: radToDeg,
    unitdiv: unitdiv,
  };
});

